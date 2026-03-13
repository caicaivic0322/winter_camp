const CURRENT_USER_KEY = 'cpp_camp_current_user'

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function buildAuthHeaders(headers = {}) {
  const auth = getStoredAuth()
  if (!auth?.token) return headers

  return {
    ...headers,
    Authorization: `Bearer ${auth.token}`,
  }
}

export function clearStoredAuth() {
  localStorage.removeItem(CURRENT_USER_KEY)
}

export function saveStoredAuth(user) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
}

export { CURRENT_USER_KEY }
