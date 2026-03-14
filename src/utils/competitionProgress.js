const COMPETITION_PROGRESS_PREFIX = 'cpp_camp_competition_progress'

function normalizeIdList(list) {
  if (!Array.isArray(list)) return []

  const seen = new Set()
  const result = []

  for (const value of list) {
    const id = Number(value)
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue
    seen.add(id)
    result.push(id)
  }

  return result
}

export function buildCompetitionProgressKey(username) {
  return `${COMPETITION_PROGRESS_PREFIX}:${username}`
}

export function createCompetitionProgress(username = 'guest') {
  return {
    username,
    completedProblemIds: [],
    wrongProblemIds: [],
    favoriteProblemIds: [],
  }
}

export function normalizeCompetitionProgress(progress) {
  const base = createCompetitionProgress(progress?.username || 'guest')

  return {
    ...base,
    ...progress,
    completedProblemIds: normalizeIdList(progress?.completedProblemIds),
    wrongProblemIds: normalizeIdList(progress?.wrongProblemIds),
    favoriteProblemIds: normalizeIdList(progress?.favoriteProblemIds),
  }
}

export function toggleProblemState(progress, key, problemId) {
  const normalized = normalizeCompetitionProgress(progress)
  const target = new Set(normalized[key] || [])
  const id = Number(problemId)

  if (!Number.isInteger(id) || id <= 0) {
    return normalized
  }

  if (target.has(id)) {
    target.delete(id)
  } else {
    target.add(id)
  }

  return {
    ...normalized,
    [key]: [...target].sort((a, b) => a - b),
  }
}

export function computeProblemStatus(progress, problemId) {
  const normalized = normalizeCompetitionProgress(progress)
  const id = Number(problemId)

  return {
    completed: normalized.completedProblemIds.includes(id),
    wrong: normalized.wrongProblemIds.includes(id),
    favorite: normalized.favoriteProblemIds.includes(id),
  }
}

export function computeModuleProgress(module, progress) {
  const ids = normalizeIdList(module?.recommendedProblemIds)
  const completed = new Set(normalizeCompetitionProgress(progress).completedProblemIds)
  const completedCount = ids.filter((id) => completed.has(id)).length
  const totalCount = ids.length

  return {
    completedCount,
    totalCount,
    percent: totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100),
  }
}

export function computeOverallProgress(progress, totalCount) {
  const normalized = normalizeCompetitionProgress(progress)

  return {
    completedCount: normalized.completedProblemIds.length,
    wrongCount: normalized.wrongProblemIds.length,
    favoriteCount: normalized.favoriteProblemIds.length,
    totalCount,
    percent: totalCount > 0 ? Math.round((normalized.completedProblemIds.length / totalCount) * 100) : 0,
  }
}

export function readCompetitionProgress(storage, username) {
  try {
    const raw = storage.getItem(buildCompetitionProgressKey(username))
    return raw ? normalizeCompetitionProgress(JSON.parse(raw)) : createCompetitionProgress(username)
  } catch {
    return createCompetitionProgress(username)
  }
}

export function writeCompetitionProgress(storage, progress) {
  try {
    const normalized = normalizeCompetitionProgress(progress)
    storage.setItem(buildCompetitionProgressKey(normalized.username), JSON.stringify(normalized))
  } catch {}
}
