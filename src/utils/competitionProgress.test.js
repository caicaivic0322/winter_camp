import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCompetitionProgressKey,
  createCompetitionProgress,
  normalizeCompetitionProgress,
  toggleProblemState,
  computeProblemStatus,
  computeModuleProgress,
  computeOverallProgress,
} from './competitionProgress.js'

test('createCompetitionProgress returns empty sets for a user', () => {
  const progress = createCompetitionProgress('alice')

  assert.equal(progress.username, 'alice')
  assert.deepEqual(progress.completedProblemIds, [])
  assert.deepEqual(progress.wrongProblemIds, [])
  assert.deepEqual(progress.favoriteProblemIds, [])
})

test('normalizeCompetitionProgress removes duplicates and invalid ids', () => {
  const progress = normalizeCompetitionProgress({
    username: 'alice',
    completedProblemIds: [1, 1, '2', 0, NaN],
    wrongProblemIds: ['3', 3, null],
    favoriteProblemIds: [4, 'x', 4],
  })

  assert.deepEqual(progress.completedProblemIds, [1, 2])
  assert.deepEqual(progress.wrongProblemIds, [3])
  assert.deepEqual(progress.favoriteProblemIds, [4])
})

test('toggleProblemState adds and removes ids from a target list', () => {
  const progress = createCompetitionProgress('alice')
  const afterAdd = toggleProblemState(progress, 'completedProblemIds', 42)
  const afterRemove = toggleProblemState(afterAdd, 'completedProblemIds', 42)

  assert.deepEqual(afterAdd.completedProblemIds, [42])
  assert.deepEqual(afterRemove.completedProblemIds, [])
})

test('computeProblemStatus reads membership across all three status lists', () => {
  const progress = normalizeCompetitionProgress({
    username: 'alice',
    completedProblemIds: [1],
    wrongProblemIds: [2],
    favoriteProblemIds: [1, 3],
  })

  assert.deepEqual(computeProblemStatus(progress, 1), {
    completed: true,
    wrong: false,
    favorite: true,
  })
  assert.deepEqual(computeProblemStatus(progress, 2), {
    completed: false,
    wrong: true,
    favorite: false,
  })
})

test('computeModuleProgress derives completed count and percentage from recommended ids', () => {
  const module = {
    recommendedProblemIds: [1, 2, 3, 4],
  }
  const progress = normalizeCompetitionProgress({
    username: 'alice',
    completedProblemIds: [2, 4, 8],
  })

  assert.deepEqual(computeModuleProgress(module, progress), {
    completedCount: 2,
    totalCount: 4,
    percent: 50,
  })
})

test('computeOverallProgress aggregates totals, favorites and wrong markers', () => {
  const progress = normalizeCompetitionProgress({
    username: 'alice',
    completedProblemIds: [1, 2, 3],
    wrongProblemIds: [2, 5],
    favoriteProblemIds: [1],
  })

  assert.deepEqual(computeOverallProgress(progress, 10), {
    completedCount: 3,
    wrongCount: 2,
    favoriteCount: 1,
    totalCount: 10,
    percent: 30,
  })
})

test('buildCompetitionProgressKey namespaces progress by username', () => {
  assert.equal(buildCompetitionProgressKey('alice'), 'cpp_camp_competition_progress:alice')
})
