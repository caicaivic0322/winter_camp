const EXAM_SESSION_PREFIX = 'cpp_camp_exam_session'

export function buildExamSessionKey(username, examId) {
  return `${EXAM_SESSION_PREFIX}:${username}:${examId}`
}

export function createExamSession({ username, examId, durationSeconds, now = Date.now() }) {
  return {
    username,
    examId,
    startedAt: now,
    expiresAt: now + durationSeconds * 1000,
    answers: {},
    submitted: false,
  }
}

export function hydrateExamSession({ storedSession, username, examId, durationSeconds, now = Date.now() }) {
  const isValid =
    storedSession &&
    storedSession.username === username &&
    storedSession.examId === examId &&
    Number.isFinite(storedSession.expiresAt)

  const session = isValid
    ? {
        ...storedSession,
        answers: storedSession.answers || {},
        submitted: Boolean(storedSession.submitted),
      }
    : createExamSession({ username, examId, durationSeconds, now })

  return {
    session,
    timeLeft: Math.max(0, Math.ceil((session.expiresAt - now) / 1000)),
    isExpired: session.expiresAt <= now,
  }
}

export function readExamSession(storage, username, examId) {
  try {
    const raw = storage.getItem(buildExamSessionKey(username, examId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeExamSession(storage, session) {
  try {
    storage.setItem(buildExamSessionKey(session.username, session.examId), JSON.stringify(session))
  } catch {}
}

export function clearExamSession(storage, username, examId) {
  try {
    storage.removeItem(buildExamSessionKey(username, examId))
  } catch {}
}
