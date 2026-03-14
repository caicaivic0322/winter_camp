import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { parseQuestions } from '../lib/mdParser.js'
import { getExamMarkdownTemplate } from '../lib/examTemplate.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serverDir = path.resolve(__dirname, '..')
const dataDir = path.join(serverDir, 'data')
const usersFile = path.join(dataDir, 'users.json')
const examsFile = path.join(dataDir, 'exams.json')
const questionsFile = path.join(dataDir, 'questions.json')
const wrongBookFile = path.join(dataDir, 'wrong_book.json')
const attemptsFile = path.join(dataDir, 'attempts.json')

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
      level: '高级',
      createdAt: '2026-03-13T00:01:00.000Z',
    },
  },
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

async function startServer() {
  const port = String(9200 + Math.floor(Math.random() * 200))
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

async function login(baseUrl) {
  const res = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: '123456' }),
  })
  assert.equal(res.status, 200)
  return res.json()
}

async function loginAs(baseUrl, username, password) {
  const res = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  assert.equal(res.status, 200)
  return res.json()
}

test('exam markdown template can be parsed into valid questions', () => {
  const markdown = getExamMarkdownTemplate()
  const { metadata, questions } = parseQuestions(markdown)

  assert.equal(metadata.title, '示例考试模板')
  assert.equal(questions.length > 0, true)
  assert.equal(questions.some(item => item.section === 'single'), true)
  assert.equal(questions.some(item => item.section === 'judge'), true)
  assert.equal(questions.some(item => item.section === 'code_completion'), true)
})

test('admin can download exam markdown template', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    exams: fs.existsSync(examsFile) ? fs.readFileSync(examsFile, 'utf-8') : '[]',
    questions: fs.existsSync(questionsFile) ? fs.readFileSync(questionsFile, 'utf-8') : '[]',
    wrongBook: fs.existsSync(wrongBookFile) ? fs.readFileSync(wrongBookFile, 'utf-8') : '[]',
    attempts: fs.existsSync(attemptsFile) ? fs.readFileSync(attemptsFile, 'utf-8') : '[]',
  }

  writeJson(usersFile, fixtures.users)
  writeJson(examsFile, [])
  writeJson(questionsFile, [])
  writeJson(wrongBookFile, [])
  writeJson(attemptsFile, [])

  const server = await startServer()

  try {
    const auth = await login(server.baseUrl)
    const res = await fetch(`${server.baseUrl}/admin/exams/template-md`, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    })

    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type') || '', /text\/markdown|text\/plain/)
    const text = await res.text()
    assert.match(text, /title: 示例考试模板/)
    assert.match(text, /## 一、单选题/)
    assert.match(text, /## 二、判断题/)
    assert.match(text, /## 三、完善程序题/)
  } finally {
    await server.stop()
    fs.writeFileSync(usersFile, backups.users)
    fs.writeFileSync(examsFile, backups.exams)
    fs.writeFileSync(questionsFile, backups.questions)
    fs.writeFileSync(wrongBookFile, backups.wrongBook)
    fs.writeFileSync(attemptsFile, backups.attempts)
  }
})

test('admin can preview exam markdown before creating the exam', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    exams: fs.existsSync(examsFile) ? fs.readFileSync(examsFile, 'utf-8') : '[]',
    questions: fs.existsSync(questionsFile) ? fs.readFileSync(questionsFile, 'utf-8') : '[]',
    wrongBook: fs.existsSync(wrongBookFile) ? fs.readFileSync(wrongBookFile, 'utf-8') : '[]',
    attempts: fs.existsSync(attemptsFile) ? fs.readFileSync(attemptsFile, 'utf-8') : '[]',
  }

  writeJson(usersFile, fixtures.users)
  writeJson(examsFile, [])
  writeJson(questionsFile, [])
  writeJson(wrongBookFile, [])
  writeJson(attemptsFile, [])

  const server = await startServer()

  try {
    const auth = await login(server.baseUrl)
    const form = new FormData()
    form.append('file', new Blob([getExamMarkdownTemplate()], { type: 'text/markdown' }), 'exam-template.md')

    const res = await fetch(`${server.baseUrl}/admin/exams/preview`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
      body: form,
    })

    assert.equal(res.status, 200)
    const data = await res.json()
    assert.equal(data.title, '示例考试模板')
    assert.equal(data.questionCount > 0, true)
    assert.equal(data.sectionCounts.single > 0, true)
    assert.equal(data.sectionCounts.judge > 0, true)
    assert.equal(data.sectionCounts.code_completion > 0, true)
    assert.equal(Array.isArray(data.previewQuestions), true)
    assert.equal(data.previewQuestions.length > 0, true)

    const questionsAfter = JSON.parse(fs.readFileSync(questionsFile, 'utf-8'))
    const examsAfter = JSON.parse(fs.readFileSync(examsFile, 'utf-8'))
    assert.equal(questionsAfter.length, 0)
    assert.equal(examsAfter.length, 0)
  } finally {
    await server.stop()
    fs.writeFileSync(usersFile, backups.users)
    fs.writeFileSync(examsFile, backups.exams)
    fs.writeFileSync(questionsFile, backups.questions)
    fs.writeFileSync(wrongBookFile, backups.wrongBook)
    fs.writeFileSync(attemptsFile, backups.attempts)
  }
})

