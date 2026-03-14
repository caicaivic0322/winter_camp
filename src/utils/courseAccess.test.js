import test from 'node:test'
import assert from 'node:assert/strict'
import { canAccessCompetitionUnit } from '../../shared/courseAccess.js'

test('canAccessCompetitionUnit only allows competition level or admin role', () => {
  assert.equal(canAccessCompetitionUnit({ level: '竞赛', role: 'user' }), true)
  assert.equal(canAccessCompetitionUnit({ level: '高级', role: 'admin' }), true)
  assert.equal(canAccessCompetitionUnit({ level: '高级', role: 'user' }), false)
  assert.equal(canAccessCompetitionUnit({ level: '中级', role: 'user' }), false)
  assert.equal(canAccessCompetitionUnit(null), false)
})
