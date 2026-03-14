import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serverDir = path.resolve(__dirname, '..')

async function startServer(extraEnv = {}) {
  const port = String(9500 + Math.floor(Math.random() * 200))
  const child = spawn('node', ['index.js'], {
    cwd: serverDir,
    env: { ...process.env, PORT: port, ...extraEnv },
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
    async stop() {
      child.kill('SIGTERM')
      await new Promise(resolve => child.on('exit', resolve))
    },
  }
}

test('server stores runtime json files under DATA_DIR when provided', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpp-camp-data-'))
  const server = await startServer({ DATA_DIR: tempDir })

  try {
    const loginRes = await fetch(`${server.baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '123456' }),
    })

    assert.equal(loginRes.status, 200)

    const files = ['users.json', 'questions.json', 'exams.json', 'wrong_book.json', 'attempts.json']
    files.forEach((name) => {
      const file = path.join(tempDir, name)
      assert.equal(fs.existsSync(file), true, `${name} should be created in DATA_DIR`)
    })

    const users = JSON.parse(fs.readFileSync(path.join(tempDir, 'users.json'), 'utf-8'))
    assert.equal(users.admin.username, 'admin')
  } finally {
    await server.stop()
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test('storage health endpoint performs a real storage check', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cpp-camp-health-'))
  const server = await startServer({ DATA_DIR: tempDir })

  try {
    const res = await fetch(`${server.baseUrl}/health/storage`)
    assert.equal(res.status, 200)

    const data = await res.json()
    assert.equal(data.ok, true)
    assert.equal(data.storage, 'local')
    assert.equal(data.reachable, true)
  } finally {
    await server.stop()
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})
