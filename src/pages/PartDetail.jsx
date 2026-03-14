import { Link, useParams, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { parts, courses, getPartCourses } from '../data/courses'
import { getUnlockedCourses, isCourseUnlocked } from '../contexts/AuthContext'

function PartDetail() {
  const { partId } = useParams()
  const partIdNum = parseInt(partId)
  const part = parts.find(p => p.id === partIdNum)
  const courseStatus = getUnlockedCourses()

  if (!part) {
    return <Navigate to="/" replace />
  }

  if (part.path) {
    return <Navigate to={part.path} replace />
  }

  const partCourses = getPartCourses(partIdNum)

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
  }

  return (
    <div className="part-detail container">
      {/* 面包屑 */}
      <motion.div
        className="part-breadcrumb"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Link to="/">首页</Link>
        <span>›</span>
        <span>{part.title}</span>
      </motion.div>

      {/* 部分头部 */}
      <motion.section
        className="part-hero"
        style={{ '--part-color': part.color }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="part-hero-icon">{part.icon}</div>
        <div className="part-hero-info">
          <div className="part-hero-label">第{part.id}部分</div>
          <h1 className="part-hero-title">{part.title}</h1>
          <p className="part-hero-subtitle">{part.subtitle}</p>
          <div className="part-hero-stats">
            <span className="part-stat">📚 {partCourses.length} 章</span>
            <span className="part-stat">
              第{part.chapterRange[0]}-{part.chapterRange[1]}章
            </span>
          </div>
        </div>
      </motion.section>

      {/* 章节列表 */}
      <motion.div
        className="course-grid"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {partCourses.map((course) => {
          const unlocked = isCourseUnlocked(course.id)

          return (
            <motion.div key={course.id} variants={item}>
              {unlocked ? (
                <Link
                  to={`/lesson/${course.id}`}
                  className="course-card"
                  style={{ '--card-color': course.color }}
                >
                  <div className="course-header">
                    <div className="course-icon">{course.icon}</div>
                    <div className="course-meta">
                      <div className="course-number">第{course.id}章</div>
                      <h3 className="course-title">{course.title}</h3>
                    </div>
                  </div>

                  <p className="course-subtitle">{course.subtitle}</p>

                  <div className="course-footer">
                    <span className="course-category">{course.category}</span>
                    {course.hasAnimation && (
                      <Link
                        to={`/visualizer/${course.animationType}`}
                        className="course-badge"
                        onClick={(e) => e.stopPropagation()}
                      >
                        ▶ 动画演示
                      </Link>
                    )}
                  </div>

                  <div className="difficulty">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`difficulty-dot ${level <= course.difficulty ? 'active' : ''}`}
                        style={{
                          background: level <= course.difficulty ? course.color : undefined,
                        }}
                      />
                    ))}
                  </div>
                </Link>
              ) : (
                <div
                  className="course-card locked"
                  style={{ '--card-color': course.color }}
                >
                  <div className="locked-overlay">
                    <span className="lock-icon">🔒</span>
                    <span className="unlock-time">暂不可用</span>
                  </div>

                  <div className="course-header">
                    <div className="course-icon" style={{ opacity: 0.5 }}>{course.icon}</div>
                    <div className="course-meta">
                      <div className="course-number">第{course.id}章</div>
                      <h3 className="course-title">{course.title}</h3>
                    </div>
                  </div>

                  <p className="course-subtitle" style={{ opacity: 0.5 }}>{course.subtitle}</p>

                  <div className="course-footer">
                    <span className="course-category" style={{ opacity: 0.5 }}>
                      {course.category}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </motion.div>

      {/* 返回按钮 */}
      <motion.div
        style={{ textAlign: 'center', marginTop: '48px' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', gap: '8px' }}>
          ← 返回首页
        </Link>
      </motion.div>
    </div>
  )
}

export default PartDetail
