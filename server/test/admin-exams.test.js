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
const attemptsFile = path.join(dataDir, 'attempts.json')
const legacyWrongBookFile = path.join(dataDir, 'wrong_book.json')

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

function restoreOptionalFile(file, backup) {
  if (backup === null) {
    if (fs.existsSync(file)) fs.unlinkSync(file)
    return
  }
  fs.writeFileSync(file, backup)
}

async function waitFor(assertion, { timeout = 5000, interval = 50 } = {}) {
  const startedAt = Date.now()
  let lastError = null

  while ((Date.now() - startedAt) < timeout) {
    try {
      return await assertion()
    } catch (error) {
      lastError = error
      await new Promise(resolve => setTimeout(resolve, interval))
    }
  }

  throw lastError || new Error('waitFor timeout')
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

test('parser preserves quoted option text for code output questions', () => {
  const markdown = `
## 一、单选题

**4.** 若执行下面代码：
\`\`\`python
name = "Python"
print("Hello,", name)
\`\`\`
A. \`Hello,name\`
B. \`Hello, Python\`
C. \`"Hello, Python"\`
D. 程序报错
`

  const { questions } = parseQuestions(markdown)
  assert.equal(questions.length, 1)
  assert.equal(questions[0].options[1].text, 'Hello, Python')
  assert.equal(questions[0].options[2].text, '"Hello, Python"')
})

test('parser supports answer summary, exponent operators, and 程序完善题 sections', () => {
  const markdown = `
## 一、单选题（每题 2 分，共 4 分）

**1.** 阅读下面代码，输出结果是（　　）

\`\`\`python
print(2 ** 3 ** 2)
\`\`\`

A. 64
B. 512
C. 36
D. 256

## 二、判断题（每题 2 分，共 2 分）

**1.** 表达式 \`2 ** 3 ** 2\` 的值是 \`64\`。（　×　）

## 三、程序完善题（每题 5 分，共 5 分）

### 第1题：补全幂运算表达式

\`\`\`python
result = ______①
print(result)
\`\`\`

**① 的备选项：**
A. \`2 ** 3 ** 2\`
B. \`(2 ** 3) ** 2\`
C. \`2 * 3 ** 2\`
D. \`2 ** 3 * 2\`

## 参考答案汇总

**单选题：**
1.B

**判断题：**
1.×

**程序完善题：**
①A
`

  const { questions } = parseQuestions(markdown)
  assert.equal(questions.length, 3)
  assert.deepEqual(questions.map(item => item.section), ['single', 'judge', 'code_completion'])
  assert.equal(questions[0].answer, 'B')
  assert.equal(questions[1].answer, 'F')
  assert.equal(questions[2].answer, 'A')
  assert.match(questions[1].title, /2 \*\* 3 \*\* 2/)
  assert.match(questions[2].options[0].text, /2 \*\* 3 \*\* 2/)
})

test('parser maps code completion answers for circled blanks beyond ④', () => {
  const markdown = `
## 三、程序完善题（每题 5 分，共 20 分）

### 第1题：题目1
\`\`\`python
a = ______①
\`\`\`
**① 的备选项：**
A. 1
B. 2
C. 3
D. 4

### 第2题：题目2
\`\`\`python
b = ______②
\`\`\`
**② 的备选项：**
A. 1
B. 2
C. 3
D. 4

### 第3题：题目3
\`\`\`python
c = ______③
\`\`\`
**③ 的备选项：**
A. 1
B. 2
C. 3
D. 4

### 第4题：题目4
\`\`\`python
d = ______④
\`\`\`
**④ 的备选项：**
A. 1
B. 2
C. 3
D. 4

### 第5题：题目5
\`\`\`python
e = ______⑤
\`\`\`
**⑤ 的备选项：**
A. 1
B. 2
C. 3
D. 4

### 第6题：题目6
\`\`\`python
f = ______⑥
\`\`\`
**⑥ 的备选项：**
A. 1
B. 2
C. 3
D. 4

### 第7题：题目7
\`\`\`python
g = ______⑦
\`\`\`
**⑦ 的备选项：**
A. 1
B. 2
C. 3
D. 4

### 第8题：题目8
\`\`\`python
h = ______⑧
\`\`\`
**⑧ 的备选项：**
A. 1
B. 2
C. 3
D. 4

## 参考答案汇总

**程序完善题：**
①A　②B　③C　④D　⑤B　⑥C　⑦A　⑧D
`

  const { questions } = parseQuestions(markdown)
  assert.equal(questions.length, 8)
  assert.deepEqual(
    questions.map(item => item.answer),
    ['A', 'B', 'C', 'D', 'B', 'C', 'A', 'D']
  )
})

test('admin can download exam markdown template', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    exams: fs.existsSync(examsFile) ? fs.readFileSync(examsFile, 'utf-8') : '[]',
    questions: fs.existsSync(questionsFile) ? fs.readFileSync(questionsFile, 'utf-8') : '[]',
    attempts: fs.existsSync(attemptsFile) ? fs.readFileSync(attemptsFile, 'utf-8') : '[]',
  }

  writeJson(usersFile, fixtures.users)
  writeJson(examsFile, [])
  writeJson(questionsFile, [])
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
    assert.match(text, /## 三、程序完善题/)
    assert.match(text, /## 参考答案汇总/)
  } finally {
    await server.stop()
    fs.writeFileSync(usersFile, backups.users)
    fs.writeFileSync(examsFile, backups.exams)
    fs.writeFileSync(questionsFile, backups.questions)
    fs.writeFileSync(attemptsFile, backups.attempts)
  }
})

