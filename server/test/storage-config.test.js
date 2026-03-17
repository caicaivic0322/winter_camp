import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveStorageConfig } from '../lib/dataStore.js'

test('resolveStorageConfig uses local file storage by default', () => {
  const config = resolveStorageConfig({
    DATA_DIR: '/tmp/cpp-camp-data',
  })

  assert.equal(config.mode, 'local')
  assert.equal(config.dataDir, '/tmp/cpp-camp-data')
})

test('resolveStorageConfig uses supabase when server credentials are present', () => {
  const config = resolveStorageConfig({
    DATA_DIR: '/tmp/cpp-camp-data',
    SUPABASE_URL: 'https://demo.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret',
  })

  assert.equal(config.mode, 'supabase')
  assert.equal(config.dataDir, '/tmp/cpp-camp-data')
  assert.equal(config.supabaseUrl, 'https://demo.supabase.co')
  assert.equal(config.supabaseServiceRoleKey, 'service-role-secret')
})

test('resolveStorageConfig uses sqlite when STORAGE_MODE is sqlite', () => {
  const config = resolveStorageConfig({
    DATA_DIR: '/tmp/cpp-camp-data',
    STORAGE_MODE: 'sqlite',
  })

  assert.equal(config.mode, 'sqlite')
  assert.equal(config.sqlitePath, '/tmp/cpp-camp-data/app_state.sqlite')
})

test('resolveStorageConfig uses sqlite when SQLITE_PATH is provided', () => {
  const config = resolveStorageConfig({
    DATA_DIR: '/tmp/cpp-camp-data',
    SQLITE_PATH: '/var/lib/cpp-camp/state.db',
  })

  assert.equal(config.mode, 'sqlite')
  assert.equal(config.sqlitePath, '/var/lib/cpp-camp/state.db')
})
