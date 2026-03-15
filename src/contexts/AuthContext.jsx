import { createContext, useContext, useState, useEffect } from 'react'
import API_BASE from '../config/api'
import { buildAuthHeaders, clearStoredAuth, CURRENT_USER_KEY, saveStoredAuth } from '../utils/auth'
import { readApiError } from '../utils/apiError'
import {
  ADMIN_LEVEL,
  canAccessCompetitionUnit,
  DEFAULT_USER_LEVEL,
  getCourseAccessProfile,
  isCourseAccessible,
  normalizeCourseLevel,
} from '../../shared/courseAccess.js'

const AuthContext = createContext(null)

// 课程开放时间配置
const COURSE_CONFIG = {
  startDate: new Date('2099-01-01T08:00:00+08:00'),
  endDate: new Date('2026-03-31T23:59:59+08:00'),
  coursesPerDay: 2,
  totalCourses: 35,
}

// 计算当前已开放的课程
export function getUnlockedCourses() {
  try {
    const saved = localStorage.getItem('cpp_camp_current_user')
    if (saved) {
      const cu = JSON.parse(saved)
      if (cu?.role === 'admin') {
        const adminProfile = getCourseAccessProfile(ADMIN_LEVEL)
        return {
          ...adminProfile,
          unlockedCount: COURSE_CONFIG.totalCourses,
          isExpired: false,
          isBeforeStart: false,
          daysPassed: 0,
          userLevel: cu?.level || ADMIN_LEVEL,
          accessLabel: '管理员可访问全部课程',
        }
      }
      
      const level = normalizeCourseLevel(cu?.level, DEFAULT_USER_LEVEL)
      const profile = getCourseAccessProfile(level)
      
      return {
        ...profile,
        isExpired: false,
        isBeforeStart: false,
        daysPassed: 0,
        userLevel: level,
        accessLabel: profile.accessLabel,
      }
    }
  } catch {}
  
  const now = new Date()
  
  if (now < COURSE_CONFIG.startDate) {
    return {
      unlockedCount: 0,
      isExpired: false,
      isBeforeStart: true,
      startDate: COURSE_CONFIG.startDate,
    }
  }
  
  if (now > COURSE_CONFIG.endDate) {
    return {
      unlockedCount: 0,
      isExpired: true,
      isBeforeStart: false,
      endDate: COURSE_CONFIG.endDate,
    }
  }
  
  const startTime = COURSE_CONFIG.startDate.getTime()
  const currentTime = now.getTime()
  const daysPassed = Math.floor((currentTime - startTime) / (24 * 60 * 60 * 1000))
  
  const currentHour = now.getHours()
  const todayAt8 = new Date(now)
  todayAt8.setHours(8, 0, 0, 0)
  
  let effectiveDays = daysPassed
  if (now < todayAt8 && daysPassed === 0) {
    effectiveDays = 0
  }
  
  const unlockedCount = Math.min(
    (effectiveDays + 1) * COURSE_CONFIG.coursesPerDay,
    COURSE_CONFIG.totalCourses
  )
  
  return {
    unlockedCount,
    isExpired: false,
    isBeforeStart: false,
    daysPassed: effectiveDays,
  }
}

// 检查某个课程是否已开放
export function isCourseUnlocked(courseId) {
  try {
    const saved = localStorage.getItem('cpp_camp_current_user')
    if (saved) {
      const cu = JSON.parse(saved)
      if (cu?.role === 'admin') return true
      return isCourseAccessible(courseId, cu?.level || DEFAULT_USER_LEVEL)
    }
  } catch {}
  const { unlockedCount, isExpired } = getUnlockedCourses()
  if (isExpired) return false
  return courseId <= unlockedCount
}

// 获取课程开放时间
export function getCourseUnlockTime(courseId) {
  const dayIndex = Math.ceil(courseId / 2) - 1
  const unlockTime = new Date(COURSE_CONFIG.startDate)
  unlockTime.setDate(unlockTime.getDate() + dayIndex)
  return unlockTime
}

// 模拟用户数据库（实际项目中应该用后端）
const USERS_STORAGE_KEY = 'cpp_camp_users'
function getUsers() {
  try {
    const data = localStorage.getItem(USERS_STORAGE_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    try {
      const users = getUsers()
      if (!users['admin']) {
        users['admin'] = {
          username: 'admin',
          password: '123456',
          nickname: '管理员',
          role: 'admin',
          level: '高级',
          createdAt: new Date().toISOString(),
        }
        saveUsers(users)
      }
    } catch {
    }

    const savedUser = localStorage.getItem(CURRENT_USER_KEY)
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser)
        if (parsed?.token) {
          const normalizedUser = {
            ...parsed,
            level: normalizeCourseLevel(parsed.level, parsed.role === 'admin' ? ADMIN_LEVEL : DEFAULT_USER_LEVEL),
          }
          setUser(normalizedUser)
          saveStoredAuth(normalizedUser)
        } else {
          clearStoredAuth()
        }
      } catch {
        clearStoredAuth()
      }
    }
    setLoading(false)
  }, [])
  
  const register = async (username, password, nickname) => {
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, nickname }),
      })
      
      if (!res.ok) {
        return { success: false, error: await readApiError(res, '注册失败') }
      }
      
      const data = await res.json()
      const userInfo = {
        ...data.user,
        level: normalizeCourseLevel(data.user?.level, DEFAULT_USER_LEVEL),
        token: data.token,
      }
      setUser(userInfo)
      saveStoredAuth(userInfo)
      
      return { success: true }
    } catch (e) {
      return { success: false, error: '网络错误，请重试' }
    }
  }
  
  const login = async (username, password) => {
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      
      if (!res.ok) {
        return { success: false, error: await readApiError(res, '登录失败') }
      }
      
      const data = await res.json()
      const userInfo = {
        ...data.user,
        level: normalizeCourseLevel(data.user?.level, DEFAULT_USER_LEVEL),
        token: data.token,
      }
      setUser(userInfo)
      saveStoredAuth(userInfo)
      
      return { success: true }
    } catch (e) {
      return { success: false, error: '网络错误，请重试' }
    }
  }
  
  // 登出
  const logout = () => {
    const headers = buildAuthHeaders()
    if (headers.Authorization) {
      fetch(`${API_BASE}/logout`, {
        method: 'POST',
        headers,
      }).catch(() => {})
    }
    setUser(null)
    clearStoredAuth()
  }
  
  // 刷新用户信息（管理员修改等级后调用）
  const refreshUser = async () => {
    try {
      const saved = localStorage.getItem(CURRENT_USER_KEY)
      if (!saved) return
      
      const cu = JSON.parse(saved)
      const res = await fetch(`${API_BASE}/users/${encodeURIComponent(cu.username)}`, {
        headers: buildAuthHeaders(),
      })
      
      if (res.status === 401 || res.status === 403) {
        logout()
        return
      }

      if (!res.ok) return
      
      const data = await res.json()
      if (data?.username) {
        const userInfo = { username: data.username, nickname: data.nickname, role: data.role, level: normalizeCourseLevel(data.level, DEFAULT_USER_LEVEL), token: cu.token }
        setUser(userInfo)
        saveStoredAuth(userInfo)
      }
    } catch (e) {
      console.error('刷新用户信息失败', e)
    }
  }
  
  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    refreshUser,
    getUnlockedCourses,
    isCourseUnlocked,
    getCourseUnlockTime,
    canAccessCompetitionUnit: () => canAccessCompetitionUnit(user),
  }
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