test('exam result export falls back to stored question numbers when exam metadata is missing', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    exams: fs.readFileSync(examsFile, 'utf-8'),
    questions: fs.readFileSync(questionsFile, 'utf-8'),
    attempts: fs.readFileSync(attemptsFile, 'utf-8'),
  }

  writeJson(usersFile, fixtures.users)
  writeJson(examsFile, [])
  writeJson(questionsFile, [])
  writeJson(attemptsFile, [
    {
      id: 'attempt-missing',
      examId: 'missing-exam',
      examTitle: '历史阶段测试',
      username: 'vic',
      score: 80,
      rawScore: 80,
      rawTotal: 100,
      totalScore: 100,
      at: '2026-03-18T00:25:53.000Z',
      submittedAt: '2026-03-18T00:25:53.000Z',
      durationSeconds: 0,
      wrongQuestionIds: ['missing-q-2'],
      wrongQuestions: [
        {
          questionId: 'missing-q-2',
          questionNumber: 2,
          title: '第二题',
          yourAnswer: 'A',
          correctAnswer: 'B',
          analysis: '示例解析',
        },
      ],
      answeredCount: 1,
    },
  ])

  const server = await startServer()

  try {
    const admin = await login(server.baseUrl)
    const res = await fetch(`${server.baseUrl}/admin/exam-results?student=vic`, {
      headers: {
        Authorization: `Bearer ${admin.token}`,
      },
    })

    assert.equal(res.status, 200)
    const data = await res.json()
    assert.equal(data.examAttempts.length, 1)
    assert.equal(data.examAttempts[0].examTitle, '历史阶段测试')
    assert.deepEqual(data.examAttempts[0].wrongQuestionNumbers, [2])
  } finally {
    await server.stop()
    fs.writeFileSync(usersFile, backups.users)
    fs.writeFileSync(examsFile, backups.exams)
    fs.writeFileSync(questionsFile, backups.questions)
    fs.writeFileSync(attemptsFile, backups.attempts)
  }
})

