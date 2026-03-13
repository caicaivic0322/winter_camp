import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serverDir = path.resolve(__dirname, '..')
const dataDir = path.join(serverDir, 'data')
const usersFile = path.join(dataDir, 'users.json')
const attemptsFile = path.join(dataDir, 'attempts.json')
const wrongBookFile = path.join(dataDir, 'wrong_book.json')

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
    vic: {
      username: 'vic',
      password: '123456',
      nickname: '蔡臻',
      role: 'user',
      level: '中级',
      createdAt: '2026-03-13T00:01:00.000Z',
    },
  },
  attempts: [
    {
      id: 'attempt-1',
      examId: 'exam-1',
      username: 'student-a',
      score: 88,
      rawScore: 88,
      rawTotal: 100,
      totalScore: 100,
      at: '2026-03-13T00:02:00.000Z',
    },
  ],
  wrongBook: [
    {
      username: 'student-a',
      questionId: 'q-1',
      questionTitle: '样例题',
      yourAnswer: 'A',
      correctAnswer: 'B',
      examId: 'exam-1',
      examTitle: '样例卷',
      at: '2026-03-13T00:03:00.000Z',
    },
  ],
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

async function startServer() {
  const port = String(8900 + Math.floor(Math.random() * 300))
  const child = spawn('node', ['index.js'], {
    cwd: serverDir,
    env: { ...process.env, PORT: port },
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

async function login(baseUrl, username, password) {
  const res = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  assert.equal(res.status, 200)
  return res.json()
}

test('admin can create a user and delete that user with related records cleanup', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    attempts: fs.readFileSync(attemptsFile, 'utf-8'),
    wrongBook: fs.readFileSync(wrongBookFile, 'utf-8'),
  }

  writeJson(usersFile, fixtures.users)
  writeJson(attemptsFile, fixtures.attempts)
  writeJson(wrongBookFile, fixtures.wrongBook)

  const server = await startServer()

  try {
    const adminLogin = await login(server.baseUrl, 'admin', '123456')
    const createRes = await fetch(`${server.baseUrl}/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminLogin.token}`,
      },
      body: JSON.stringify({
        username: 'student-a',
        password: '123456',
        nickname: '学员A',
        role: 'user',
        level: '初级',
      }),
    })

    assert.equal(createRes.status, 201)
    const created = await createRes.json()
    assert.equal(created.username, 'student-a')
    assert.equal(created.level, '初级')

    const deleteRes = await fetch(`${server.baseUrl}/users/student-a`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminLogin.token}`,
      },
    })

    assert.equal(deleteRes.status, 200)

    const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'))
    assert.equal(users['student-a'], undefined)

    const attempts = JSON.parse(fs.readFileSync(attemptsFile, 'utf-8'))
    const wrongBook = JSON.parse(fs.readFileSync(wrongBookFile, 'utf-8'))
    assert.equal(attempts.some(item => item.username === 'student-a'), false)
    assert.equal(wrongBook.some(item => item.username === 'student-a'), false)
  } finally {
    await server.stop()
    fs.writeFileSync(usersFile, backups.users)
    fs.writeFileSync(attemptsFile, backups.attempts)
    fs.writeFileSync(wrongBookFile, backups.wrongBook)
  }
})

test('self registration defaults to 试用 and admin can promote a user to 竞赛', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    attempts: fs.readFileSync(attemptsFile, 'utf-8'),
    wrongBook: fs.readFileSync(wrongBookFile, 'utf-8'),
  }

  writeJson(usersFile, fixtures.users)
  writeJson(attemptsFile, fixtures.attempts)
  writeJson(wrongBookFile, fixtures.wrongBook)

  const server = await startServer()

  try {
    const registerRes = await fetch(`${server.baseUrl}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'trial-user',
        password: '123456',
        nickname: '试用学员',
      }),
    })

    assert.equal(registerRes.status, 201)
    const registerData = await registerRes.json()
    assert.equal(registerData.user.level, '试用')

    const adminLogin = await login(server.baseUrl, 'admin', '123456')
    const patchRes = await fetch(`${server.baseUrl}/users/trial-user/level`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminLogin.token}`,
      },
      body: JSON.stringify({ level: '竞赛' }),
    })

    assert.equal(patchRes.status, 200)

    const listRes = await fetch(`${server.baseUrl}/users`, {
      headers: {
        Authorization: `Bearer ${adminLogin.token}`,
      },
    })
    const users = await listRes.json()
    const trialUser = users.find(item => item.username === 'trial-user')
    assert.equal(trialUser.level, '竞赛')
  } finally {
    await server.stop()
    fs.writeFileSync(usersFile, backups.users)
    fs.writeFileSync(attemptsFile, backups.attempts)
    fs.writeFileSync(wrongBookFile, backups.wrongBook)
  }
})

test('admin can update user level but cannot delete admin account', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    attempts: fs.readFileSync(attemptsFile, 'utf-8'),
    wrongBook: fs.readFileSync(wrongBookFile, 'utf-8'),
  }

  writeJson(usersFile, fixtures.users)
  writeJson(attemptsFile, fixtures.attempts)
  writeJson(wrongBookFile, fixtures.wrongBook)

  const server = await startServer()

  try {
    const adminLogin = await login(server.baseUrl, 'admin', '123456')
    const patchRes = await fetch(`${server.baseUrl}/users/vic/level`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminLogin.token}`,
      },
      body: JSON.stringify({ level: '高级' }),
    })

    assert.equal(patchRes.status, 200)

    const listRes = await fetch(`${server.baseUrl}/users`, {
      headers: {
        Authorization: `Bearer ${adminLogin.token}`,
      },
    })
    const users = await listRes.json()
    const vic = users.find(item => item.username === 'vic')
    assert.equal(vic.level, '高级')

    const deleteAdminRes = await fetch(`${server.baseUrl}/users/admin`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminLogin.token}`,
      },
    })

    assert.equal(deleteAdminRes.status, 400)
  } finally {
    await server.stop()
    fs.writeFileSync(usersFile, backups.users)
    fs.writeFileSync(attemptsFile, backups.attempts)
    fs.writeFileSync(wrongBookFile, backups.wrongBook)
  }
})

test('admin routes require a logged-in admin session', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    attempts: fs.readFileSync(attemptsFile, 'utf-8'),
    wrongBook: fs.readFileSync(wrongBookFile, 'utf-8'),
  }

  writeJson(usersFile, fixtures.users)
  writeJson(attemptsFile, fixtures.attempts)
  writeJson(wrongBookFile, fixtures.wrongBook)

  const server = await startServer()

  try {
    const anonymousRes = await fetch(`${server.baseUrl}/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'student-b',
        password: '123456',
      }),
    })
    assert.equal(anonymousRes.status, 401)

    const userLogin = await login(server.baseUrl, 'vic', '123456')
    const nonAdminRes = await fetch(`${server.baseUrl}/admin/exams`, {
      headers: {
        Authorization: `Bearer ${userLogin.token}`,
      },
    })
    assert.equal(nonAdminRes.status, 403)

    const adminLogin = await login(server.baseUrl, 'admin', '123456')
    const adminRes = await fetch(`${server.baseUrl}/admin/exams`, {
      headers: {
        Authorization: `Bearer ${adminLogin.token}`,
      },
    })
    assert.equal(adminRes.status, 200)
  } finally {
    await server.stop()
    fs.writeFileSync(usersFile, backups.users)
    fs.writeFileSync(attemptsFile, backups.attempts)
    fs.writeFileSync(wrongBookFile, backups.wrongBook)
  }
})

