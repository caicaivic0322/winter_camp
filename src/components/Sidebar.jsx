import { Link, useLocation } from 'react-router-dom'
import { parts, getPartCourses } from '../data/courses'

function Sidebar({ isOpen, onClose }) {
  const location = useLocation()

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <h3 className="sidebar-title">课程目录</h3>
        {parts.map((part) => {
          const partCourses = getPartCourses(part.id)
          return (
            <div key={part.id} className="sidebar-part-group">
              <Link
                to={`/part/${part.id}`}
                className="sidebar-part-header"
                onClick={onClose}
                style={{ '--part-color': part.color }}
              >
                <span className="icon">{part.icon}</span>
                <span>{part.title}</span>
                <span className="sidebar-part-count">{partCourses.length}</span>
              </Link>
              {partCourses.map((course) => (
                <Link
                  key={course.id}
                  to={`/lesson/${course.id}`}
                  className={`sidebar-item ${location.pathname === `/lesson/${course.id}` ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <span className="icon">{course.icon}</span>
                  <span className="number">第{course.id}章</span>
                  <span>{course.title}</span>
                </Link>
              ))}
            </div>
          )
        })}
      </aside>
    </>
  )
}

export default Sidebar