test('student exam detail falls back to legacy wrong book analysis for historical attempts', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    exams: fs.readFileSync(examsFile, 'utf-8'),
    questions: fs.readFileSync(questionsFile, 'utf-8'),
    attempts: fs.readFileSync(attemptsFile, 'utf-8'),
    legacyWrongBook: fs.existsSync(legacyWrongBookFile) ? fs.readFileSync(legacyWrongBookFile, 'utf-8') : null,
  }

  writeJson(usersFile, fixtures.users)
  writeJson(examsFile, [])
  writeJson(questionsFile, [
    {
      id: 'legacy-q-1',
      title: '下面哪个选项是正确答案？',
      type: 'single',
      options: [
        { label: 'A', text: '错误选项A' },
        { label: 'B', text: '正确选项B' },
        { label: 'C', text: '干扰项C' },
      ],
    },
  ])
  writeJson(attemptsFile, [
    {
      id: 1773820295926,
      examId: 'legacy-exam-1',
      examTitle: '历史考试',
      username: 'vic',
      score: 60,
      rawScore: 60,
      rawTotal: 100,
      totalScore: 100,
      answeredCount: 1,
      wrongQuestionIds: ['legacy-q-1'],
      submittedAt: '2026-03-18T10:00:00.000Z',
      at: '2026-03-18T10:00:00.000Z',
      status: 'graded',
    },
  ])
  writeJson(legacyWrongBookFile, [
    {
      username: 'vic',
      examId: 'legacy-exam-1',
      questionId: 'legacy-q-1',
      questionTitle: '下面哪个选项是正确答案？',
      yourAnswer: 'A',
      correctAnswer: 'B',
      at: '2026-03-18T10:00:00.000Z',
      analysis: '这是遗留错题本里的解析。',
    },
  ])

  const server = await startServer()

  try {
    const student = await loginAs(server.baseUrl, 'vic', '123456')
    const detailRes = await fetch(`${server.baseUrl}/my/exam-results/1773820295926`, {
      headers: {
        Authorization: `Bearer ${student.token}`,
      },
    })

    assert.equal(detailRes.status, 200)
    const detail = await detailRes.json()
    assert.equal(detail.attemptId, '1773820295926')
    assert.equal(detail.wrongQuestions.length, 1)
    assert.equal(detail.wrongQuestions[0].title, '下面哪个选项是正确答案？')
    assert.equal(detail.wrongQuestions[0].analysis, '这是遗留错题本里的解析。')
    assert.equal(detail.wrongQuestions[0].options.length, 3)
    assert.equal(detail.wrongQuestions[0].options[1].label, 'B')

    const storedAttempts = JSON.parse(fs.readFileSync(attemptsFile, 'utf-8'))
    assert.equal(Array.isArray(storedAttempts[0].wrongQuestions), true)
    assert.equal(storedAttempts[0].wrongQuestions.length, 1)
    assert.equal(storedAttempts[0].wrongQuestions[0].analysis, '这是遗留错题本里的解析。')
    assert.equal(storedAttempts[0].wrongQuestions[0].options.length, 3)
  } finally {
    await server.stop()
    fs.writeFileSync(usersFile, backups.users)
    fs.writeFileSync(examsFile, backups.exams)
    fs.writeFileSync(questionsFile, backups.questions)
    fs.writeFileSync(attemptsFile, backups.attempts)
    restoreOptionalFile(legacyWrongBookFile, backups.legacyWrongBook)
  }
})

