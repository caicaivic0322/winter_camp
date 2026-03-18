import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import compression from 'compression'
import { fileURLToPath } from 'url'
import { parseQuestions } from './lib/mdParser.js'
import { getExamMarkdownTemplate } from './lib/examTemplate.js'
import { createDataStore } from './lib/dataStore.js'
import {
  COURSE_LEVELS,
  DEFAULT_EXAM_LEVEL,
  DEFAULT_USER_LEVEL,
  canAccessExamLevel,
  normalizeCourseLevel,
} from '../shared/courseAccess.js'

const app = express()
app.use(compression())
app.use(cors({
  origin: '*',
  credentials: true
}))
app.use(express.json())

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const defaultDataDir = path.join(__dirname, 'data')
const dataDir = path.resolve(process.env.DATA_DIR || defaultDataDir)

// 配置 multer 上传
const upload = multer({ dest: path.join(__dirname, 'uploads') })
const sessions = new Map()
const revokedTokens = new Set()
const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || 'cpp-camp-local-secret'
const dataStore = createDataStore({
  env: process.env,
  fallbackDataDir: dataDir,
  normalizeCourseLevel,
  normalizeCompetitionProgress,
  defaultUserLevel: DEFAULT_USER_LEVEL,
  defaultExamLevel: DEFAULT_EXAM_LEVEL,
})

function hasSubmittedExam(attempts, username, examId) {
  return attempts.some(item => item.username === username && item.examId === examId)
}

const API_CACHE_MS = Math.max(0, Number(process.env.API_CACHE_MS || 5000) || 5000)
const endpointCache = new Map()

function cacheClone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

function getCachedEndpoint(key) {
  const hit = endpointCache.get(key)
  if (!hit) return null
  if ((Date.now() - hit.at) > API_CACHE_MS) {
    endpointCache.delete(key)
    return null
  }
  return cacheClone(hit.payload)
}

function setCachedEndpoint(key, payload) {
  endpointCache.set(key, {
    at: Date.now(),
    payload: cacheClone(payload),
  })
}

function clearCachedEndpoint(prefix) {
  for (const key of endpointCache.keys()) {
    if (key.startsWith(prefix)) endpointCache.delete(key)
  }
}

function clearExamCaches() {
  clearCachedEndpoint('admin:exams')
  clearCachedEndpoint('exams:available:')
}

function clearUserCaches(username) {
  endpointCache.delete(`exams:available:${username}`)
  endpointCache.delete(`wrong-book:${username}`)
}

const LEVELS = COURSE_LEVELS
const ROLES = ['user', 'admin']
const DEFAULT_TOTAL_SCORE = 100

function toPositiveInt(value, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.floor(n)
}

function normalizeExamWindow(payload = {}) {
  const startTime = payload.startTime || payload.activeStartTime || payload.activateFrom
  const endTime = payload.endTime || payload.activeEndTime || payload.activateTo
  return { startTime, endTime }
}

function parseIsoTime(value) {
  if (!value) return null
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : null
}

function toIsoTime(value, fallback = new Date().toISOString()) {
  const ms = parseIsoTime(value)
  return ms === null ? fallback : new Date(ms).toISOString()
}

function diffSeconds(startTime, endTime) {
  const startMs = parseIsoTime(startTime)
  const endMs = parseIsoTime(endTime)
  if (startMs === null || endMs === null) return null
  return Math.max(0, Math.round((endMs - startMs) / 1000))
}

function averageOf(values = []) {
  if (!Array.isArray(values) || values.length === 0) return 0
  return Math.round(values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length)
}

function toDateBoundary(value, mode = 'start') {
  if (!value) return null
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? `${value}${mode === 'end' ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`
    : value
  const ms = parseIsoTime(normalized)
  return ms === null ? null : ms
}

function matchesDateRange(value, from, to) {
  const ms = parseIsoTime(value)
  if (ms === null) return false
  const fromMs = toDateBoundary(from, 'start')
  const toMs = toDateBoundary(to, 'end')
  if (fromMs !== null && ms < fromMs) return false
  if (toMs !== null && ms > toMs) return false
  return true
}

function toPublicUser(user) {
  return {
    username: user.username,
    nickname: user.nickname,
    role: user.role || 'user',
    level: normalizeCourseLevel(user.level, DEFAULT_USER_LEVEL),
    createdAt: user.createdAt,
  }
}

function sanitizeQuestionText(value) {
  return String(value || '')
    .replace(/\*\*/g, '')
    .replace(/\s*[（(]\s*[　 ]*[√×][　 ]*[）)]\s*$/g, '')
    .trim()
}

function normalizeOptionText(value) {
  return String(value || '')
    .replace(/`/g, '')
    .replace(/^['"“”‘’]+|['"“”‘’]+$/g, '')
    .trim()
}

function hasSubmittedAnswer(value) {
  return typeof value === 'string' ? value.trim().length > 0 : value !== undefined && value !== null
}

function buildFallbackAnalysis(item) {
  const userAnswer = item.yourAnswer || '未作答'
  const correctAnswer = item.correctAnswer || '未设置'
  const optionHint = Array.isArray(item.options)
    ? item.options.find(opt => opt?.label === correctAnswer)?.text
    : ''
  const suffix = optionHint ? `正确项内容是“${normalizeOptionText(optionHint)}”。` : ''

  return `这道题的正确答案是 ${correctAnswer}，你本次作答为 ${userAnswer}。建议先回到题干里定位考点，再重点对比正确选项和你所选项的关键词差异。${suffix}`.trim()
}

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '')
}

function getAiAnalysisConfigs() {
  const configs = []
  const deepSeekKey = String(process.env.DEEPSEEK_API_KEY || '').trim()
  const deepSeekBase = trimTrailingSlash(process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com')

  if (deepSeekKey) {
    configs.push({
      provider: 'deepseek',
      apiKey: deepSeekKey,
      endpoint: `${deepSeekBase}/chat/completions`,
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    })
  }

  const openAiKey = String(process.env.OPENAI_API_KEY || '').trim()
  const openAiBase = trimTrailingSlash(process.env.OPENAI_API_BASE)
  if (openAiKey && openAiBase) {
    configs.push({
      provider: 'openai-compatible',
      apiKey: openAiKey,
      endpoint: `${openAiBase}/chat/completions`,
      model: process.env.OPENAI_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    })
  }

  return configs
}

async function requestAiAnalysesWithConfig(items, config) {
  const promptItems = items.map(item => ({
    questionId: item.questionId,
    title: sanitizeQuestionText(item.title),
    type: item.type,
    options: (item.options || []).map(opt => ({
      label: opt.label,
      text: normalizeOptionText(opt.text),
    })),
    yourAnswer: item.yourAnswer || '未作答',
    correctAnswer: item.correctAnswer || '未设置',
  }))

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.3,
      response_format: {
        type: 'json_object',
      },
      messages: [
        {
          role: 'system',
          content: '你是一名少儿编程考试助教。请仅返回 JSON，不要输出额外说明。每道题给出一句到两句中文解析，语气清晰、友好、简短。',
        },
        {
          role: 'user',
          content: JSON.stringify({
            task: '请根据错题信息，生成错题解析。',
            outputSchema: {
              analyses: [
                {
                  questionId: 'string',
                  analysis: 'string',
                },
              ],
            },
            items: promptItems,
          }),
        },
      ],
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`${config.provider} request failed: ${response.status} ${message}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) return null

  const parsed = JSON.parse(content)
  const analyses = Array.isArray(parsed?.analyses) ? parsed.analyses : []
  return analyses
}

