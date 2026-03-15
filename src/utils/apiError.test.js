import test from 'node:test'
import assert from 'node:assert/strict'
import { readApiError } from './apiError.js'

test('readApiError maps known JSON error codes to friendly messages', async () => {
  const response = new Response(JSON.stringify({ error: 'exists' }), {
    status: 409,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const message = await readApiError(response, '注册失败')

  assert.equal(message, '用户名已存在')
})

test('readApiError reports service unavailability for HTML 503 responses', async () => {
  const response = new Response('<html><body>Service Suspended</body></html>', {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })

  const message = await readApiError(response, '注册失败')

  assert.equal(message, '服务暂时不可用，请稍后再试')
})

test('readApiError keeps explicit validation messages from the API', async () => {
  const response = new Response(JSON.stringify({ error: '密码至少需要 6 个字符' }), {
    status: 400,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const message = await readApiError(response, '注册失败')

  assert.equal(message, '密码至少需要 6 个字符')
})
