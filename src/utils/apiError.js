const ERROR_CODE_MESSAGES = {
  exists: '用户名已存在',
  unauthorized: '登录已失效，请重新登录',
  forbidden: '没有权限执行该操作',
  'user not found': '用户不存在',
}

function toFriendlyErrorMessage(error, fallback) {
  if (typeof error !== 'string') return fallback

  const normalized = error.trim()
  if (!normalized) return fallback

  return ERROR_CODE_MESSAGES[normalized] || normalized
}

export async function readApiError(response, fallback = '请求失败') {
  if (!response) return fallback

  if ([502, 503, 504].includes(response.status)) {
    return '服务暂时不可用，请稍后再试'
  }

  const contentType = response.headers?.get?.('content-type') || ''

  if (contentType.includes('application/json')) {
    try {
      const payload = await response.json()
      const apiError = payload?.error || payload?.message
      return toFriendlyErrorMessage(apiError, fallback)
    } catch {
      return fallback
    }
  }

  try {
    const text = (await response.text()).trim()
    if (/service suspended|service unavailable/i.test(text)) {
      return '服务暂时不可用，请稍后再试'
    }

    return toFriendlyErrorMessage(text, fallback)
  } catch {
    return fallback
  }
}
