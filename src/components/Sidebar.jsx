import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { parts, getPartCourses } from '../data/courses'
import { useAuth } from '../contexts/AuthContext'

function Sidebar({ isOpen, onClose }) {
  const location = useLocation()
  const { canAccessCompetitionUnit } = useAuth()
  const [competitionModules, setCompetitionModules] = useState([])
  const visibleParts = parts.filter((part) => part.id !== 4 || canAccessCompetitionUnit())

  useEffect(() => {
    if (!isOpen || !canAccessCompetitionUnit()) return
    let cancelled = false
    import('../data/competitionUnit')
      .then((mod) => {
        if (!cancelled) {
          setCompetitionModules(mod.competitionModules || [])
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCompetitionModules([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, canAccessCompetitionUnit])

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <h3 className="sidebar-title">课程目录</h3>
        {visibleParts.map((part) => {
          const isCompetition = part.id === 4
          const partCourses = isCompetition ? competitionModules : getPartCourses(part.id)
          const partCount = isCompetition ? (part.moduleCount || partCourses.length) : partCourses.length
          const destination = part.path || `/part/${part.id}`
          return (
            <div key={part.id} className="sidebar-part-group">
              <Link
                to={destination}
                className="sidebar-part-header"
                onClick={onClose}
                style={{ '--part-color': part.color }}
              >
                <span className="icon">{part.icon}</span>
                <span>{part.title}</span>
                <span className="sidebar-part-count">{partCount}</span>
              </Link>
              {partCourses.map((course) => {
                const courseId = isCompetition ? course.slug : course.id
                const to = isCompetition ? `/competition/module/${course.slug}` : `/lesson/${course.id}`
                const active = isCompetition
                  ? location.pathname === `/competition/module/${course.slug}`
                  : location.pathname === `/lesson/${course.id}`

                return (
                  <Link
                    key={courseId}
                    to={to}
                    className={`sidebar-item ${active ? 'active' : ''}`}
                    onClick={onClose}
                  >
                    <span className="icon">{isCompetition ? '🏷️' : course.icon}</span>
                    <span className="number">{isCompetition ? `M${course.order}` : `第${course.id}章`}</span>
                    <span>{course.title}</span>
                  </Link>
                )
              })}
            </div>
          )
        })}
      </aside>
    </>
  )
}

export default Sidebar
