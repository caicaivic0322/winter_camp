import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_TABLE = 'app_state'
const DEFAULT_SQLITE_FILE = 'app_state.sqlite'
const DEFAULT_COLLECTION_CACHE_MS = 3000
const require = createRequire(import.meta.url)

function loadSqliteDriver() {
  try {
    return require('better-sqlite3')
  } catch {
    return null
  }
}

export function resolveStorageConfig(env = process.env, fallbackDataDir = '') {
  const hasExplicitDataDir = Boolean(String(env.DATA_DIR || '').trim())
  const dataDir = path.resolve(env.DATA_DIR || fallbackDataDir || path.join(process.cwd(), 'data'))
  const storageMode = String(env.STORAGE_MODE || '').trim().toLowerCase()
  const supabaseUrl = String(env.SUPABASE_URL || '').trim()
  const supabaseServiceRoleKey = String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const supabaseTable = String(env.SUPABASE_STATE_TABLE || DEFAULT_SUPABASE_TABLE).trim() || DEFAULT_SUPABASE_TABLE
  const sqlitePathRaw = String(env.SQLITE_PATH || '').trim()
  const sqlitePath = path.resolve(sqlitePathRaw || path.join(dataDir, DEFAULT_SQLITE_FILE))

  if (storageMode === 'supabase') {
    return {
      mode: 'supabase',
      dataDir,
      supabaseUrl,
      supabaseServiceRoleKey,
      supabaseTable,
    }
  }

  if (storageMode === 'sqlite' || sqlitePathRaw) {
    return {
      mode: 'sqlite',
      dataDir,
      sqlitePath,
      supabaseTable,
    }
  }

  if (storageMode === 'local' || hasExplicitDataDir) {
    return {
      mode: 'local',
      dataDir,
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
  const collectionCacheMs = Math.max(0, Number(env.COLLECTION_CACHE_MS || DEFAULT_COLLECTION_CACHE_MS) || DEFAULT_COLLECTION_CACHE_MS)
  const usersFile = path.join(config.dataDir, 'users.json')
  const questionsFile = path.join(config.dataDir, 'questions.json')
  const examsFile = path.join(config.dataDir, 'exams.json')
  const attemptsFile = path.join(config.dataDir, 'attempts.json')
  const legacyWrongBookFile = path.join(config.dataDir, 'wrong_book.json')
  const collectionCache = new Map()

  const supabase = config.mode === 'supabase'
    ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null

  const sqlite = (() => {
    if (config.mode !== 'sqlite') return null
    const SqliteDriver = loadSqliteDriver()
    if (!SqliteDriver) {
      throw new Error('SQLite mode requires dependency "better-sqlite3". Run: npm --prefix server install')
    }
    return new SqliteDriver(config.sqlitePath)
  })()

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
    if (!fs.existsSync(attemptsFile)) {
      fs.writeFileSync(attemptsFile, JSON.stringify([], null, 2))
    }
  }

  function sqliteReadStateRowSync(key) {
    const row = sqlite
      .prepare('SELECT value FROM app_state WHERE key = ? LIMIT 1')
      .get(key)
    if (!row) return undefined
    try {
      return JSON.parse(row.value)
    } catch {
      return undefined
    }
  }

  function sqliteWriteStateRowSync(key, value) {
    sqlite
      .prepare(`
        INSERT INTO app_state (key, value, updated_at)
        VALUES (@key, @value, @updated_at)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `)
      .run({
        key,
        value: JSON.stringify(value),
        updated_at: new Date().toISOString(),
      })
  }

  function cloneCollection(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
  }

  function getCachedCollection(key) {
    const hit = collectionCache.get(key)
    if (!hit) return undefined
    if ((Date.now() - hit.at) > collectionCacheMs) {
      collectionCache.delete(key)
      return undefined
    }
    return cloneCollection(hit.value)
  }

  function setCachedCollection(key, value) {
    collectionCache.set(key, {
      at: Date.now(),
      value: cloneCollection(value),
    })
  }

  function clearCachedCollection(key) {
    collectionCache.delete(key)
  }

  function ensureSqliteData() {
    if (!fs.existsSync(config.dataDir)) fs.mkdirSync(config.dataDir, { recursive: true })
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('busy_timeout = 5000')
    sqlite
      .prepare(`
        CREATE TABLE IF NOT EXISTS app_state (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)
      .run()

    const users = sqliteReadStateRowSync('users')
    if (users === undefined) {
      ensureLocalData()
      const localData = {
        users: JSON.parse(fs.readFileSync(usersFile, 'utf-8')),
        questions: JSON.parse(fs.readFileSync(questionsFile, 'utf-8')),
        exams: JSON.parse(fs.readFileSync(examsFile, 'utf-8')),
        attempts: JSON.parse(fs.readFileSync(attemptsFile, 'utf-8')),
      }

      sqlite.transaction(() => {
        sqliteWriteStateRowSync('users', localData.users)
        sqliteWriteStateRowSync('questions', localData.questions)
        sqliteWriteStateRowSync('exams', localData.exams)
        sqliteWriteStateRowSync('attempts', localData.attempts)
      })()
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
    const cached = getCachedCollection(key)
    if (cached !== undefined) return cached

    if (config.mode === 'local') {
      ensureLocalData()
      const fileMap = {
        users: usersFile,
        questions: questionsFile,
        exams: examsFile,
        attempts: attemptsFile,
      }

      try {
        const parsed = JSON.parse(fs.readFileSync(fileMap[key], 'utf-8'))
        setCachedCollection(key, parsed)
        return parsed
      } catch {
        setCachedCollection(key, defaultValue)
        return defaultValue
      }
    }

    if (config.mode === 'sqlite') {
      ensureSqliteData()
      const value = sqliteReadStateRowSync(key)
      if (value === undefined || value === null) {
        sqliteWriteStateRowSync(key, defaultValue)
        setCachedCollection(key, defaultValue)
        return defaultValue
      }
      setCachedCollection(key, value)
      return value
    }

    const value = await readStateRow(key)
    if (value === undefined || value === null) {
      await writeStateRow(key, defaultValue)
      setCachedCollection(key, defaultValue)
      return defaultValue
    }
    setCachedCollection(key, value)
    return value
  }

  async function writeCollection(key, value) {
    clearCachedCollection(key)

    if (config.mode === 'local') {
      ensureLocalData()
      const fileMap = {
        users: usersFile,
        questions: questionsFile,
        exams: examsFile,
        attempts: attemptsFile,
      }
      fs.writeFileSync(fileMap[key], JSON.stringify(value, null, 2))
      setCachedCollection(key, value)
      return
    }

    if (config.mode === 'sqlite') {
      ensureSqliteData()
      sqliteWriteStateRowSync(key, value)
      setCachedCollection(key, value)
      return
    }

    await writeStateRow(key, value)
    setCachedCollection(key, value)
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

  async function readAttempts() {
    const data = await readCollection('attempts', [])
    return Array.isArray(data) ? data : []
  }

  async function readLegacyWrongBook() {
    const cached = getCachedCollection('wrong_book')
    if (cached !== undefined) return Array.isArray(cached) ? cached : []

    if (config.mode === 'local') {
      if (!fs.existsSync(legacyWrongBookFile)) return []
      try {
        const data = JSON.parse(fs.readFileSync(legacyWrongBookFile, 'utf-8'))
        setCachedCollection('wrong_book', data)
        return Array.isArray(data) ? data : []
      } catch {
        return []
      }
    }

    if (config.mode === 'sqlite') {
      ensureSqliteData()
      const data = sqliteReadStateRowSync('wrong_book')
      setCachedCollection('wrong_book', data)
      return Array.isArray(data) ? data : []
    }

    const data = await readStateRow('wrong_book')
    setCachedCollection('wrong_book', data)
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

    if (config.mode === 'sqlite') {
      ensureSqliteData()
      sqliteReadStateRowSync('users')
      return { storage: config.mode, reachable: true }
    }

    await readStateRow('users')
    return { storage: config.mode, reachable: true }
  }

  async function replaceAll({ users, questions, exams, attempts }) {
    await Promise.all([
      writeUsers(users),
      writeQuestions(questions),
      writeExams(exams),
      writeAttempts(attempts),
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
    readAttempts,
    readLegacyWrongBook,
    writeAttempts,
  }
}