async function requestDeepSeekAnalyses(items) {
  const configs = getAiAnalysisConfigs()
  if (configs.length === 0 || !Array.isArray(items) || items.length === 0) return null

  let lastError = null

  for (const config of configs) {
    try {
      const analyses = await requestAiAnalysesWithConfig(items, config)
      if (Array.isArray(analyses) && analyses.length > 0) return analyses
    } catch (error) {
      lastError = error
      console.warn(`[wrong-question-analysis] ${config.provider} request failed, trying next provider if available`)
      console.warn(error instanceof Error ? error.message : String(error))
    }
  }

  if (lastError) throw lastError
  return null
}

async function buildWrongQuestionAnalyses(items) {
  if (!Array.isArray(items) || items.length === 0) return []

  try {
    const remoteAnalyses = await requestDeepSeekAnalyses(items)
    if (Array.isArray(remoteAnalyses) && remoteAnalyses.length > 0) {
      const analysisMap = new Map(
        remoteAnalyses
          .filter(item => item?.questionId && item?.analysis)
          .map(item => [item.questionId, String(item.analysis).trim()])
      )

      return items.map(item => ({
        ...item,
        analysis: analysisMap.get(item.questionId) || buildFallbackAnalysis(item),
      }))
    }
  } catch (error) {
    console.warn('[wrong-question-analysis] remote analysis failed, using fallback analysis')
    console.warn(error instanceof Error ? error.message : String(error))
  }

  return items.map(item => ({
    ...item,
    analysis: buildFallbackAnalysis(item),
  }))
}

function createSession(user) {
  const payload = {
    username: user.username,
    role: user.role || 'user',
    issuedAt: Date.now(),
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(encoded)
    .digest('base64url')
  const token = `${encoded}.${signature}`
  sessions.set(token, payload)
  return token
}

function verifySessionToken(token) {
  if (!token || revokedTokens.has(token)) return null
  const [encoded, signature] = token.split('.')
  if (!encoded || !signature) return null

  const expected = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(encoded)
    .digest('base64url')

  if (signature !== expected) return null

  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'))
  } catch {
    return null
  }
}

function getTokenFromRequest(req) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) return ''
  return header.slice(7).trim()
}

async function attachAuthUser(req, res, next) {
  const token = getTokenFromRequest(req)
  if (!token) {
    req.authUser = null
    return next()
  }

  const session = sessions.get(token) || verifySessionToken(token)
  if (!session) {
    req.authUser = null
    return next()
  }

  sessions.set(token, session)

  const users = await readUsers()
  const user = users[session.username]
  if (!user) {
    sessions.delete(token)
    req.authUser = null
    return next()
  }

  req.authUser = toPublicUser(user)
  req.authToken = token
  next()
}

function requireAuth(req, res, next) {
  if (!req.authUser) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  next()
}

function requireAdmin(req, res, next) {
  if (!req.authUser) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  if (req.authUser.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden' })
  }

  next()
}

app.use((req, res, next) => {
  attachAuthUser(req, res, next).catch(next)
})

function validatePassword(password) {
  if (!password || password.length < 6) {
    return '密码至少需要 6 个字符'
  }

  return ''
}

function parseCsvLine(line = '') {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
      continue
    }

    current += char
  }

  values.push(current)
  return values.map(value => value.trim())
}

function parseUsersCsv(content = '') {
  const lines = String(content)
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = parseCsvLine(lines[0])
  const rows = lines.slice(1).map(line => {
    const values = parseCsvLine(line)
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] || ''
      return acc
    }, {})
  })

  return { headers, rows }
}