test('student exam detail backfills options from question bank for stored wrong questions', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    exams: fs.readFileSync(examsFile, 'utf-8'),
    questions: fs.readFileSync(questionsFile, 'utf-8'),
    attempts: fs.readFileSync(attemptsFile, 'utf-8'),
  }

  writeJson(usersFile, fixtures.users)
  writeJson(examsFile, [])
  writeJson(questionsFile, [
    {
      id: 'stored-q-1',
      title: '以下哪个选项是正确的？',
      type: 'single',
      answer: 'C',
      options: [
        { label: 'A', text: '错误选项A' },
        { label: 'B', text: '错误选项B' },
        { label: 'C', text: '正确选项C' },
      ],
    },
  ])
  writeJson(attemptsFile, [
    {
      id: 'stored-attempt-1',
      examId: 'stored-exam-1',
      examTitle: '已迁移历史考试',
      username: 'vic',
      score: 60,
      rawScore: 60,
      rawTotal: 100,
      totalScore: 100,
      answeredCount: 1,
      wrongQuestionIds: ['stored-q-1'],
      submittedAt: '2026-03-18T12:00:00.000Z',
      at: '2026-03-18T12:00:00.000Z',
      status: 'graded',
      wrongQuestions: [
        {
          questionId: 'stored-q-1',
          questionNumber: 1,
          title: '以下哪个选项是正确的？',
          options: [],
          yourAnswer: 'A',
          correctAnswer: 'C',
          analysis: '这是已迁移记录里的解析。',
        },
      ],
    },
  ])

  const server = await startServer()

  try {
    const student = await loginAs(server.baseUrl, 'vic', '123456')
    const detailRes = await fetch(`${server.baseUrl}/my/exam-results/stored-attempt-1`, {
      headers: {
        Authorization: `Bearer ${student.token}`,
      },
    })

    assert.equal(detailRes.status, 200)
    const detail = await detailRes.json()
    assert.equal(detail.wrongQuestions.length, 1)
    assert.equal(detail.wrongQuestions[0].options.length, 3)
    assert.equal(detail.wrongQuestions[0].correctAnswer, 'C')

    const storedAttempts = JSON.parse(fs.readFileSync(attemptsFile, 'utf-8'))
    assert.equal(storedAttempts[0].wrongQuestions[0].options.length, 3)
  } finally {
    await server.stop()
    fs.writeFileSync(usersFile, backups.users)
    fs.writeFileSync(examsFile, backups.exams)
    fs.writeFileSync(questionsFile, backups.questions)
    fs.writeFileSync(attemptsFile, backups.attempts)
  }
})

test('admin can preview exam markdown before creating the exam', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    exams: fs.existsSync(examsFile) ? fs.readFileSync(examsFile, 'utf-8') : '[]',
    questions: fs.existsSync(questionsFile) ? fs.readFileSync(questionsFile, 'utf-8') : '[]',
    attempts: fs.existsSync(attemptsFile) ? fs.readFileSync(attemptsFile, 'utf-8') : '[]',
  }

  writeJson(usersFile, fixtures.users)
  writeJson(examsFile, [])
  writeJson(questionsFile, [])
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
    fs.writeFileSync(attemptsFile, backups.attempts)
  }
})

