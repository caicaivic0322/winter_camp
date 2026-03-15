import { Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { DEFAULT_USER_LEVEL } from '../../shared/courseAccess.js'

function Navbar() {
  const { theme, toggleTheme, isDark } = useTheme()
  const { user, canAccessCompetitionUnit } = useAuth()
  
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
        <Link to="/my/wrong-book" className="navbar-link">错题本</Link>
        <Link to="/visualizer/bubble" className="navbar-link">排序可视化</Link>
        {user?.role === 'admin' && (
          <>
            <Link to="/admin/users" className="navbar-link">用户管理</Link>
            <Link to="/admin/exams" className="navbar-link">考试管理</Link>
          </>
        )}

        {user && (
          <div className="navbar-user-pill">
            <span className="navbar-user-dot" />
            <span>{user.nickname || user.username}</span>
            <span className="navbar-user-level">{user.level || DEFAULT_USER_LEVEL}</span>
          </div>
        )}
        
        {/* 主题切换按钮 */}
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