function escapeCsvValue(value) {
  const text = String(value ?? '')
  if (!/[",\n]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

function toUserCsv(users = []) {
  const headers = ['username', 'password', 'nickname', 'role', 'level', 'createdAt']
  const lines = [
    headers.join(','),
    ...users.map(user => headers.map(header => escapeCsvValue(user[header] || '')).join(',')),
  ]
  return lines.join('\n')
}

function toUserTemplateCsv() {
  return [
    'username,password,nickname,role,level',
    'student01,123456,示例学员,user,试用',
  ].join('\n')
}

async function buildAdminBackupPayload() {
  const [users, questions, exams, attempts, wrongBook] = await Promise.all([
    readUsers(),
    readQuestions(),
    readExams(),
    readAttempts(),
    readWrongBook(),
  ])

  return {
    exportedAt: new Date().toISOString(),
    storage: dataStore.config.mode,
    users,
    questions,
    exams,
    attempts,
    wrongBook,
  }
}

function validateBackupPayload(payload = {}) {
  if (!payload || typeof payload !== 'object') {
    return { error: 'invalid backup payload' }
  }

  const users = payload.users
  const questions = payload.questions
  const exams = payload.exams
  const attempts = payload.attempts
  const wrongBook = payload.wrongBook

  if (!users || typeof users !== 'object' || Array.isArray(users)) {
    return { error: 'backup.users must be an object' }
  }
  if (!Array.isArray(questions)) {
    return { error: 'backup.questions must be an array' }
  }
  if (!Array.isArray(exams)) {
    return { error: 'backup.exams must be an array' }
  }
  if (!Array.isArray(attempts)) {
    return { error: 'backup.attempts must be an array' }
  }
  if (!Array.isArray(wrongBook)) {
    return { error: 'backup.wrongBook must be an array' }
  }

  const normalizedUsers = {}
  Object.entries(users).forEach(([username, user]) => {
    if (!user || typeof user !== 'object') return
    normalizedUsers[username] = {
      ...user,
      username,
      level: normalizeCourseLevel(user.level, DEFAULT_USER_LEVEL),
      competitionProgress: normalizeCompetitionProgress(user.competitionProgress),
    }
  })

  return {
    data: {
      users: normalizedUsers,
      questions,
      exams: exams.map(item => ({
        ...item,
        levelRequired: normalizeCourseLevel(item.levelRequired, DEFAULT_EXAM_LEVEL),
      })),
      attempts,
      wrongBook,
    },
  }
}

function buildExamPreview(payload = {}, metadata = {}, questions = []) {
  const title = payload.title || metadata.title || '未命名考试'
  const sectionCounts = {
    single: questions.filter(item => item.section === 'single').length,
    judge: questions.filter(item => item.section === 'judge').length,
    code_completion: questions.filter(item => item.section === 'code_completion').length,
  }

  return {
    title,
    language: metadata.language || 'C++',
    questionCount: questions.length,
    sectionCounts,
    previewQuestions: questions.slice(0, 8).map(item => ({
      id: item.id,
      title: item.title,
      section: item.section,
      type: item.type,
      optionCount: Array.isArray(item.options) ? item.options.length : 0,
      answer: item.answer,
    })),
  }
}

function buildUser(payload = {}) {
  const { username, password, nickname, role, level } = payload

  if (!username || username.length < 3) {
    return { error: '用户名至少需要 3 个字符' }
  }

  const passwordError = validatePassword(password)
  if (passwordError) return { error: passwordError }

  return {
    user: {
      username,
      password,
      nickname: nickname || username,
      role: ROLES.includes(role) ? role : 'user',
      level: normalizeCourseLevel(level, DEFAULT_USER_LEVEL),
      competitionProgress: normalizeCompetitionProgress(),
      createdAt: new Date().toISOString(),
    }
  }
}

function normalizeCompetitionProgress(payload = {}) {
  const normalizeList = (value) => {
    if (!Array.isArray(value)) return []
    const seen = new Set()
    const result = []

    value.forEach((item) => {
      const id = Number(item)
      if (!Number.isInteger(id) || id <= 0 || seen.has(id)) return
      seen.add(id)
      result.push(id)
    })

    return result
  }

  return {
    completedProblemIds: normalizeList(payload.completedProblemIds),
    wrongProblemIds: normalizeList(payload.wrongProblemIds),
    favoriteProblemIds: normalizeList(payload.favoriteProblemIds),
  }
}

const readUsers = () => dataStore.readUsers()
const writeUsers = (data) => dataStore.writeUsers(data)
const readQuestions = () => dataStore.readQuestions()
const writeQuestions = (data) => dataStore.writeQuestions(data)
const readExams = () => dataStore.readExams()
const writeExams = (data) => dataStore.writeExams(data)
const readWrongBook = () => dataStore.readWrongBook()
const writeWrongBook = (data) => dataStore.writeWrongBook(data)
const readAttempts = () => dataStore.readAttempts()
const writeAttempts = (data) => dataStore.writeAttempts(data)

function buildExamQuestionNumberMap(exam, allQuestions) {
  const bankIdSet = new Set(exam.bankIds || [])
  const bankOrder = new Map((exam.bankIds || []).map((bankId, index) => [bankId, index]))
  const candidates = (allQuestions || [])
    .filter(question => bankIdSet.has(question.bankId))
    .sort((a, b) => {
      const bankDiff = (bankOrder.get(a.bankId) ?? 9999) - (bankOrder.get(b.bankId) ?? 9999)
      if (bankDiff !== 0) return bankDiff
      return (a.order || 0) - (b.order || 0)
    })

  const count = exam.questionCount || candidates.length
  const selected = count >= candidates.length ? candidates : candidates.slice(0, count)
  return new Map(selected.map((question, index) => [question.id, index + 1]))
}

async function buildAdminExamResults({ examId = '', student = '', from = '', to = '' } = {}) {
  const [users, exams, attempts, wrongBook, allQuestions] = await Promise.all([
    readUsers(),
    readExams(),
    readAttempts(),
    readWrongBook(),
    readQuestions(),
  ])

  const examMap = new Map(exams.map(exam => [exam.id, exam]))
  const wrongByAttemptKey = new Map()
  const questionNumberMaps = new Map()

  exams.forEach((exam) => {
    questionNumberMaps.set(exam.id, buildExamQuestionNumberMap(exam, allQuestions))
  })

  wrongBook.forEach((item) => {
    if (!item?.examId || !item?.username || !item?.questionId) return
    const key = `${item.examId}:${item.username}`
    const list = wrongByAttemptKey.get(key) || []
    list.push(item)
    wrongByAttemptKey.set(key, list)
  })

  const filteredAttempts = attempts
    .filter(attempt => {
      if (examId && attempt.examId !== examId) return false
      if (student && attempt.username !== student) return false
      const exam = examMap.get(attempt.examId)
      const timeValue = attempt.submittedAt || attempt.at || exam?.startTime
      return matchesDateRange(timeValue, from, to)
    })
    .sort((a, b) => new Date(a.submittedAt || a.at || 0) - new Date(b.submittedAt || b.at || 0))

  const examAttempts = filteredAttempts.map((attempt) => {
    const exam = examMap.get(attempt.examId) || {}
    const user = users[attempt.username] || {}
    const questionNumberMap = questionNumberMaps.get(attempt.examId) || new Map()
    const wrongItems = wrongByAttemptKey.get(`${attempt.examId}:${attempt.username}`) || []
    const wrongQuestionIds = Array.isArray(attempt.wrongQuestionIds) && attempt.wrongQuestionIds.length > 0
      ? Array.from(new Set(attempt.wrongQuestionIds))
      : Array.from(new Set(wrongItems.map(item => item.questionId)))
    const wrongQuestionNumbers = wrongQuestionIds
      .map(questionId => questionNumberMap.get(questionId))
      .filter(Number.isFinite)
      .sort((a, b) => a - b)
    const submittedAt = toIsoTime(attempt.submittedAt || attempt.at)
    const startedAt = attempt.startedAt ? toIsoTime(attempt.startedAt) : ''

    return {
      id: attempt.id,
      examId: attempt.examId,
      examTitle: exam.title || attempt.examId,
      examStartTime: exam.startTime || '',
      examEndTime: exam.endTime || '',
      username: attempt.username,
      nickname: user.nickname || attempt.username,
      level: user.level || DEFAULT_USER_LEVEL,
      score: Number(attempt.score || 0),
      totalScore: Number(attempt.totalScore || exam.totalScore || DEFAULT_TOTAL_SCORE),
      rawScore: Number(attempt.rawScore || 0),
      rawTotal: Number(attempt.rawTotal || 0),
      answeredCount: Number(attempt.answeredCount || 0),
      wrongCount: wrongQuestionIds.length,
      wrongQuestionIds,
      wrongQuestionNumbers,
      wrongQuestionLabels: wrongQuestionNumbers.map(number => `第${number}题`),
      startedAt,
      submittedAt,
      durationSeconds: Number.isFinite(Number(attempt.durationSeconds))
        ? Number(attempt.durationSeconds)
        : diffSeconds(startedAt, submittedAt) || 0,
    }
  })

  const examSummaryMap = new Map()
  const studentSummaryMap = new Map()

  examAttempts.forEach((attempt) => {
    const examBucket = examSummaryMap.get(attempt.examId) || {
      examId: attempt.examId,
      examTitle: attempt.examTitle,
      examStartTime: attempt.examStartTime,
      examEndTime: attempt.examEndTime,
      scores: [],
      durations: [],
      wrongCounts: [],
      highestScore: 0,
      lowestScore: null,
    }
    examBucket.scores.push(attempt.score)
    examBucket.durations.push(attempt.durationSeconds)
    examBucket.wrongCounts.push(attempt.wrongCount)
    examBucket.highestScore = Math.max(examBucket.highestScore, attempt.score)
    examBucket.lowestScore = examBucket.lowestScore === null ? attempt.score : Math.min(examBucket.lowestScore, attempt.score)
    examSummaryMap.set(attempt.examId, examBucket)

    const studentBucket = studentSummaryMap.get(attempt.username) || {
      username: attempt.username,
      nickname: attempt.nickname,
      level: attempt.level,
      scores: [],
      durations: [],
      wrongCounts: [],
      exams: [],
      bestScore: 0,
    }
    studentBucket.scores.push(attempt.score)
    studentBucket.durations.push(attempt.durationSeconds)
    studentBucket.wrongCounts.push(attempt.wrongCount)
    studentBucket.exams.push({
      examId: attempt.examId,
      examTitle: attempt.examTitle,
      score: attempt.score,
      totalScore: attempt.totalScore,
      submittedAt: attempt.submittedAt,
    })
    studentBucket.bestScore = Math.max(studentBucket.bestScore, attempt.score)
    studentSummaryMap.set(attempt.username, studentBucket)
  })

  const examSummaries = Array.from(examSummaryMap.values())
    .map(item => ({
      examId: item.examId,
      examTitle: item.examTitle,
      examStartTime: item.examStartTime,
      examEndTime: item.examEndTime,
      participantCount: item.scores.length,
      averageScore: averageOf(item.scores),
      averageDurationSeconds: averageOf(item.durations),
      averageWrongCount: averageOf(item.wrongCounts),
      highestScore: item.highestScore,
      lowestScore: item.lowestScore ?? 0,
    }))
    .sort((a, b) => new Date(b.examStartTime || 0) - new Date(a.examStartTime || 0))

  const studentSummaries = Array.from(studentSummaryMap.values())
    .map(item => ({
      username: item.username,
      nickname: item.nickname,
      level: item.level,
      examCount: item.scores.length,
      averageScore: averageOf(item.scores),
      averageDurationSeconds: averageOf(item.durations),
      averageWrongCount: averageOf(item.wrongCounts),
      bestScore: item.bestScore,
      lastSubmittedAt: item.exams
        .slice()
        .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0))[0]?.submittedAt || '',
    }))
    .sort((a, b) => b.averageScore - a.averageScore || a.username.localeCompare(b.username))

  const studentTrendLines = examAttempts.map(item => ({
    username: item.username,
    nickname: item.nickname,
    examId: item.examId,
    examTitle: item.examTitle,
    score: item.score,
    totalScore: item.totalScore,
    submittedAt: item.submittedAt,
  }))

  return {
    filters: { examId, student, from, to },
    examOptions: exams
      .slice()
      .sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0))
      .map(item => ({
        id: item.id,
        title: item.title,
        startTime: item.startTime,
        endTime: item.endTime,
      })),
    studentOptions: Object.values(users)
      .filter(user => user.role !== 'admin')
      .map(user => ({
        username: user.username,
        nickname: user.nickname || user.username,
        level: normalizeCourseLevel(user.level, DEFAULT_USER_LEVEL),
      }))
      .sort((a, b) => a.username.localeCompare(b.username)),
    examSummaries,
    examAttempts,
    studentSummaries,
    studentTrendLines,
  }
}

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    time: Date.now(),
    storage: dataStore.config.mode,
  })
})