test('submit returns wrong-question analyses and wrong-book stays deduplicated by question', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    exams: fs.existsSync(examsFile) ? fs.readFileSync(examsFile, 'utf-8') : '[]',
    questions: fs.existsSync(questionsFile) ? fs.readFileSync(questionsFile, 'utf-8') : '[]',
    wrongBook: fs.existsSync(wrongBookFile) ? fs.readFileSync(wrongBookFile, 'utf-8') : '[]',
    attempts: fs.existsSync(attemptsFile) ? fs.readFileSync(attemptsFile, 'utf-8') : '[]',
  }

  writeJson(usersFile, fixtures.users)
  writeJson(examsFile, [
    {
      id: 'exam-1',
      title: '样例考试',
      startTime: '2025-01-01T00:00:00.000Z',
      endTime: '2099-01-01T00:00:00.000Z',
      duration: 1800,
      questionCount: 2,
      totalScore: 100,
      bankIds: ['bank-1'],
      levelRequired: '初级',
      createdAt: '2026-03-13T00:00:00.000Z',
      status: 'scheduled',
    },
  ])
  writeJson(questionsFile, [
    {
      id: 'q-1',
      bankId: 'bank-1',
      order: 1,
      title: '哪一个是 C++ 的输出流对象？',
      type: 'single',
      section: 'single',
      score: 50,
      answer: 'B',
      options: [
        { label: 'A', text: 'cin' },
        { label: 'B', text: 'cout' },
      ],
    },
    {
      id: 'q-2',
      bankId: 'bank-1',
      order: 2,
      title: 'vector 可以动态扩容。（　√　）',
      type: 'judge',
      section: 'judge',
      score: 50,
      answer: 'T',
      options: [],
    },
  ])
  writeJson(wrongBookFile, [])
  writeJson(attemptsFile, [])

  const server = await startServer()

  try {
    const auth = await loginAs(server.baseUrl, 'vic', '123456')

    const submitOnce = async () => {
      const res = await fetch(`${server.baseUrl}/exams/exam-1/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          answers: {
            'q-1': 'A',
            'q-2': 'T',
          },
          questionIds: ['q-1', 'q-2'],
        }),
      })
      assert.equal(res.status, 200)
      return res.json()
    }

    const first = await submitOnce()
    assert.equal(Array.isArray(first.wrongQuestions), true)
    assert.equal(first.wrongQuestions.length, 1)
    assert.equal(first.wrongQuestions[0].questionId, 'q-1')
    assert.equal(typeof first.wrongQuestions[0].analysis, 'string')
    assert.equal(first.wrongQuestions[0].analysis.length > 0, true)

    const wrongBookRes = await fetch(`${server.baseUrl}/my/wrong-book`, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    })
    assert.equal(wrongBookRes.status, 200)
    const wrongBook = await wrongBookRes.json()
    assert.equal(wrongBook.length, 1)
    assert.equal(wrongBook[0].questionId, 'q-1')
    assert.equal(wrongBook[0].wrongCount, 1)
    assert.equal(typeof wrongBook[0].analysis, 'string')
    assert.equal(wrongBook[0].analysis.length > 0, true)
  } finally {
    await server.stop()
    fs.writeFileSync(usersFile, backups.users)
    fs.writeFileSync(examsFile, backups.exams)
    fs.writeFileSync(questionsFile, backups.questions)
    fs.writeFileSync(wrongBookFile, backups.wrongBook)
    fs.writeFileSync(attemptsFile, backups.attempts)
  }
})

test('unanswered questions do not enter wrong-book or wrong-question analyses', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    exams: fs.existsSync(examsFile) ? fs.readFileSync(examsFile, 'utf-8') : '[]',
    questions: fs.existsSync(questionsFile) ? fs.readFileSync(questionsFile, 'utf-8') : '[]',
    wrongBook: fs.existsSync(wrongBookFile) ? fs.readFileSync(wrongBookFile, 'utf-8') : '[]',
    attempts: fs.existsSync(attemptsFile) ? fs.readFileSync(attemptsFile, 'utf-8') : '[]',
  }

  writeJson(usersFile, fixtures.users)
  writeJson(examsFile, [
    {
      id: 'exam-2',
      title: '留空题样例考试',
      startTime: '2025-01-01T00:00:00.000Z',
      endTime: '2099-01-01T00:00:00.000Z',
      duration: 1800,
      questionCount: 2,
      totalScore: 100,
      bankIds: ['bank-2'],
      levelRequired: '初级',
      createdAt: '2026-03-13T00:10:00.000Z',
      status: 'scheduled',
    },
  ])
  writeJson(questionsFile, [
    {
      id: 'q-3',
      bankId: 'bank-2',
      order: 1,
      title: 'C++ 中用于输入的流对象是？',
      type: 'single',
      section: 'single',
      score: 50,
      answer: 'A',
      options: [
        { label: 'A', text: 'cin' },
        { label: 'B', text: 'cout' },
      ],
    },
    {
      id: 'q-4',
      bankId: 'bank-2',
      order: 2,
      title: '下面说法是否正确：数组下标从 0 开始。（　√　）',
      type: 'judge',
      section: 'judge',
      score: 50,
      answer: 'T',
      options: [],
    },
  ])
  writeJson(wrongBookFile, [])
  writeJson(attemptsFile, [])

  const server = await startServer()

  try {
    const auth = await loginAs(server.baseUrl, 'vic', '123456')
    const submitRes = await fetch(`${server.baseUrl}/exams/exam-2/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({
        answers: {
          'q-3': 'B',
        },
        questionIds: ['q-3', 'q-4'],
      }),
    })

    assert.equal(submitRes.status, 200)
    const data = await submitRes.json()
    assert.equal(Array.isArray(data.wrongQuestions), true)
    assert.equal(data.wrongQuestions.length, 1)
    assert.equal(data.wrongQuestions[0].questionId, 'q-3')

    const wrongBookRes = await fetch(`${server.baseUrl}/my/wrong-book`, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    })
    assert.equal(wrongBookRes.status, 200)
    const wrongBook = await wrongBookRes.json()
    assert.equal(wrongBook.length, 1)
    assert.equal(wrongBook[0].questionId, 'q-3')
  } finally {
    await server.stop()
    fs.writeFileSync(usersFile, backups.users)
    fs.writeFileSync(examsFile, backups.exams)
    fs.writeFileSync(questionsFile, backups.questions)
    fs.writeFileSync(wrongBookFile, backups.wrongBook)
    fs.writeFileSync(attemptsFile, backups.attempts)
  }
})

