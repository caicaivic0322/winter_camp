import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth, getUnlockedCourses } from '../contexts/AuthContext'
import '../styles/Auth.css'

function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    document.body.classList.add('auth-scrollbar-hidden')
    return () => {
      document.body.classList.remove('auth-scrollbar-hidden')
    }
  }, [])
  
  const courseStatus = getUnlockedCourses()
  
  if (courseStatus.isExpired) {
    return (
      <div className="auth-page">
        <div className="auth-container expired-container auth-enter">
          <div className="auth-header">
            <div className="auth-logo">🔒</div>
            <h1>课程已结束</h1>
            <p className="auth-subtitle">
              C++ 寒假集训营已于 2026年3月31日 结束
            </p>
          </div>
          
          <div className="expired-message">
            <p>感谢您对本课程的关注！</p>
            <p>本期集训营所有内容已于 <strong>2026年3月31日</strong> 关闭浏览。</p>
            <p style={{ marginTop: '24px', color: 'var(--text-subtle)' }}>
              如需继续学习，请关注下一期课程安排。
            </p>
          </div>
          
          <div className="expired-footer">
            <span className="expired-icon">📚</span>
            <span>期待与你再次相遇</span>
          </div>
        </div>
      </div>
    )
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      let result
      if (isLogin) {
        result = await login(username, password)
      } else {
        result = await register(username, password, nickname)
      }
      
      if (result.success) {
        const from = location.state?.from?.pathname || '/'
        navigate(from, { replace: true })
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }
  
  const toggleMode = () => {
    setIsLogin(!isLogin)
    setError('')
  }
  
  return (
    <div className="auth-page">
      <div className="auth-container auth-enter">
        <div className="auth-header">
          <div className="auth-logo">🚀</div>
          <h1>延安科创训练营</h1>
          <p className="auth-subtitle">
            {isLogin ? '欢迎回来，继续你的学习之旅' : '加入我们，开启编程之旅'}
          </p>
        </div>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="auth-error auth-error-enter">
              <span>⚠️</span> {error}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              required
              minLength={3}
              autoComplete="username"
            />
          </div>
          
          {!isLogin && (
            <div className="form-group auth-field-enter">
              <label htmlFor="nickname">昵称（可选）</label>
              <input
                type="text"
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="显示在课程中的名称"
                autoComplete="nickname"
              />
              <p className="form-hint">建议填写本人真名，方便老师审核确认。</p>
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isLogin ? '请输入密码' : '至少6个字符'}
              required
              minLength={6}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>
          
          <button 
            type="submit" 
            className="auth-submit"
            disabled={loading}
          >
            {loading ? (
              <span className="loading-spinner" />
            ) : (
              isLogin ? '登 录' : '注 册'
            )}
          </button>
        </form>
        
        <div className="auth-footer">
          <span>{isLogin ? '还没有账号？' : '已有账号？'}</span>
          <button type="button" className="auth-switch" onClick={toggleMode}>
            {isLogin ? '立即注册' : '立即登录'}
          </button>
        </div>
        
        <div className="auth-info">
          <div className="info-item">Developed by [蔡老师]</div>
        </div>
      </div>
      
      <div className="auth-bg-decoration">
        <div className="bg-circle circle-1" />
        <div className="bg-circle circle-2" />
        <div className="bg-circle circle-3" />
      </div>
    </div>
  )
}

export default Login