app.get('/api/health/storage', asyncRoute(async (req, res) => {
  const probe = await dataStore.probe()
  res.json({
    ok: true,
    time: Date.now(),
    ...probe,
  })
}))

app.post('/api/users', asyncRoute(async (req, res) => {
  const users = await readUsers()
  const result = buildUser(req.body || {})
  if (result.error) return res.status(400).json({ error: result.error })
  const { user } = result
  if (users[user.username]) return res.status(409).json({ error: 'exists' })
  users[user.username] = user
  await writeUsers(users)
  const token = createSession(user)
  res.status(201).json({ user: toPublicUser(user), token })
}))

app.post('/api/admin/users', requireAdmin, asyncRoute(async (req, res) => {
  const users = await readUsers()
  const result = buildUser(req.body || {})
  if (result.error) return res.status(400).json({ error: result.error })
  const { user } = result
  if (users[user.username]) return res.status(409).json({ error: 'exists' })
  users[user.username] = user
  await writeUsers(users)
  res.status(201).json(toPublicUser(user))
}))

app.post('/api/admin/users/import', requireAdmin, upload.single('file'), asyncRoute(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'no file' })
  }

  try {
    const content = fs.readFileSync(req.file.path, 'utf-8')
    const { rows } = parseUsersCsv(content)
    const users = await readUsers()
    const createdUsers = []
    const skippedUsers = []
    const errors = []

    rows.forEach((row, index) => {
      const result = buildUser({
        username: row.username,
        password: row.password,
        nickname: row.nickname,
        role: row.role,
        level: row.level,
      })

      if (result.error) {
        errors.push(`第 ${index + 2} 行：${result.error}`)
        return
      }

      const { user } = result
      if (users[user.username]) {
        skippedUsers.push(user.username)
        return
      }

      users[user.username] = user
      createdUsers.push(user.username)
    })

    await writeUsers(users)
    res.json({
      ok: true,
      createdCount: createdUsers.length,
      skippedCount: skippedUsers.length,
      errorCount: errors.length,
      createdUsers,
      skippedUsers,
      errors,
    })
  } catch (e) {
    res.status(500).json({ error: 'import parse error: ' + e.message })
  } finally {
    try { fs.unlinkSync(req.file.path) } catch {}
  }
}))