test('submit queues async grading and stores final wrong-question analyses on attempt record', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    exams: fs.existsSync(examsFile) ? fs.readFileSync(examsFile, 'utf-8') : '[]',
    questions: fs.existsSync(questionsFile) ? fs.readFileSync(questionsFile, 'utf-8') : '[]',
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
  writeJson(attemptsFile, [])

  const server = await startServer()

  try {
    const auth = await loginAs(server.baseUrl, 'vic', '123456')

    const submitRes = await fetch(`${server.baseUrl}/exams/exam-1/submit`, {
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
    assert.equal(submitRes.status, 202)

    const queued = await submitRes.json()
    assert.equal(queued.success, true)
    assert.equal(queued.status, 'pending')
    assert.equal(typeof queued.attemptId, 'string')
    assert.equal(queued.attemptId.length > 0, true)

    const initialAttempts = JSON.parse(fs.readFileSync(attemptsFile, 'utf-8'))
    assert.equal(initialAttempts.length, 1)
    assert.equal(['pending', 'grading'].includes(initialAttempts[0].status), true)
    assert.equal(initialAttempts[0].score, null)
    assert.equal(Array.isArray(initialAttempts[0].gradingPayload?.questionIds), true)
    assert.equal(initialAttempts[0].gradingPayload.questionIds.length, 2)

    await waitFor(() => {
      const attempts = JSON.parse(fs.readFileSync(attemptsFile, 'utf-8'))
      assert.equal(attempts[0].status, 'graded')
      assert.equal(attempts[0].score, 50)
      assert.equal(Array.isArray(attempts[0].wrongQuestions), true)
      assert.equal(attempts[0].wrongQuestions.length, 1)
      assert.equal(attempts[0].wrongQuestions[0].questionId, 'q-1')
      assert.equal(typeof attempts[0].wrongQuestions[0].analysis, 'string')
      assert.equal(attempts[0].wrongQuestions[0].analysis.length > 0, true)
    })
  } finally {
    await server.stop()
    fs.writeFileSync(usersFile, backups.users)
    fs.writeFileSync(examsFile, backups.exams)
    fs.writeFileSync(questionsFile, backups.questions)
    fs.writeFileSync(attemptsFile, backups.attempts)
  }
})

test('student can view exam score list and details after async grading finishes', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    exams: fs.existsSync(examsFile) ? fs.readFileSync(examsFile, 'utf-8') : '[]',
    questions: fs.existsSync(questionsFile) ? fs.readFileSync(questionsFile, 'utf-8') : '[]',
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

    assert.equal(submitRes.status, 202)
    const queued = await submitRes.json()
    assert.equal(queued.status, 'pending')

    await waitFor(async () => {
      const listRes = await fetch(`${server.baseUrl}/my/exam-results`, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      })
      assert.equal(listRes.status, 200)
      const list = await listRes.json()
      assert.equal(list.length, 1)
      assert.equal(list[0].attemptId, queued.attemptId)
      assert.equal(list[0].status, 'graded')
      assert.equal(list[0].score, 0)
      assert.equal(list[0].examTitle, '留空题样例考试')
    })

    const detailRes = await fetch(`${server.baseUrl}/my/exam-results/${queued.attemptId}`, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    })
    assert.equal(detailRes.status, 200)
    const detail = await detailRes.json()
    assert.equal(detail.attemptId, queued.attemptId)
    assert.equal(detail.status, 'graded')
    assert.equal(detail.score, 0)
    assert.equal(Array.isArray(detail.wrongQuestions), true)
    assert.equal(detail.wrongQuestions.length, 1)
    assert.equal(detail.wrongQuestions[0].questionId, 'q-3')
    assert.equal(detail.wrongQuestions[0].title, 'C++ 中用于输入的流对象是？')
    assert.equal(typeof detail.wrongQuestions[0].analysis, 'string')
    assert.equal(detail.wrongQuestions[0].analysis.length > 0, true)
  } finally {
    await server.stop()
    fs.writeFileSync(usersFile, backups.users)
    fs.writeFileSync(examsFile, backups.exams)
    fs.writeFileSync(questionsFile, backups.questions)
    fs.writeFileSync(attemptsFile, backups.attempts)
  }
})

test('submitted exam disappears from available list and cannot be started again', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    exams: fs.existsSync(examsFile) ? fs.readFileSync(examsFile, 'utf-8') : '[]',
    questions: fs.existsSync(questionsFile) ? fs.readFileSync(questionsFile, 'utf-8') : '[]',
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
    assert.equal(submitRes.status, 202)

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
    fs.writeFileSync(attemptsFile, backups.attempts)
  }
})