test('admin can reset another user password and the new password takes effect immediately', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    attempts: fs.readFileSync(attemptsFile, 'utf-8'),
    wrongBook: fs.readFileSync(wrongBookFile, 'utf-8'),
  }

  writeJson(usersFile, fixtures.users)
  writeJson(attemptsFile, fixtures.attempts)
  writeJson(wrongBookFile, fixtures.wrongBook)

  const server = await startServer()

  try {
    const adminLogin = await login(server.baseUrl, 'admin', '123456')
    const resetRes = await fetch(`${server.baseUrl}/users/vic/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminLogin.token}`,
      },
      body: JSON.stringify({ password: '654321' }),
    })

    assert.equal(resetRes.status, 200)

    const oldPasswordLogin = await fetch(`${server.baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'vic', password: '123456' }),
    })
    assert.equal(oldPasswordLogin.status, 401)

    const newPasswordLogin = await fetch(`${server.baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'vic', password: '654321' }),
    })
    assert.equal(newPasswordLogin.status, 200)

    const nonAdminLogin = await login(server.baseUrl, 'vic', '654321')
    const forbiddenRes = await fetch(`${server.baseUrl}/users/admin/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nonAdminLogin.token}`,
      },
      body: JSON.stringify({ password: '111111' }),
    })
    assert.equal(forbiddenRes.status, 403)
  } finally {
    await server.stop()
    fs.writeFileSync(usersFile, backups.users)
    fs.writeFileSync(attemptsFile, backups.attempts)
    fs.writeFileSync(wrongBookFile, backups.wrongBook)
  }
})