test('submitted exam disappears from available list and cannot be started again', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    exams: fs.existsSync(examsFile) ? fs.readFileSync(examsFile, 'utf-8') : '[]',
    questions: fs.existsSync(questionsFile) ? fs.readFileSync(questionsFile, 'utf-8') : '[]',
    wrongBook: fs.existsSync(wrongBookFile) ? fs.readFileSync(wrongBookFile, 'utf-8') : '[]',
    attempts: fs.existsSync(attemptsFile) ? fs.readFileSync(attemptsFile, 'utf-8') : '[]',
  }

  writeJson(usersFile, fixtures.users)
  writeJson(examsFile, [
    {
      id: 'exam-once',
      title: '单次考试样例',
      startTime: '2025-01-01T00:00:00.000Z',
      endTime: '2099-01-01T00:00:00.000Z',
      duration: 1800,
      questionCount: 1,
      totalScore: 100,
      bankIds: ['bank-once'],
      levelRequired: '初级',
      createdAt: '2026-03-13T01:00:00.000Z',
      status: 'scheduled',
    },
  ])
  writeJson(questionsFile, [
    {
      id: 'q-once-1',
      bankId: 'bank-once',
      order: 1,
      title: 'C++ 中主函数名称是？',
      type: 'single',
      section: 'single',
      score: 100,
      answer: 'A',
      options: [
        { label: 'A', text: 'main' },
        { label: 'B', text: 'start' },
      ],
    },
  ])
  writeJson(wrongBookFile, [])
  writeJson(attemptsFile, [])

  const server = await startServer()

  try {
    const auth = await loginAs(server.baseUrl, 'vic', '123456')

    const availableBefore = await fetch(`${server.baseUrl}/exams/available`, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    })
    assert.equal(availableBefore.status, 200)
    const beforeList = await availableBefore.json()
    assert.equal(beforeList.some(item => item.id === 'exam-once'), true)

    const submitRes = await fetch(`${server.baseUrl}/exams/exam-once/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({
        answers: {
          'q-once-1': 'A',
        },
        questionIds: ['q-once-1'],
      }),
    })
    assert.equal(submitRes.status, 200)

    const availableAfter = await fetch(`${server.baseUrl}/exams/available`, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    })
    assert.equal(availableAfter.status, 200)
    const afterList = await availableAfter.json()
    assert.equal(afterList.some(item => item.id === 'exam-once'), false)

    const startAgain = await fetch(`${server.baseUrl}/exams/exam-once/start`, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    })
    assert.equal(startAgain.status, 409)
    const startAgainBody = await startAgain.json()
    assert.equal(startAgainBody.error, 'already_submitted')
  } finally {
    await server.stop()
    fs.writeFileSync(usersFile, backups.users)
    fs.writeFileSync(examsFile, backups.exams)
    fs.writeFileSync(questionsFile, backups.questions)
    fs.writeFileSync(wrongBookFile, backups.wrongBook)
    fs.writeFileSync(attemptsFile, backups.attempts)
  }
})

test('admin exams list includes active and expired exams together', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    exams: fs.existsSync(examsFile) ? fs.readFileSync(examsFile, 'utf-8') : '[]',
    questions: fs.existsSync(questionsFile) ? fs.readFileSync(questionsFile, 'utf-8') : '[]',
    wrongBook: fs.existsSync(wrongBookFile) ? fs.readFileSync(wrongBookFile, 'utf-8') : '[]',
    attempts: fs.existsSync(attemptsFile) ? fs.readFileSync(attemptsFile, 'utf-8') : '[]',
  }

  writeJson(usersFile, fixtures.users)
  writeJson(examsFile, [
    {
      id: 'exam-active-admin',
      title: '管理员可见进行中考试',
      startTime: '2025-01-01T00:00:00.000Z',
      endTime: '2099-01-01T00:00:00.000Z',
      duration: 1800,
      questionCount: 10,
      totalScore: 100,
      bankIds: ['bank-a'],
      levelRequired: '初级',
      createdAt: '2026-03-13T03:00:00.000Z',
      status: 'scheduled',
    },
    {
      id: 'exam-expired-admin',
      title: '管理员可见已过期考试',
      startTime: '2024-01-01T00:00:00.000Z',
      endTime: '2024-01-02T00:00:00.000Z',
      duration: 1800,
      questionCount: 10,
      totalScore: 100,
      bankIds: ['bank-b'],
      levelRequired: '初级',
      createdAt: '2026-03-13T03:01:00.000Z',
      status: 'scheduled',
    },
  ])
  writeJson(questionsFile, [])
  writeJson(wrongBookFile, [])
  writeJson(attemptsFile, [])

  const server = await startServer()

  try {
    const auth = await login(server.baseUrl)
    const res = await fetch(`${server.baseUrl}/admin/exams`, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    })
    assert.equal(res.status, 200)
    const exams = await res.json()
    assert.equal(exams.some(item => item.id === 'exam-active-admin'), true)
    assert.equal(exams.some(item => item.id === 'exam-expired-admin'), true)
  } finally {
    await server.stop()
    fs.writeFileSync(usersFile, backups.users)
    fs.writeFileSync(examsFile, backups.exams)
    fs.writeFileSync(questionsFile, backups.questions)
    fs.writeFileSync(wrongBookFile, backups.wrongBook)
    fs.writeFileSync(attemptsFile, backups.attempts)
  }
})