app.get('/api/admin/users/export', requireAdmin, asyncRoute(async (req, res) => {
  const users = Object.values(await readUsers()).sort((a, b) => {
    if ((a.role || 'user') !== (b.role || 'user')) return (a.role || 'user') === 'admin' ? -1 : 1
    return String(a.username).localeCompare(String(b.username))
  })

  const csv = toUserCsv(users)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="users.csv"')
  res.send(csv)
}))

app.get('/api/admin/users/template', requireAdmin, (req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="users-template.csv"')
  res.send(toUserTemplateCsv())
})

app.get('/api/admin/backup', requireAdmin, asyncRoute(async (req, res) => {
  const payload = await buildAdminBackupPayload()
  const stamp = payload.exportedAt.replace(/[:.]/g, '-')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="backup-${stamp}.json"`)
  res.json(payload)
}))

app.post('/api/admin/backup/restore', requireAdmin, asyncRoute(async (req, res) => {
  const result = validateBackupPayload(req.body || {})
  if (result.error) {
    return res.status(400).json({ error: result.error })
  }

  await dataStore.replaceAll(result.data)

  res.json({
    ok: true,
    restoredAt: new Date().toISOString(),
    storage: dataStore.config.mode,
    summary: {
      userCount: Object.keys(result.data.users).length,
      questionCount: result.data.questions.length,
      examCount: result.data.exams.length,
      attemptCount: result.data.attempts.length,
      wrongBookCount: result.data.wrongBook.length,
    },
  })
}))

app.post('/api/login', asyncRoute(async (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ success: false, error: '用户名和密码不能为空' })
  }
  const users = await readUsers()
  const user = users[username]
  if (!user) {
    return res.status(401).json({ success: false, error: '用户不存在' })
  }
  if (user.password !== password) {
    return res.status(401).json({ success: false, error: '密码错误' })
  }
  const token = createSession(user)
  res.json({ 
    success: true, 
    token,
    user: toPublicUser(user)
  })
}))

app.post('/api/logout', requireAuth, (req, res) => {
  if (req.authToken) {
    sessions.delete(req.authToken)
    revokedTokens.add(req.authToken)
  }
  res.json({ success: true })
})

app.get('/api/users', requireAdmin, asyncRoute(async (req, res) => {
  const users = await readUsers()
  const list = Object.values(users).map(toPublicUser)
  res.json(list)
}))

app.get('/api/users/:username', requireAuth, asyncRoute(async (req, res) => {
  if (req.authUser.role !== 'admin' && req.authUser.username !== req.params.username) {
    return res.status(403).json({ error: 'forbidden' })
  }
  const users = await readUsers()
  const user = users[req.params.username]
  if (!user) {
    return res.status(404).json({ error: 'user not found' })
  }
  res.json(toPublicUser(user))
}))

app.get('/api/users/:username/competition-progress', requireAuth, asyncRoute(async (req, res) => {
  const { username } = req.params
  if (req.authUser.role !== 'admin' && req.authUser.username !== username) {
    return res.status(403).json({ error: 'forbidden' })
  }

  const users = await readUsers()
  const user = users[username]
  if (!user) {
    return res.status(404).json({ error: 'user not found' })
  }

  res.json({
    username,
    progress: normalizeCompetitionProgress(user.competitionProgress),
  })
}))

app.put('/api/users/:username/competition-progress', requireAuth, asyncRoute(async (req, res) => {
  const { username } = req.params
  if (req.authUser.role !== 'admin' && req.authUser.username !== username) {
    return res.status(403).json({ error: 'forbidden' })
  }

  const users = await readUsers()
  const user = users[username]
  if (!user) {
    return res.status(404).json({ error: 'user not found' })
  }

  const progress = normalizeCompetitionProgress(req.body || {})
  user.competitionProgress = progress
  users[username] = user
  await writeUsers(users)

  res.json({
    ok: true,
    username,
    progress,
  })
}))

app.patch('/api/users/:username/level', requireAdmin, asyncRoute(async (req, res) => {
  const { username } = req.params
  const { level } = req.body || {}
  if (!LEVELS.includes(level)) {
    return res.status(400).json({ error: 'invalid level' })
  }
  const users = await readUsers()
  const u = users[username]
  if (!u) {
    return res.status(404).json({ error: 'user not found' })
  }
  u.level = level
  users[username] = u
  await writeUsers(users)
  res.json({ ok: true, username, level })
}))

app.patch('/api/users/:username/role', requireAdmin, asyncRoute(async (req, res) => {
  const { username } = req.params
  const { role } = req.body || {}
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: 'invalid role' })
  }

  if (req.authUser.username === username && role !== 'admin') {
    return res.status(400).json({ error: 'current admin cannot demote self' })
  }

  const users = await readUsers()
  const target = users[username]
  if (!target) {
    return res.status(404).json({ error: 'user not found' })
  }

  target.role = role
  users[username] = target
  await writeUsers(users)
  res.json({ ok: true, username, role })
}))

app.patch('/api/users/:username/password', requireAdmin, asyncRoute(async (req, res) => {
  const { username } = req.params
  const { password } = req.body || {}
  const passwordError = validatePassword(password)
  if (passwordError) {
    return res.status(400).json({ error: passwordError })
  }

  const users = await readUsers()
  const target = users[username]
  if (!target) {
    return res.status(404).json({ error: 'user not found' })
  }

  target.password = password
  users[username] = target
  await writeUsers(users)
  res.json({ ok: true, username })
}))

app.delete('/api/users/:username', requireAdmin, asyncRoute(async (req, res) => {
  const { username } = req.params
  const users = await readUsers()
  const user = users[username]

  if (!user) {
    return res.status(404).json({ error: 'user not found' })
  }

  if (user.role === 'admin') {
    return res.status(400).json({ error: 'admin user cannot be deleted' })
  }

  delete users[username]
  await writeUsers(users)

  const attempts = (await readAttempts()).filter(item => item.username !== username)
  const wrongBook = (await readWrongBook()).filter(item => item.username !== username)
  await writeAttempts(attempts)
  await writeWrongBook(wrongBook)
  clearUserCaches(username)
  clearExamCaches()

  res.json({ ok: true, username })
}))

// 题库上传接口
app.post('/api/admin/banks/upload', requireAdmin, upload.single('file'), asyncRoute(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' })
  
  try {
    const content = fs.readFileSync(req.file.path, 'utf-8')
    const { metadata, questions } = parseQuestions(content)
    
    // 简单校验
    if (!questions.length) {
      return res.status(400).json({ error: '解析失败：未找到有效题目' })
    }
    
    // 存入题库
    const allQuestions = await readQuestions()
    const bankId = Date.now().toString()
    
    const newQuestions = questions.map((q, idx) => ({
      ...q,
      bankId,
      order: Number.isFinite(q.order) ? q.order : (idx + 1),
      language: metadata.language || 'C++',
      bankTitle: metadata.title || '未命名题库',
      createdAt: new Date().toISOString()
    }))
    
    allQuestions.push(...newQuestions)
    await writeQuestions(allQuestions)
    
    // 清理临时文件
    fs.unlinkSync(req.file.path)
    
    res.json({ 
      success: true, 
      count: questions.length, 
      bankId,
      metadata 
    })
  } catch (e) {
    res.status(500).json({ error: '解析异常: ' + e.message })
  }
}))

// 获取所有题目（管理员预览）
app.get('/api/admin/questions', requireAdmin, asyncRoute(async (req, res) => {
  const questions = await readQuestions()
  res.json(questions)
}))

// 发起考试
app.post('/api/admin/exams', requireAdmin, asyncRoute(async (req, res) => {
  const { title, duration, questionCount, bankIds, levelRequired, totalScore } = req.body || {}
  const { startTime, endTime } = normalizeExamWindow(req.body || {})
  
  if (!title || !startTime || !endTime) {
    return res.status(400).json({ error: 'missing fields' })
  }
  
  const exams = await readExams()
  const newExam = {
    id: Date.now().toString(),
    title,
    startTime,
    endTime,
    duration: toPositiveInt(duration, 60), // 秒
    questionCount: toPositiveInt(questionCount, 10),
    totalScore: toPositiveInt(totalScore, DEFAULT_TOTAL_SCORE),
    bankIds: bankIds || [], // 指定从哪些题库抽题
    levelRequired: normalizeCourseLevel(levelRequired, DEFAULT_EXAM_LEVEL),
    createdAt: new Date().toISOString(),
    status: 'scheduled',
    source: 'manual'
  }
  
  exams.push(newExam)
  await writeExams(exams)
  clearExamCaches()
  
  res.json({ success: true, exam: newExam })
}))

app.post('/api/admin/exams/preview', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' })

  try {
    const content = fs.readFileSync(req.file.path, 'utf-8')
    const { metadata, questions } = parseQuestions(content)
    if (!questions.length) {
      return res.status(400).json({ error: '解析失败：未找到有效题目' })
    }

    res.json(buildExamPreview(req.body || {}, metadata, questions))
  } catch (e) {
    res.status(500).json({ error: 'preview parse error: ' + e.message })
  } finally {
    try { fs.unlinkSync(req.file.path) } catch {}
  }
})

// 管理员上传考试文件并创建考试
app.post('/api/admin/exams/upload', requireAdmin, upload.single('file'), asyncRoute(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' })
  const payload = req.body || {}
  const title = payload.title || req.file.originalname?.replace(/\.md$/i, '') || '未命名考试'
  const duration = toPositiveInt(payload.duration, 180)
  const levelRequired = normalizeCourseLevel(payload.levelRequired, DEFAULT_EXAM_LEVEL)
  const totalScore = toPositiveInt(payload.totalScore, DEFAULT_TOTAL_SCORE)
  const { startTime, endTime } = normalizeExamWindow(payload)
  const requestedCount = toPositiveInt(payload.questionCount, 0)

  if (!startTime || !endTime) {
    try { fs.unlinkSync(req.file.path) } catch {}
    return res.status(400).json({ error: 'missing start/end time' })
  }

  try {
    const content = fs.readFileSync(req.file.path, 'utf-8')
    const { metadata, questions } = parseQuestions(content)
    if (!questions.length) {
      return res.status(400).json({ error: '解析失败：未找到有效题目' })
    }

    const allQuestions = await readQuestions()
    const exams = await readExams()
    const bankId = Date.now().toString()

    const newQuestions = questions.map((q, idx) => ({
      ...q,
      bankId,
      order: Number.isFinite(q.order) ? q.order : (idx + 1),
      language: metadata.language || 'C++',
      bankTitle: metadata.title || title,
      createdAt: new Date().toISOString()
    }))
    allQuestions.push(...newQuestions)
    await writeQuestions(allQuestions)

    const exam = {
      id: (Date.now() + 1).toString(),
      title,
      startTime,
      endTime,
      duration,
      questionCount: requestedCount > 0 ? Math.min(requestedCount, newQuestions.length) : newQuestions.length,
      totalScore,
      bankIds: [bankId],
      levelRequired,
      createdAt: new Date().toISOString(),
      status: 'scheduled',
      source: 'upload',
    }
    exams.push(exam)
    await writeExams(exams)
    clearExamCaches()

    res.status(201).json({
      success: true,
      bankId,
      parsedCount: newQuestions.length,
      exam,
      preview: buildExamPreview(payload, metadata, newQuestions),
    })
  } catch (e) {
    res.status(500).json({ error: 'upload parse error: ' + e.message })
  } finally {
    try { fs.unlinkSync(req.file.path) } catch {}
  }
}))

app.get('/api/admin/exams/template-md', requireAdmin, (req, res) => {
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="exam-template.md"')
  res.send(getExamMarkdownTemplate())
})

app.get('/api/admin/exams', requireAdmin, asyncRoute(async (req, res) => {
  const cacheKey = 'admin:exams:list'
  const cached = getCachedEndpoint(cacheKey)
  if (cached) return res.json(cached)
  const exams = await readExams()
  const list = exams
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  setCachedEndpoint(cacheKey, list)
  res.json(list)
}))

app.get('/api/admin/exam-results', requireAdmin, asyncRoute(async (req, res) => {
  const { examId = '', student = '', from = '', to = '' } = req.query || {}
  const payload = await buildAdminExamResults({
    examId: String(examId || ''),
    student: String(student || ''),
    from: String(from || ''),
    to: String(to || ''),
  })
  res.json(payload)
}))

app.patch('/api/admin/exams/:id', requireAdmin, asyncRoute(async (req, res) => {
  const { id } = req.params
  const payload = req.body || {}
  const exams = await readExams()
  const idx = exams.findIndex(e => e.id === id)
  if (idx < 0) return res.status(404).json({ error: 'exam not found' })

  const current = exams[idx]
  const next = {
    ...current,
    title: payload.title ?? current.title,
    duration: toPositiveInt(payload.duration, current.duration || 60),
    questionCount: toPositiveInt(payload.questionCount, current.questionCount || 10),
    totalScore: toPositiveInt(payload.totalScore, current.totalScore || DEFAULT_TOTAL_SCORE),
    levelRequired: normalizeCourseLevel(payload.levelRequired || current.levelRequired, DEFAULT_EXAM_LEVEL),
    status: payload.status || current.status || 'scheduled'
  }
  const windowPayload = normalizeExamWindow(payload)
  if (windowPayload.startTime) next.startTime = windowPayload.startTime
  if (windowPayload.endTime) next.endTime = windowPayload.endTime
  if (Array.isArray(payload.bankIds) && payload.bankIds.length > 0) next.bankIds = payload.bankIds

  exams[idx] = next
  await writeExams(exams)
  clearExamCaches()
  res.json({ success: true, exam: next })
}))

app.delete('/api/admin/exams/:id', requireAdmin, asyncRoute(async (req, res) => {
  const { id } = req.params
  const exams = await readExams()
  const next = exams.filter(e => e.id !== id)
  if (next.length === exams.length) return res.status(404).json({ error: 'exam not found' })
  await writeExams(next)
  clearExamCaches()
  res.json({ success: true })
}))

// 获取可用考试列表（学生端）
app.get('/api/exams/available', requireAuth, asyncRoute(async (req, res) => {
  const username = req.authUser.username
  const cacheKey = `exams:available:${username}`
  const cached = getCachedEndpoint(cacheKey)
  if (cached) return res.json(cached)
  const exams = await readExams()
  const attempts = await readAttempts()
  const submittedExamIds = new Set(
    attempts
      .filter(item => item.username === username)
      .map(item => item.examId)
  )
  const now = new Date()
  
  const available = exams
    .filter(e => new Date(e.endTime) >= now)
    .filter(e => !submittedExamIds.has(e.id))
    .map(e => ({
      ...e,
      availability: new Date(e.startTime) > now ? 'upcoming' : 'active'
    }))
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
  setCachedEndpoint(cacheKey, available)
  res.json(available)
}))

// 获取考试试卷（开始考试）
app.get('/api/exams/:id/start', requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params
  const username = req.authUser.username
  
  const exams = await readExams()
  const exam = exams.find(e => e.id === id)
  if (!exam) return res.status(404).json({ error: 'exam not found' })
  const attempts = await readAttempts()
  if (hasSubmittedExam(attempts, username, id)) {
    return res.status(409).json({ error: 'already_submitted' })
  }
  
  // 检查时间
  const now = new Date()
  if (now < new Date(exam.startTime)) return res.status(400).json({ error: 'not started' })
  if (now > new Date(exam.endTime)) return res.status(400).json({ error: 'ended' })
  
  if (!canAccessExamLevel(req.authUser.level, exam.levelRequired || DEFAULT_EXAM_LEVEL)) {
    return res.status(403).json({ error: 'insufficient_level' })
  }
  
  // 抽取题目（按试卷顺序，不打乱）
  const allQuestions = await readQuestions()
  const bankIdSet = new Set(exam.bankIds || [])
  const bankOrder = new Map((exam.bankIds || []).map((bid, index) => [bid, index]))
  const candidates = allQuestions
    .filter(q => bankIdSet.has(q.bankId))
    .sort((a, b) => {
      const bankDiff = (bankOrder.get(a.bankId) ?? 9999) - (bankOrder.get(b.bankId) ?? 9999)
      if (bankDiff !== 0) return bankDiff
      return (a.order || 0) - (b.order || 0)
    })

  const count = exam.questionCount || candidates.length
  const selected = count >= candidates.length ? candidates : candidates.slice(0, count)
  
  // 屏蔽答案后返回
  const paper = selected.map(q => {
    const { answer, ...rest } = q
    return rest
  })
  
  res.json({ 
    examId: exam.id, 
    title: exam.title, 
    duration: exam.duration,
    totalScore: exam.totalScore || DEFAULT_TOTAL_SCORE,
    questions: paper 
  })
}))

// 提交试卷与判分
app.post('/api/exams/:id/submit', requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params
  const { answers, questionIds, startedAt, submittedAt } = req.body // answers: { qId: 'A', qId2: 'T' }
  const username = req.authUser.username
  
  const exams = await readExams()
  const exam = exams.find(e => e.id === id)
  if (!exam) return res.status(404).json({ error: 'exam not found' })
  
  const allQuestions = await readQuestions()
  const questionMap = new Map(allQuestions.map(q => [q.id, q]))
  const wrongBook = await readWrongBook()
  const attempts = await readAttempts()
  if (hasSubmittedExam(attempts, username, id)) {
    return res.status(409).json({ error: 'already_submitted' })
  }
  
  const validQuestionIds = Array.isArray(questionIds) ? questionIds : Object.keys(answers || {})
  const submitTime = toIsoTime(submittedAt)
  const startTime = startedAt ? toIsoTime(startedAt) : ''
  let totalRawScore = 0
  let earnedRawScore = 0
  const results = []
  const wrongQuestions = []
  const wrongBookRecords = []
  let answeredCount = 0

  validQuestionIds.forEach(qId => {
    const question = questionMap.get(qId)
    if (!question) return

    totalRawScore += question.score
    const userAns = answers?.[qId]
    const isCorrect = userAns === question.answer
    const answered = hasSubmittedAnswer(userAns)
    if (answered) answeredCount += 1

    if (isCorrect) {
      earnedRawScore += question.score
    } else if (answered) {
      // 记录错题
      const record = {
        username,
        questionId: qId,
        questionTitle: question.title,
        yourAnswer: userAns,
        correctAnswer: question.answer,
        examId: id,
        examTitle: exam.title,
        at: submitTime
      }
      wrongBookRecords.push(record)
      wrongQuestions.push({
        questionId: qId,
        title: question.title,
        type: question.type || 'single',
        options: question.options || [],
        yourAnswer: userAns,
        correctAnswer: question.answer,
      })
    }
    
    results.push({
      questionId: qId,
      isCorrect,
      score: isCorrect ? question.score : 0,
      correctAnswer: question.answer // 返回正确答案供查看
    })
  })

  const configuredTotalScore = toPositiveInt(exam.totalScore, DEFAULT_TOTAL_SCORE)
  const scoreScaled = totalRawScore > 0 ? Math.round((earnedRawScore / totalRawScore) * configuredTotalScore) : 0
  
  // 记录本次尝试
  const attempt = {
    id: Date.now().toString(),
    examId: id,
    username,
    score: scoreScaled,
    rawScore: earnedRawScore,
    rawTotal: totalRawScore,
    totalScore: configuredTotalScore,
    answeredCount,
    wrongQuestionIds: wrongQuestions.map(item => item.questionId),
    startedAt: startTime,
    submittedAt: submitTime,
    durationSeconds: startTime ? (diffSeconds(startTime, submitTime) || 0) : null,
    at: submitTime
  }
  attempts.push(attempt)
  const wrongQuestionsWithAnalysis = await buildWrongQuestionAnalyses(wrongQuestions)

  const analysisMap = new Map(
    wrongQuestionsWithAnalysis.map(item => [item.questionId, item.analysis || ''])
  )

  wrongBookRecords.forEach((record) => {
    wrongBook.push({
      ...record,
      analysis: analysisMap.get(record.questionId) || buildFallbackAnalysis(record),
    })
  })

  await writeWrongBook(wrongBook)
  await writeAttempts(attempts)
  clearUserCaches(username)
  clearExamCaches()
  
  res.json({
    success: true,
    score: scoreScaled,
    totalScore: configuredTotalScore,
    rawScore: earnedRawScore,
    rawTotal: totalRawScore,
    results,
    wrongQuestions: wrongQuestionsWithAnalysis,
  })
}))

// 获取错题本
app.get('/api/my/wrong-book', requireAuth, asyncRoute(async (req, res) => {
  const username = req.authUser.username
  const cacheKey = `wrong-book:${username}`
  const cached = getCachedEndpoint(cacheKey)
  if (cached) return res.json(cached)
  const wrongBook = (await readWrongBook()).filter(w => w.username === username)
  const allQuestions = await readQuestions()
  const questionMap = new Map(allQuestions.map(q => [q.id, q]))
  const optionSignatureCache = new Map()
  const map = new Map()

  const buildWrongBookDedupKey = (item, question) => {
    const title = sanitizeQuestionText(item.questionTitle || question?.title || '')
    const correctAnswer = String(item.correctAnswer || question?.answer || '').trim().toUpperCase()
    const type = String(question?.type || 'single').trim().toLowerCase()
    const optionsSignature = question?.id ? (optionSignatureCache.get(question.id) || '') : ''
    return `${title}::${correctAnswer}::${type}::${optionsSignature}`
  }

  wrongBook.forEach(item => {
    const q = questionMap.get(item.questionId) || {}
    if (q.id && !optionSignatureCache.has(q.id)) {
      const optionsSignature = Array.isArray(q.options)
        ? q.options
            .map(opt => `${String(opt?.label || '').trim().toUpperCase()}:${normalizeOptionText(opt?.text || '')}`)
            .join('|')
        : ''
      optionSignatureCache.set(q.id, optionsSignature)
    }
    const dedupKey = buildWrongBookDedupKey(item, q)
    const prev = map.get(dedupKey)
    if (!prev) {
      map.set(dedupKey, {
        questionId: item.questionId,
        title: item.questionTitle || q.title || '',
        type: q.type || 'single',
        options: q.options || [],
        codeSnippet: q.codeSnippet || '',
        correctAnswer: item.correctAnswer,
        analysis: item.analysis || '',
        wrongCount: 1,
        firstWrongAt: item.at,
        lastWrongAt: item.at,
        lastYourAnswer: item.yourAnswer,
        examTitle: item.examTitle,
      })
    } else {
      prev.wrongCount += 1
      prev.lastWrongAt = item.at
      prev.lastYourAnswer = item.yourAnswer
      prev.correctAnswer = item.correctAnswer
      if (!prev.analysis && item.analysis) {
        prev.analysis = item.analysis
      }
    }
  })
  const list = Array.from(map.values()).sort((a, b) => new Date(b.lastWrongAt) - new Date(a.lastWrongAt))
  setCachedEndpoint(cacheKey, list)
  res.json(list)
}))

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error)
  console.error(error)
  res.status(500).json({
    error: 'server_error',
    message: error instanceof Error ? error.message : 'unknown error',
  })
})

const PORT = process.env.PORT || 8787
app.listen(PORT, () => {
  process.stdout.write(`server at http://localhost:${PORT}\n`)
  process.stdout.write(`storage mode: ${dataStore.config.mode}\n`)
})
