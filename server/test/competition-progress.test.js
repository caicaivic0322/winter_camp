import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serverDir = path.resolve(__dirname, '..')

const fixtures = {
  users: {
    admin: {
      username: 'admin',
      password: '123456',
      nickname: '管理员',
      role: 'admin',
      level: '高级',
      createdAt: '2026-03-13T00:00:00.000Z',
    },
    alice: {
      username: 'alice',
      password: '123456',
      nickname: 'Alice',
      role: 'user',
      level: '竞赛',
      createdAt: '2026-03-13T00:01:00.000Z',
      competitionProgress: {
        completedProblemIds: [1, 2],
        wrongProblemIds: [3],
        favoriteProblemIds: [2],
      },
    },
    bob: {
      username: 'bob',
      password: '123456',
      nickname: 'Bob',
      role: 'user',
      level: '竞赛',
      createdAt: '2026-03-13T00:02:00.000Z',
    },
  },
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

async function startServer() {
  const port = String(9200 + Math.floor(Math.random() * 300))
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpp-camp-progress-'))
  const child = spawn('node', ['index.js'], {
    cwd: serverDir,
    env: { ...process.env, PORT: port, DATA_DIR: dataDir },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server start timeout')), 5000)

    child.stdout.on('data', (chunk) => {
      if (String(chunk).includes(`http://localhost:${port}`)) {
        clearTimeout(timer)
        resolve()
      }
    })

    child.stderr.on('data', (chunk) => {
      clearTimeout(timer)
      reject(new Error(String(chunk)))
    })

    child.on('exit', (code) => {
      clearTimeout(timer)
      reject(new Error(`server exited early: ${code}`))
    })
  })

  return {
    baseUrl: `http://127.0.0.1:${port}/api`,
    dataDir,
    async stop() {
      child.kill('SIGTERM')
      await new Promise(resolve => child.on('exit', resolve))
      fs.rmSync(dataDir, { recursive: true, force: true })
    },
  }
}

async function login(baseUrl, username, password) {
  const res = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  assert.equal(res.status, 200)
  return res.json()
}

test('user can fetch and update own competition progress', async () => {
  const server = await startServer()
  const usersFile = path.join(server.dataDir, 'users.json')
  const attemptsFile = path.join(server.dataDir, 'attempts.json')
  const wrongBookFile = path.join(server.dataDir, 'wrong_book.json')

  writeJson(usersFile, fixtures.users)
  writeJson(attemptsFile, [])
  writeJson(wrongBookFile, [])

  try {
    const loginData = await login(server.baseUrl, 'alice', '123456')
    const getRes = await fetch(`${server.baseUrl}/users/alice/competition-progress`, {
      headers: {
        Authorization: `Bearer ${loginData.token}`,
      },
    })

    assert.equal(getRes.status, 200)
    const initial = await getRes.json()
    assert.deepEqual(initial.progress.completedProblemIds, [1, 2])
    assert.deepEqual(initial.progress.wrongProblemIds, [3])

    const putRes = await fetch(`${server.baseUrl}/users/alice/competition-progress`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginData.token}`,
      },
      body: JSON.stringify({
        completedProblemIds: [5, 8, 8],
        wrongProblemIds: [13, 'x'],
        favoriteProblemIds: [21],
      }),
    })

    assert.equal(putRes.status, 200)
    const saved = await putRes.json()
    assert.deepEqual(saved.progress, {
      completedProblemIds: [5, 8],
      wrongProblemIds: [13],
      favoriteProblemIds: [21],
    })

    const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'))
    assert.deepEqual(users.alice.competitionProgress, {
      completedProblemIds: [5, 8],
      wrongProblemIds: [13],
      favoriteProblemIds: [21],
    })
  } finally {
    await server.stop()
  }
})

test('non-admin user cannot read or write another user competition progress', async () => {
  const server = await startServer()
  const usersFile = path.join(server.dataDir, 'users.json')
  const attemptsFile = path.join(server.dataDir, 'attempts.json')
  const wrongBookFile = path.join(server.dataDir, 'wrong_book.json')

  writeJson(usersFile, fixtures.users)
  writeJson(attemptsFile, [])
  writeJson(wrongBookFile, [])

  try {
    const loginData = await login(server.baseUrl, 'bob', '123456')
    const getRes = await fetch(`${server.baseUrl}/users/alice/competition-progress`, {
      headers: {
        Authorization: `Bearer ${loginData.token}`,
      },
    })

    assert.equal(getRes.status, 403)

    const putRes = await fetch(`${server.baseUrl}/users/alice/competition-progress`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginData.token}`,
      },
      body: JSON.stringify({
        completedProblemIds: [1],
        wrongProblemIds: [],
        favoriteProblemIds: [],
      }),
    })

    assert.equal(putRes.status, 403)
  } finally {
    await server.stop()
  }
})