test('admin can update another user role but cannot demote the current admin account', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    attempts: fs.readFileSync(attemptsFile, 'utf-8'),
    wrongBook: fs.readFileSync(wrongBookFile, 'utf-8'),
  }

  writeJson(usersFile, fixtures.users)
  writeJson(attemptsFile, fixtures.attempts)
  writeJson(wrongBookFile, fixtures.wrongBook)

  const server = await startServer()

  try {
    const adminLogin = await login(server.baseUrl, 'admin', '123456')
    const promoteRes = await fetch(`${server.baseUrl}/users/vic/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminLogin.token}`,
      },
      body: JSON.stringify({ role: 'admin' }),
    })

    assert.equal(promoteRes.status, 200)

    const vicLogin = await login(server.baseUrl, 'vic', '123456')
    const nowAdminRes = await fetch(`${server.baseUrl}/admin/exams`, {
      headers: {
        Authorization: `Bearer ${vicLogin.token}`,
      },
    })
    assert.equal(nowAdminRes.status, 200)

    const demoteSelfRes = await fetch(`${server.baseUrl}/users/admin/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminLogin.token}`,
      },
      body: JSON.stringify({ role: 'user' }),
    })
    assert.equal(demoteSelfRes.status, 400)
  } finally {
    await server.stop()
    fs.writeFileSync(usersFile, backups.users)
    fs.writeFileSync(attemptsFile, backups.attempts)
    fs.writeFileSync(wrongBookFile, backups.wrongBook)
  }
})