test('exam audience supports exact multi-level visibility instead of threshold access', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    exams: fs.existsSync(examsFile) ? fs.readFileSync(examsFile, 'utf-8') : '[]',
    questions: fs.existsSync(questionsFile) ? fs.readFileSync(questionsFile, 'utf-8') : '[]',
    attempts: fs.existsSync(attemptsFile) ? fs.readFileSync(attemptsFile, 'utf-8') : '[]',
  }

  writeJson(usersFile, {
    admin: fixtures.users.admin,
    beginner: {
      username: 'beginner',
      password: '123456',
      nickname: '初级学员',
      role: 'user',
      level: '初级',
      createdAt: '2026-03-13T01:05:00.000Z',
    },
    vic: fixtures.users.vic,
    senior: {
      username: 'senior',
      password: '123456',
      nickname: '高级学员',
      role: 'user',
      level: '高级',
      createdAt: '2026-03-13T01:06:00.000Z',
    },
    pro: {
      username: 'pro',
      password: '123456',
      nickname: '竞赛学员',
      role: 'user',
      level: '竞赛',
      createdAt: '2026-03-13T01:07:00.000Z',
    },
  })
  writeJson(examsFile, [
    {
      id: 'exam-audience',
      title: '定向等级考试',
      startTime: '2025-01-01T00:00:00.000Z',
      endTime: '2099-01-01T00:00:00.000Z',
      duration: 1800,
      questionCount: 1,
      totalScore: 100,
      bankIds: ['bank-audience'],
      levelRequireds: ['中级', '高级', '竞赛'],
      createdAt: '2026-03-13T01:08:00.000Z',
      status: 'scheduled',
    },
  ])
  writeJson(questionsFile, [
    {
      id: 'q-audience-1',
      bankId: 'bank-audience',
      order: 1,
      title: '哪一个函数是程序入口？',
      type: 'single',
      section: 'single',
      score: 100,
      answer: 'A',
      options: [
        { label: 'A', text: 'main' },
        { label: 'B', text: 'print' },
      ],
    },
  ])
  writeJson(attemptsFile, [])

  const server = await startServer()

  try {
    const beginner = await loginAs(server.baseUrl, 'beginner', '123456')
    const intermediate = await loginAs(server.baseUrl, 'vic', '123456')
    const senior = await loginAs(server.baseUrl, 'senior', '123456')
    const pro = await loginAs(server.baseUrl, 'pro', '123456')

    const beginnerListRes = await fetch(`${server.baseUrl}/exams/available`, {
      headers: { Authorization: `Bearer ${beginner.token}` },
    })
    assert.equal(beginnerListRes.status, 200)
    const beginnerList = await beginnerListRes.json()
    assert.equal(beginnerList.some(item => item.id === 'exam-audience'), false)

    for (const auth of [intermediate, senior, pro]) {
      const listRes = await fetch(`${server.baseUrl}/exams/available`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      })
      assert.equal(listRes.status, 200)
      const list = await listRes.json()
      assert.equal(list.some(item => item.id === 'exam-audience'), true)
    }

    const deniedStart = await fetch(`${server.baseUrl}/exams/exam-audience/start`, {
      headers: { Authorization: `Bearer ${beginner.token}` },
    })
    assert.equal(deniedStart.status, 403)

    const allowedStart = await fetch(`${server.baseUrl}/exams/exam-audience/start`, {
      headers: { Authorization: `Bearer ${intermediate.token}` },
    })
    assert.equal(allowedStart.status, 200)
  } finally {
    await server.stop()
    fs.writeFileSync(usersFile, backups.users)
    fs.writeFileSync(examsFile, backups.exams)
    fs.writeFileSync(questionsFile, backups.questions)
    fs.writeFileSync(attemptsFile, backups.attempts)
  }
})

