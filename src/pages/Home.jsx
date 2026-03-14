import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { parts, courses, getPartCourses } from '../data/courses'
import { useAuth, getUnlockedCourses } from '../contexts/AuthContext'
import { DEFAULT_USER_LEVEL } from '../../shared/courseAccess.js'
import { competitionModules } from '../data/competitionUnit'

function Home() {
  const { user, logout, canAccessCompetitionUnit } = useAuth()
  const courseStatus = getUnlockedCourses()
  const visibleParts = parts.filter((part) => part.id !== 4 || canAccessCompetitionUnit())

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.12 }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  }

  return (
    <div className="home container">
      {/* 用户信息栏 */}
      <motion.div
        className="user-bar"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
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
      </motion.div>

      {/* Hero 区域 */}
      <motion.section
        className="hero"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div
          className="hero-badge"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <span>🚀</span> {courses.length}章精品课程 + 1个竞赛单元 · 四大阶段系统学习
        </motion.div>

        <h1 className="hero-title">C++系统学习课程</h1>

        <p className="hero-subtitle">
          从基础语法到数据结构、进阶算法，再到面向 CSP-S 的专题竞赛训练，系统掌握 C++ 编程与信息学竞赛技巧
        </p>
        {courseStatus.accessLabel && (
          <div className="hero-badge" style={{ marginTop: 18 }}>
            <span>🎯</span> {courseStatus.accessLabel}
          </div>
        )}

        <motion.div
          className="hero-stats"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          {visibleParts.map((part) => {
            const partCourses = part.id === 4 ? competitionModules : getPartCourses(part.id)
            return (
              <div className="stat-item" key={part.id}>
                <div className="stat-value">{partCourses.length}</div>
                <div className="stat-label">{part.title}</div>
              </div>
            )
          })}
        </motion.div>
      </motion.section>

      {/* 三大部分卡片 */}
      <motion.section
        variants={container}
        initial="hidden"
        animate="show"
        style={{ marginTop: '48px' }}
      >
        <motion.h2
          className="section-title"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          课程体系
        </motion.h2>

        <div className="parts-grid">
          {visibleParts.map((part) => {
            const isCompetition = part.id === 4
            const partCourses = isCompetition ? competitionModules : getPartCourses(part.id)
            const categories = isCompetition
              ? ['CSP-J', 'CSP-S', 'Hot 100', '专题讲解']
              : [...new Set(partCourses.map(c => c.category))]
            const destination = part.path || `/part/${part.id}`
            const countLabel = part.unitLabel || `${partCourses.length} 章`
            const rangeLabel = isCompetition ? '专题学习 + 自测题单' : `第${part.chapterRange[0]}-${part.chapterRange[1]}章`

            return (
              <motion.div key={part.id} variants={item}>
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
              </motion.div>
            )
          })}
        </div>
      </motion.section>

      {/* 底部 */}
      <motion.footer
        style={{
          textAlign: 'center',
          padding: '80px 0 48px',
          color: 'var(--text-subtle)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
      >
        <div style={{ marginBottom: '8px', color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--dawn-orange)' }}>{'<'}</span>
          C++ Training Camp
          <span style={{ color: 'var(--dawn-orange)' }}>{' />'}</span>
        </div>
        <div>developed by [蔡老师] for competitive programming</div>
      </motion.footer>
    </div>
  )
}

export default Home
