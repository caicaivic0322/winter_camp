import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_TABLE = 'app_state'

export function resolveStorageConfig(env = process.env, fallbackDataDir = '') {
  const dataDir = path.resolve(env.DATA_DIR || fallbackDataDir || path.join(process.cwd(), 'data'))
  const supabaseUrl = String(env.SUPABASE_URL || '').trim()
  const supabaseServiceRoleKey = String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const supabaseTable = String(env.SUPABASE_STATE_TABLE || DEFAULT_SUPABASE_TABLE).trim() || DEFAULT_SUPABASE_TABLE

  if (supabaseUrl && supabaseServiceRoleKey) {
    return {
      mode: 'supabase',
      dataDir,
      supabaseUrl,
      supabaseServiceRoleKey,
      supabaseTable,
    }
  }

  return {
    mode: 'local',
    dataDir,
    supabaseTable,
  }
}

export function createDataStore({
  env = process.env,
  fallbackDataDir,
  normalizeCourseLevel,
  normalizeCompetitionProgress,
  defaultUserLevel,
  defaultExamLevel,
}) {
  const config = resolveStorageConfig(env, fallbackDataDir)
  const usersFile = path.join(config.dataDir, 'users.json')
  const questionsFile = path.join(config.dataDir, 'questions.json')
  const examsFile = path.join(config.dataDir, 'exams.json')
  const wrongBookFile = path.join(config.dataDir, 'wrong_book.json')
  const attemptsFile = path.join(config.dataDir, 'attempts.json')

  const supabase = config.mode === 'supabase'
    ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null

  function buildSeedUsers() {
    return {
      admin: {
        username: 'admin',
        password: '123456',
        nickname: '管理员',
        role: 'admin',
        level: '高级',
        createdAt: new Date().toISOString(),
      },
    }
  }

  function migrateOldDataDir() {
    const oldDir = path.join(process.cwd(), 'server', 'data')
    const reallyOldDir = path.join(process.cwd(), 'server', 'server', 'data')
    const candidates = [oldDir, reallyOldDir]
    for (const dir of candidates) {
      const src = path.join(dir, 'users.json')
      if (fs.existsSync(src) && !fs.existsSync(usersFile)) {
        if (!fs.existsSync(config.dataDir)) fs.mkdirSync(config.dataDir, { recursive: true })
        try {
          fs.copyFileSync(src, usersFile)
        } catch {}
      }
    }
  }

  function ensureLocalData() {
    if (!fs.existsSync(config.dataDir)) fs.mkdirSync(config.dataDir, { recursive: true })
    migrateOldDataDir()
    if (!fs.existsSync(usersFile)) {
      fs.writeFileSync(usersFile, JSON.stringify(buildSeedUsers(), null, 2))
    }
    if (!fs.existsSync(questionsFile)) {
      fs.writeFileSync(questionsFile, JSON.stringify([], null, 2))
    }
    if (!fs.existsSync(examsFile)) {
      fs.writeFileSync(examsFile, JSON.stringify([], null, 2))
    }
    if (!fs.existsSync(wrongBookFile)) {
      fs.writeFileSync(wrongBookFile, JSON.stringify([], null, 2))
    }
    if (!fs.existsSync(attemptsFile)) {
      fs.writeFileSync(attemptsFile, JSON.stringify([], null, 2))
    }
  }

  async function readStateRow(key) {
    const { data, error } = await supabase
      .from(config.supabaseTable)
      .select('value')
      .eq('key', key)
      .maybeSingle()

    if (error) throw error
    return data?.value
  }

  async function writeStateRow(key, value) {
    const { error } = await supabase
      .from(config.supabaseTable)
      .upsert(
        {
          key,
          value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )

    if (error) throw error
  }

  async function readCollection(key, defaultValue) {
    if (config.mode === 'local') {
      ensureLocalData()
      const fileMap = {
        users: usersFile,
        questions: questionsFile,
        exams: examsFile,
        wrong_book: wrongBookFile,
        attempts: attemptsFile,
      }

      try {
        return JSON.parse(fs.readFileSync(fileMap[key], 'utf-8'))
      } catch {
        return defaultValue
      }
    }

    const value = await readStateRow(key)
    if (value === undefined || value === null) {
      await writeStateRow(key, defaultValue)
      return defaultValue
    }
    return value
  }

  async function writeCollection(key, value) {
    if (config.mode === 'local') {
      ensureLocalData()
      const fileMap = {
        users: usersFile,
        questions: questionsFile,
        exams: examsFile,
        wrong_book: wrongBookFile,
        attempts: attemptsFile,
      }
      fs.writeFileSync(fileMap[key], JSON.stringify(value, null, 2))
      return
    }

    await writeStateRow(key, value)
  }

  async function readUsers() {
    const data = await readCollection('users', buildSeedUsers())
    let changed = false

    Object.keys(data).forEach((key) => {
      const user = data[key]
      if (!user) return

      const nextLevel = normalizeCourseLevel(user.level, defaultUserLevel)
      if (nextLevel !== user.level) {
        user.level = nextLevel
        data[key] = user
        changed = true
      }

      const normalizedProgress = normalizeCompetitionProgress(user.competitionProgress)
      const currentProgress = user.competitionProgress || {}
      if (
        JSON.stringify(normalizedProgress.completedProblemIds) !== JSON.stringify(currentProgress.completedProblemIds || []) ||
        JSON.stringify(normalizedProgress.wrongProblemIds) !== JSON.stringify(currentProgress.wrongProblemIds || []) ||
        JSON.stringify(normalizedProgress.favoriteProblemIds) !== JSON.stringify(currentProgress.favoriteProblemIds || [])
      ) {
        user.competitionProgress = normalizedProgress
        data[key] = user
        changed = true
      }
    })

    if (changed) await writeUsers(data)
    return data
  }

  async function writeUsers(data) {
    await writeCollection('users', data)
  }

  async function readQuestions() {
    const data = await readCollection('questions', [])
    return Array.isArray(data) ? data : []
  }

  async function writeQuestions(data) {
    await writeCollection('questions', data)
  }

  async function readExams() {
    const data = await readCollection('exams', [])
    if (!Array.isArray(data)) return []

    let changed = false
    const normalized = data.map((item) => {
      const levelRequired = normalizeCourseLevel(item.levelRequired, defaultExamLevel)
      if (levelRequired !== item.levelRequired) {
        changed = true
        return { ...item, levelRequired }
      }
      return item
    })

    if (changed) await writeExams(normalized)
    return normalized
  }

  async function writeExams(data) {
    await writeCollection('exams', data)
  }

  async function readWrongBook() {
    const data = await readCollection('wrong_book', [])
    return Array.isArray(data) ? data : []
  }

  async function writeWrongBook(data) {
    await writeCollection('wrong_book', data)
  }

  async function readAttempts() {
    const data = await readCollection('attempts', [])
    return Array.isArray(data) ? data : []
  }

  async function writeAttempts(data) {
    await writeCollection('attempts', data)
  }

  async function probe() {
    if (config.mode === 'local') {
      ensureLocalData()
      await readCollection('users', buildSeedUsers())
      return { storage: config.mode, reachable: true }
    }

    await readStateRow('users')
    return { storage: config.mode, reachable: true }
  }

  async function replaceAll({ users, questions, exams, attempts, wrongBook }) {
    await Promise.all([
      writeUsers(users),
      writeQuestions(questions),
      writeExams(exams),
      writeAttempts(attempts),
      writeWrongBook(wrongBook),
    ])
  }

  return {
    config,
    probe,
    replaceAll,
    readUsers,
    writeUsers,
    readQuestions,
    writeQuestions,
    readExams,
    writeExams,
    readWrongBook,
    writeWrongBook,
    readAttempts,
    writeAttempts,
  }
}
