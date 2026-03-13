import test from 'node:test'
import assert from 'node:assert/strict'
import { createExamSession, hydrateExamSession } from './examSession.js'

test('createExamSession builds an absolute deadline from now and duration', () => {
  const session = createExamSession({
    username: 'alice',
    examId: 'exam-1',
    durationSeconds: 120,
    now: 1000,
  })

  assert.equal(session.startedAt, 1000)
  assert.equal(session.expiresAt, 121000)
  assert.deepEqual(session.answers, {})
  assert.equal(session.submitted, false)
})

test('hydrateExamSession reuses stored answers and computes reduced remaining time', () => {
  const { session, timeLeft, isExpired } = hydrateExamSession({
    storedSession: {
      username: 'alice',
      examId: 'exam-1',
      startedAt: 1000,
      expiresAt: 61000,
      answers: { q1: 'A' },
      submitted: false,
    },
    username: 'alice',
    examId: 'exam-1',
    durationSeconds: 120,
    now: 31000,
  })

  assert.equal(session.answers.q1, 'A')
  assert.equal(timeLeft, 30)
  assert.equal(isExpired, false)
})

test('hydrateExamSession creates a fresh session when stored data is missing or mismatched', () => {
  const { session, timeLeft } = hydrateExamSession({
    storedSession: {
      username: 'bob',
      examId: 'exam-2',
      expiresAt: 999999,
    },
    username: 'alice',
    examId: 'exam-1',
    durationSeconds: 90,
    now: 5000,
  })

  assert.equal(session.username, 'alice')
  assert.equal(session.examId, 'exam-1')
  assert.equal(timeLeft, 90)
})

test('hydrateExamSession marks session expired after deadline passes', () => {
  const { timeLeft, isExpired } = hydrateExamSession({
    storedSession: {
      username: 'alice',
      examId: 'exam-1',
      startedAt: 1000,
      expiresAt: 8000,
      answers: { q1: 'B' },
      submitted: false,
    },
    username: 'alice',
    examId: 'exam-1',
    durationSeconds: 60,
    now: 10000,
  })

  assert.equal(timeLeft, 0)
  assert.equal(isExpired, true)
})
