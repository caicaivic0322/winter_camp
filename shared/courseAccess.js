export const COURSE_LEVELS = ['试用', '初级', '中级', '高级', '竞赛']
export const DEFAULT_USER_LEVEL = '试用'
export const DEFAULT_EXAM_LEVEL = '中级'
export const ADMIN_LEVEL = '高级'

const LEGACY_LEVEL_MAP = {
  bronze: '初级',
  silver: '中级',
  gold: '高级',
  platinum: '高级',
  初阶: '初级',
  中阶: '中级',
  高阶: '高级',
}

const LEVEL_RANK = COURSE_LEVELS.reduce((acc, level, index) => {
  acc[level] = index
  return acc
}, {})

const COURSE_ACCESS_MAP = {
  试用: {
    unlockedParts: [1],
    unlockedCourseIds: [1, 2, 3],
    accessLabel: '解锁第一部分前 3 节课程',
  },
  初级: {
    unlockedParts: [1],
    unlockedCourseIds: Array.from({ length: 16 }, (_, index) => index + 1),
    accessLabel: '解锁第一部分全部课程',
  },
  中级: {
    unlockedParts: [1, 2],
    unlockedCourseIds: Array.from({ length: 22 }, (_, index) => index + 1),
    accessLabel: '解锁第一、第二部分全部课程',
  },
  高级: {
    unlockedParts: [1, 2, 3],
    unlockedCourseIds: Array.from({ length: 35 }, (_, index) => index + 1),
    accessLabel: '解锁前三个部分全部课程',
  },
  竞赛: {
    unlockedParts: [1, 2, 3],
    unlockedCourseIds: Array.from({ length: 35 }, (_, index) => index + 1),
    accessLabel: '解锁现有全部课程，并为竞赛课程预留',
  },
}

export function normalizeCourseLevel(level, fallback = DEFAULT_USER_LEVEL) {
  if (COURSE_LEVELS.includes(level)) return level
  if (LEGACY_LEVEL_MAP[level]) return LEGACY_LEVEL_MAP[level]
  return fallback
}

export function getLevelRank(level) {
  const normalized = normalizeCourseLevel(level)
  return LEVEL_RANK[normalized] ?? LEVEL_RANK[DEFAULT_USER_LEVEL]
}

export function normalizeExamAudienceLevels(levels, fallback = DEFAULT_EXAM_LEVEL) {
  let rawLevels = []

  if (Array.isArray(levels)) {
    rawLevels = levels
  } else if (typeof levels === 'string' && levels.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(levels)
      rawLevels = Array.isArray(parsed) ? parsed : [levels]
    } catch {
      rawLevels = [levels]
    }
  } else if (levels) {
    rawLevels = [levels]
  }

  const normalized = rawLevels
    .map(level => normalizeCourseLevel(level, ''))
    .filter(level => COURSE_LEVELS.includes(level))
    .sort((a, b) => getLevelRank(a) - getLevelRank(b))
    .filter((level, index, list) => list.indexOf(level) === index)

  return normalized.length > 0 ? normalized : [normalizeCourseLevel(fallback, DEFAULT_EXAM_LEVEL)]
}

export function formatExamAudienceLabel(levels) {
  if (Array.isArray(levels)) {
    return normalizeExamAudienceLevels(levels).join(' / ')
  }
  return `${normalizeCourseLevel(levels, DEFAULT_EXAM_LEVEL)}及以上`
}

export function canAccessExamLevel(userLevel, requiredLevel = DEFAULT_EXAM_LEVEL) {
  if (Array.isArray(requiredLevel)) {
    const allowedLevels = normalizeExamAudienceLevels(requiredLevel)
    return allowedLevels.includes(normalizeCourseLevel(userLevel, DEFAULT_USER_LEVEL))
  }
  return getLevelRank(userLevel) >= getLevelRank(requiredLevel)
}

export function canAccessCompetitionUnit(user) {
  if (!user) return false
  if (user.role === 'admin') return true
  return normalizeCourseLevel(user.level, DEFAULT_USER_LEVEL) === '竞赛'
}

export function getCourseAccessProfile(level) {
  const normalized = normalizeCourseLevel(level)
  const profile = COURSE_ACCESS_MAP[normalized] || COURSE_ACCESS_MAP[DEFAULT_USER_LEVEL]

  return {
    level: normalized,
    unlockedParts: [...profile.unlockedParts],
    unlockedCourseIds: [...profile.unlockedCourseIds],
    unlockedCount: profile.unlockedCourseIds.length,
    accessLabel: profile.accessLabel,
  }
}

export function isCourseAccessible(courseId, level) {
  const profile = getCourseAccessProfile(level)
  return profile.unlockedCourseIds.includes(Number(courseId))
}
