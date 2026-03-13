import test from 'node:test'
import assert from 'node:assert/strict'

import {
  COURSE_LEVELS,
  DEFAULT_USER_LEVEL,
  DEFAULT_EXAM_LEVEL,
  getLevelRank,
  canAccessExamLevel,
  getCourseAccessProfile,
  isCourseAccessible,
} from './courseAccess.js'

test('course access profile matches the new level ladder', () => {
  const trial = getCourseAccessProfile('试用')
  assert.equal(trial.unlockedCount, 3)
  assert.deepEqual(trial.unlockedParts, [1])
  assert.equal(isCourseAccessible(3, '试用'), true)
  assert.equal(isCourseAccessible(4, '试用'), false)
  assert.equal(isCourseAccessible(17, '试用'), false)

  const beginner = getCourseAccessProfile('初级')
  assert.equal(beginner.unlockedCount, 16)
  assert.deepEqual(beginner.unlockedParts, [1])
  assert.equal(isCourseAccessible(16, '初级'), true)
  assert.equal(isCourseAccessible(17, '初级'), false)

  const intermediate = getCourseAccessProfile('中级')
  assert.equal(intermediate.unlockedCount, 22)
  assert.deepEqual(intermediate.unlockedParts, [1, 2])
  assert.equal(isCourseAccessible(22, '中级'), true)
  assert.equal(isCourseAccessible(23, '中级'), false)

  const advanced = getCourseAccessProfile('高级')
  assert.equal(advanced.unlockedCount, 35)
  assert.deepEqual(advanced.unlockedParts, [1, 2, 3])
  assert.equal(isCourseAccessible(35, '高级'), true)

  const contest = getCourseAccessProfile('竞赛')
  assert.equal(contest.unlockedCount, 35)
  assert.deepEqual(contest.unlockedParts, [1, 2, 3])
  assert.equal(isCourseAccessible(35, '竞赛'), true)
})

test('level metadata keeps defaults and ordering stable', () => {
  assert.deepEqual(COURSE_LEVELS, ['试用', '初级', '中级', '高级', '竞赛'])
  assert.equal(DEFAULT_USER_LEVEL, '试用')
  assert.equal(DEFAULT_EXAM_LEVEL, '中级')
  assert.equal(getLevelRank('试用') < getLevelRank('初级'), true)
  assert.equal(getLevelRank('高级') < getLevelRank('竞赛'), true)
  assert.equal(canAccessExamLevel('竞赛', '高级'), true)
  assert.equal(canAccessExamLevel('初级', '中级'), false)
})
