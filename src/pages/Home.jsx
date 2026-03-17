import { Link } from 'react-router-dom'
import { parts, courses, getPartCourses } from '../data/courses'
import { useAuth, getUnlockedCourses } from '../contexts/AuthContext'
import { DEFAULT_USER_LEVEL } from '../../shared/courseAccess.js'

function Home() {
  const { user, logout, canAccessCompetitionUnit } = useAuth()
  const courseStatus = getUnlockedCourses()
  const visibleParts = parts.filter((part) => part.id !== 4 || canAccessCompetitionUnit())

  return (
    <div className="home container page-enter">
      <div className="user-bar page-enter-quick">
        <div className="user-info">
          <span className="user-avatar">👤</span>
          <span className="user-name">欢迎，{user?.nickname || user?.username}</span>
        </div>
        <div className="user-actions">
          <span className="progress-badge">
            📖 {user?.level || courseStatus.userLevel || DEFAULT_USER_LEVEL} · 已解锁 {courseStatus.unlockedCount || courses.length} / {courses.length} 章
          </span>
          <button className="logout-btn" onClick={logout}>
            退出登录
          </button>
        </div>
      </div>

      <section className="hero page-enter-delay-1">
        <div className="hero-badge hero-badge-pop">
          <span>🚀</span> {courses.length}章精品课程 + 1个竞赛单元 · 四大阶段系统学习
        </div>

        <h1 className="hero-title">C++系统学习课程</h1>

        <p className="hero-subtitle">
          从基础语法到数据结构、进阶算法，再到面向 CSP-S 的专题竞赛训练，系统掌握 C++ 编程与信息学竞赛技巧
        </p>
        {courseStatus.accessLabel && (
          <div className="hero-badge" style={{ marginTop: 18 }}>
            <span>🎯</span> {courseStatus.accessLabel}
          </div>
        )}

        <div className="hero-stats page-enter-delay-2">
          {visibleParts.map((part) => {
            const partCount = part.id === 4 ? (part.moduleCount || 0) : getPartCourses(part.id).length
            return (
              <div className="stat-item" key={part.id}>
                <div className="stat-value">{partCount}</div>
                <div className="stat-label">{part.title}</div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="page-enter-delay-2" style={{ marginTop: '48px' }}>
        <h2 className="section-title">
          课程体系
        </h2>

        <div className="parts-grid">
          {visibleParts.map((part, index) => {
            const isCompetition = part.id === 4
            const partCourses = isCompetition ? [] : getPartCourses(part.id)
            const categories = isCompetition
              ? ['CSP-J', 'CSP-S', 'Hot 100', '专题讲解']
              : [...new Set(partCourses.map(c => c.category))]
            const destination = part.path || `/part/${part.id}`
            const countLabel = isCompetition ? (part.unitLabel || `${part.moduleCount || 0} 模块`) : `${partCourses.length} 章`
            const rangeLabel = isCompetition ? '专题学习 + 自测题单' : `第${part.chapterRange[0]}-${part.chapterRange[1]}章`

            return (
              <div key={part.id} className="page-stagger-item" style={{ animationDelay: `${0.08 * index}s` }}>
                <Link
                  to={destination}
                  className="part-card"
                  style={{ '--part-color': part.color }}
                >
                  <div className="part-card-top" style={{ background: part.gradient }}>
                    <div className="part-card-icon">{part.icon}</div>
                    <div className="part-card-label">第{part.id}部分</div>
                  </div>

                  <div className="part-card-body">
                    <h3 className="part-card-title">{part.title}</h3>
                    <p className="part-card-subtitle">{part.subtitle}</p>

                    <div className="part-card-meta">
                      <span className="part-card-count">
                        📚 {countLabel}
                      </span>
                      <span className="part-card-range">
                        {rangeLabel}
                      </span>
                    </div>

                    <div className="part-card-tags">
                      {categories.slice(0, 4).map((cat) => (
                        <span key={cat} className="part-card-tag">{cat}</span>
                      ))}
                      {categories.length > 4 && (
                        <span className="part-card-tag">+{categories.length - 4}</span>
                      )}
                    </div>

                    <div className="part-card-arrow">
                      {isCompetition ? '进入竞赛单元 →' : '进入学习 →'}
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      </section>

      <footer
        style={{
          textAlign: 'center',
          padding: '80px 0 48px',
          color: 'var(--text-subtle)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem',
        }}
      >
        <div style={{ marginBottom: '8px', color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--dawn-orange)' }}>{'<'}</span>
          C++ Training Camp
          <span style={{ color: 'var(--dawn-orange)' }}>{' />'}</span>
        </div>
        <div>developed by [蔡老师] for competitive programming</div>
      </footer>
    </div>
  )
}

export default Home