test('admin can import users from csv and skips duplicates with a summary', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    attempts: fs.readFileSync(attemptsFile, 'utf-8'),
    wrongBook: fs.readFileSync(wrongBookFile, 'utf-8'),
  }

  writeJson(usersFile, fixtures.users)
  writeJson(attemptsFile, fixtures.attempts)
  writeJson(wrongBookFile, fixtures.wrongBook)

  const server = await startServer()

  try {
    const adminLogin = await login(server.baseUrl, 'admin', '123456')
    const form = new FormData()
    form.append('file', new Blob([
      'username,password,nickname,role,level\n' +
      'newbie,123456,新学员,user,试用\n' +
      'vic,999999,重复用户,user,高级\n' +
      'coach,abcdef,助教,admin,高级\n'
    ], { type: 'text/csv' }), 'users.csv')

    const res = await fetch(`${server.baseUrl}/admin/users/import`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminLogin.token}`,
      },
      body: form,
    })

    assert.equal(res.status, 200)
    const data = await res.json()
    assert.equal(data.createdCount, 2)
    assert.equal(data.skippedCount, 1)
    assert.equal(data.createdUsers.includes('newbie'), true)
    assert.equal(data.createdUsers.includes('coach'), true)

    const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'))
    assert.equal(users.newbie.nickname, '新学员')
    assert.equal(users.coach.role, 'admin')
    assert.equal(users.vic.password, '123456')
  } finally {
    await server.stop()
    fs.writeFileSync(usersFile, backups.users)
    fs.writeFileSync(attemptsFile, backups.attempts)
    fs.writeFileSync(wrongBookFile, backups.wrongBook)
  }
})

test('admin can export users as csv', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    attempts: fs.readFileSync(attemptsFile, 'utf-8'),
    wrongBook: fs.readFileSync(wrongBookFile, 'utf-8'),
  }

  writeJson(usersFile, fixtures.users)
  writeJson(attemptsFile, fixtures.attempts)
  writeJson(wrongBookFile, fixtures.wrongBook)

  const server = await startServer()

  try {
    const adminLogin = await login(server.baseUrl, 'admin', '123456')
    const res = await fetch(`${server.baseUrl}/admin/users/export`, {
      headers: {
        Authorization: `Bearer ${adminLogin.token}`,
      },
    })

    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type') || '', /text\/csv/)
    const text = await res.text()
    assert.match(text, /username,password,nickname,role,level,createdAt/)
    assert.match(text, /admin,123456,管理员,admin,高级/)
    assert.match(text, /vic,123456,蔡臻,user,中级/)
  } finally {
    await server.stop()
    fs.writeFileSync(usersFile, backups.users)
    fs.writeFileSync(attemptsFile, backups.attempts)
    fs.writeFileSync(wrongBookFile, backups.wrongBook)
  }
})

test('admin can download a csv template for bulk import', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    attempts: fs.readFileSync(attemptsFile, 'utf-8'),
    wrongBook: fs.readFileSync(wrongBookFile, 'utf-8'),
  }

  writeJson(usersFile, fixtures.users)
  writeJson(attemptsFile, fixtures.attempts)
  writeJson(wrongBookFile, fixtures.wrongBook)

  const server = await startServer()

  try {
    const adminLogin = await login(server.baseUrl, 'admin', '123456')
    const res = await fetch(`${server.baseUrl}/admin/users/template`, {
      headers: {
        Authorization: `Bearer ${adminLogin.token}`,
      },
    })

    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type') || '', /text\/csv/)
    const text = await res.text()
    assert.match(text, /username,password,nickname,role,level/)
    assert.match(text, /student01,123456,示例学员,user,试用/)
  } finally {
    await server.stop()
    fs.writeFileSync(usersFile, backups.users)
    fs.writeFileSync(attemptsFile, backups.attempts)
    fs.writeFileSync(wrongBookFile, backups.wrongBook)
  }
})

test('login token remains valid after server restart', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    attempts: fs.readFileSync(attemptsFile, 'utf-8'),
    wrongBook: fs.readFileSync(wrongBookFile, 'utf-8'),
  }

  writeJson(usersFile, fixtures.users)
  writeJson(attemptsFile, fixtures.attempts)
  writeJson(wrongBookFile, fixtures.wrongBook)

  const firstServer = await startServer()

  try {
    const firstLogin = await login(firstServer.baseUrl, 'admin', '123456')
    assert.equal(Boolean(firstLogin.token), true)
    await firstServer.stop()

    const secondServer = await startServer()

    try {
      const res = await fetch(`${secondServer.baseUrl}/users/admin`, {
        headers: {
          Authorization: `Bearer ${firstLogin.token}`,
        },
      })

      assert.equal(res.status, 200)
      const user = await res.json()
      assert.equal(user.username, 'admin')
    } finally {
      await secondServer.stop()
    }
  } finally {
    fs.writeFileSync(usersFile, backups.users)
    fs.writeFileSync(attemptsFile, backups.attempts)
    fs.writeFileSync(wrongBookFile, backups.wrongBook)
  }
})
