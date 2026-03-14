import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getCompetitionProblemById,
  buildLeetCodeProblemUrl,
} from '../data/competitionUnit.js'

test('competition problem lookup returns exact slug for hot100 question', () => {
  const problem = getCompetitionProblemById(53)

  assert.equal(problem.id, 53)
  assert.equal(problem.title, '最大子数组和')
  assert.equal(problem.titleSlug, 'maximum-subarray')
  assert.equal(buildLeetCodeProblemUrl(problem), 'https://leetcode.cn/problems/maximum-subarray/')
})