test('submit stores attempt timing metadata and wrong question ids', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    exams: fs.existsSync(examsFile) ? fs.readFileSync(examsFile, 'utf-8') : '[]',
    questions: fs.existsSync(questionsFile) ? fs.readFileSync(questionsFile, 'utf-8') : '[]',
    attempts: fs.existsSync(attemptsFile) ? fs.readFileSync(attemptsFile, 'utf-8') : '[]',
  }

  writeJson(usersFile, fixtures.users)
  writeJson(examsFile, [
    {
      id: 'exam-meta',
      title: '记录元数据考试',
      startTime: '2025-01-01T00:00:00.000Z',
      endTime: '2099-01-01T00:00:00.000Z',
      duration: 1800,
      questionCount: 2,
      totalScore: 100,
      bankIds: ['bank-meta'],
      levelRequired: '初级',
      createdAt: '2026-03-13T01:10:00.000Z',
      status: 'scheduled',
    },
  ])
  writeJson(questionsFile, [
    {
      id: 'q-meta-1',
      bankId: 'bank-meta',
      order: 1,
      title: '下列哪个关键字用于循环？',
      type: 'single',
      section: 'single',
      score: 50,
      answer: 'A',
      options: [
        { label: 'A', text: 'for' },
        { label: 'B', text: 'cout' },
      ],
    },
    {
      id: 'q-meta-2',
      bankId: 'bank-meta',
      order: 2,
      title: 'true 表示真。（　√　）',
      type: 'judge',
      section: 'judge',
      score: 50,
      answer: 'T',
      options: [],
    },
  ])
  writeJson(attemptsFile, [])

  const server = await startServer()

  try {
    const auth = await loginAs(server.baseUrl, 'vic', '123456')
    const startedAt = '2026-03-18T08:00:00.000Z'
    const submittedAt = '2026-03-18T08:12:30.000Z'

    const submitRes = await fetch(`${server.baseUrl}/exams/exam-meta/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({
        answers: {
          'q-meta-1': 'B',
          'q-meta-2': 'T',
        },
        questionIds: ['q-meta-1', 'q-meta-2'],
        startedAt,
        submittedAt,
      }),
    })

    assert.equal(submitRes.status, 202)

    await waitFor(() => {
      const attempts = JSON.parse(fs.readFileSync(attemptsFile, 'utf-8'))
      assert.equal(attempts.length, 1)
      assert.equal(attempts[0].startedAt, startedAt)
      assert.equal(attempts[0].submittedAt, submittedAt)
      assert.equal(attempts[0].durationSeconds, 750)
      assert.equal(attempts[0].answeredCount, 2)
    })

    await waitFor(() => {
      const nextAttempts = JSON.parse(fs.readFileSync(attemptsFile, 'utf-8'))
      assert.equal(nextAttempts[0].status, 'graded')
      assert.deepEqual(nextAttempts[0].wrongQuestionIds, ['q-meta-1'])
    })
  } finally {
    await server.stop()
    fs.writeFileSync(usersFile, backups.users)
    fs.writeFileSync(examsFile, backups.exams)
    fs.writeFileSync(questionsFile, backups.questions)
    fs.writeFileSync(attemptsFile, backups.attempts)
  }
})

test('admin can view exam score analytics and student trends', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    exams: fs.existsSync(examsFile) ? fs.readFileSync(examsFile, 'utf-8') : '[]',
    questions: fs.existsSync(questionsFile) ? fs.readFileSync(questionsFile, 'utf-8') : '[]',
    attempts: fs.existsSync(attemptsFile) ? fs.readFileSync(attemptsFile, 'utf-8') : '[]',
  }

  writeJson(usersFile, {
    ...fixtures.users,
    amy: {
      username: 'amy',
      password: '123456',
      nickname: '小艾',
      role: 'user',
      level: '高级',
      createdAt: '2026-03-13T00:02:00.000Z',
    },
  })
  writeJson(examsFile, [
    {
      id: 'exam-a',
      title: '第一阶段测试一',
      startTime: '2026-03-01T08:00:00.000Z',
      endTime: '2026-03-01T10:00:00.000Z',
      duration: 1800,
      questionCount: 2,
      totalScore: 100,
      bankIds: ['bank-a'],
      levelRequired: '初级',
      createdAt: '2026-03-01T00:00:00.000Z',
      status: 'scheduled',
    },
    {
      id: 'exam-b',
      title: '第一阶段测试二',
      startTime: '2026-03-10T08:00:00.000Z',
      endTime: '2026-03-10T10:00:00.000Z',
      duration: 1800,
      questionCount: 2,
      totalScore: 100,
      bankIds: ['bank-b'],
      levelRequired: '初级',
      createdAt: '2026-03-10T00:00:00.000Z',
      status: 'scheduled',
    },
  ])
  writeJson(questionsFile, [
    {
      id: 'q-a-1',
      bankId: 'bank-a',
      order: 1,
      title: 'A1',
      type: 'single',
      section: 'single',
      score: 50,
      answer: 'A',
      options: [],
    },
    {
      id: 'q-a-2',
      bankId: 'bank-a',
      order: 2,
      title: 'A2',
      type: 'single',
      section: 'single',
      score: 50,
      answer: 'B',
      options: [],
    },
    {
      id: 'q-b-1',
      bankId: 'bank-b',
      order: 1,
      title: 'B1',
      type: 'single',
      section: 'single',
      score: 50,
      answer: 'A',
      options: [],
    },
    {
      id: 'q-b-2',
      bankId: 'bank-b',
      order: 2,
      title: 'B2',
      type: 'single',
      section: 'single',
      score: 50,
      answer: 'B',
      options: [],
    },
  ])
  writeJson(attemptsFile, [
    {
      id: 'attempt-a-vic',
      examId: 'exam-a',
      username: 'vic',
      score: 50,
      rawScore: 50,
      rawTotal: 100,
      totalScore: 100,
      at: '2026-03-01T08:25:00.000Z',
      startedAt: '2026-03-01T08:00:00.000Z',
      submittedAt: '2026-03-01T08:25:00.000Z',
      durationSeconds: 1500,
      wrongQuestionIds: ['q-a-2'],
      answeredCount: 2,
    },
    {
      id: 'attempt-a-amy',
      examId: 'exam-a',
      username: 'amy',
      score: 100,
      rawScore: 100,
      rawTotal: 100,
      totalScore: 100,
      at: '2026-03-01T08:18:00.000Z',
      startedAt: '2026-03-01T08:02:00.000Z',
      submittedAt: '2026-03-01T08:18:00.000Z',
      durationSeconds: 960,
      wrongQuestionIds: [],
      answeredCount: 2,
    },
    {
      id: 'attempt-b-vic',
      examId: 'exam-b',
      username: 'vic',
      score: 100,
      rawScore: 100,
      rawTotal: 100,
      totalScore: 100,
      at: '2026-03-10T08:20:00.000Z',
      startedAt: '2026-03-10T08:01:00.000Z',
      submittedAt: '2026-03-10T08:20:00.000Z',
      durationSeconds: 1140,
      wrongQuestionIds: [],
      answeredCount: 2,
    },
  ])

  const server = await startServer()

  try {
    const admin = await login(server.baseUrl)
    const res = await fetch(`${server.baseUrl}/admin/exam-results`, {
      headers: {
        Authorization: `Bearer ${admin.token}`,
      },
    })

    assert.equal(res.status, 200)
    const data = await res.json()
    assert.equal(Array.isArray(data.examSummaries), true)
    assert.equal(Array.isArray(data.examAttempts), true)
    assert.equal(Array.isArray(data.studentSummaries), true)
    assert.equal(Array.isArray(data.studentTrendLines), true)

    const examA = data.examSummaries.find(item => item.examId === 'exam-a')
    assert.equal(examA.participantCount, 2)
    assert.equal(examA.averageScore, 75)

    const vicExamA = data.examAttempts.find(item => item.examId === 'exam-a' && item.username === 'vic')
    assert.deepEqual(vicExamA.wrongQuestionIds, ['q-a-2'])
    assert.deepEqual(vicExamA.wrongQuestionNumbers, [2])
    assert.equal(vicExamA.nickname, '蔡臻')
    assert.equal(vicExamA.durationSeconds, 1500)

    const vicSummary = data.studentSummaries.find(item => item.username === 'vic')
    assert.equal(vicSummary.examCount, 2)
    assert.equal(vicSummary.averageScore, 75)

    const vicTrend = data.studentTrendLines.filter(item => item.username === 'vic')
    assert.equal(vicTrend.length, 2)

    const filteredRes = await fetch(`${server.baseUrl}/admin/exam-results?student=vic&from=2026-03-05&to=2026-03-18`, {
      headers: {
        Authorization: `Bearer ${admin.token}`,
      },
    })
    assert.equal(filteredRes.status, 200)
    const filtered = await filteredRes.json()
    assert.equal(filtered.examAttempts.length, 1)
    assert.equal(filtered.examAttempts[0].examId, 'exam-b')
  } finally {
    await server.stop()
    fs.writeFileSync(usersFile, backups.users)
    fs.writeFileSync(examsFile, backups.exams)
    fs.writeFileSync(questionsFile, backups.questions)
    fs.writeFileSync(attemptsFile, backups.attempts)
  }
})

test('admin exams list includes active and expired exams together', async () => {
  const backups = {
    users: fs.readFileSync(usersFile, 'utf-8'),
    exams: fs.existsSync(examsFile) ? fs.readFileSync(examsFile, 'utf-8') : '[]',
    questions: fs.existsSync(questionsFile) ? fs.readFileSync(questionsFile, 'utf-8') : '[]',
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
    fs.writeFileSync(attemptsFile, backups.attempts)
  }
})
