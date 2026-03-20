import { Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { DEFAULT_USER_LEVEL } from '../../shared/courseAccess.js'
import { VISUALGO_SORTING_URL } from '../utils/visualgo'
import API_BASE from '../config/api'
import { buildAuthHeaders, clearStoredAuth } from '../utils/auth'

const CPP_COMPILER_URL = 'https://onecompiler.com/cpp'

function Navbar() {
  const { theme, toggleTheme, isDark } = useTheme()
  const { user, canAccessCompetitionUnit, logout, refreshUser } = useAuth()

  const handleChangePassword = async () => {
    const currentPassword = window.prompt('请输入当前密码')
    if (currentPassword === null) return

    const trimmedCurrentPassword = currentPassword.trim()
    if (trimmedCurrentPassword.length < 6) {
      window.alert('当前密码至少需要 6 个字符')
      return
    }

    const newPassword = window.prompt('请输入新密码（至少 6 位）')
    if (newPassword === null) return

    const trimmedNewPassword = newPassword.trim()
    if (trimmedNewPassword.length < 6) {
      window.alert('新密码至少需要 6 个字符')
      return
    }

    const confirmPassword = window.prompt('请再次输入新密码')
    if (confirmPassword === null) return

    if (trimmedNewPassword !== confirmPassword.trim()) {
      window.alert('两次输入的新密码不一致')
      return
    }

    try {
      const res = await fetch(`${API_BASE}/my/password`, {
        method: 'PATCH',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          currentPassword: trimmedCurrentPassword,
          newPassword: trimmedNewPassword,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }

      await refreshUser()
      window.alert('密码修改成功')
    } catch (error) {
      const message = String(error?.message || '')
      if (message.includes('unauthorized')) {
        clearStoredAuth()
        logout()
        return
      }
      window.alert(`修改密码失败：${message || '网络错误'}`)
    }
  }
  
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="logo">💻</span>
        <span>延安科创训练营</span>
      </Link>
      
      <div className="navbar-menu">
        <Link to="/" className="navbar-link">首页</Link>
        {canAccessCompetitionUnit() && (
          <Link to="/competition" className="navbar-link">竞赛单元</Link>
        )}
        <Link to="/exams" className="navbar-link">在线考试</Link>
        <Link to="/my/exam-results" className="navbar-link">考试成绩</Link>
        {user?.role !== 'admin' && (
          <a href={CPP_COMPILER_URL} target="_blank" rel="noreferrer" className="navbar-link">编译器</a>
        )}
        <a href={VISUALGO_SORTING_URL} target="_blank" rel="noreferrer" className="navbar-link">算法演示</a>
        {user?.role === 'admin' && (
          <>
            <Link to="/admin/users" className="navbar-link">用户管理</Link>
            <Link to="/admin/exams" className="navbar-link">考试管理</Link>
            <Link to="/admin/scores" className="navbar-link">学生成绩</Link>
          </>
        )}

        {user && (
          <div className="navbar-user-actions">
            <div className="navbar-user-pill">
              <span className="navbar-user-dot" />
              <span>{user.nickname || user.username}</span>
              <span className="navbar-user-level">{user.level || DEFAULT_USER_LEVEL}</span>
            </div>
            <button type="button" className="navbar-link navbar-action-btn" onClick={handleChangePassword}>
              修改密码
            </button>
          </div>
        )}
        
        <button 
          className="theme-toggle"
          onClick={toggleTheme}
          title={isDark ? '切换到亮色模式' : '切换到暗色模式'}
        >
          <span className="theme-icon">
            {isDark ? '☀️' : '🌙'}
          </span>
          <span className="theme-label">
            {isDark ? 'Light' : 'Night'}
          </span>
        </button>
      </div>
      
      <div className="navbar-right-mobile">
        <button 
          className="theme-toggle-mobile"
          onClick={toggleTheme}
          aria-label={isDark ? '切换到亮色模式' : '切换到暗色模式'}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>
    </nav>
  )
}

export default Navbar
