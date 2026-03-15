import { useState, useEffect } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion } from 'framer-motion'
import { courses } from '../data/courses'
import Modal from '../components/Modal'
import { useAuth, isCourseUnlocked, getCourseUnlockTime, getUnlockedCourses } from '../contexts/AuthContext'
import { DEFAULT_USER_LEVEL } from '../../shared/courseAccess.js'

const lessonContentLoaders = {
  1: () => import('../../第01章_初识C++/讲义_初识C++.md?raw'),
  2: () => import('../../第02课_二进制与位运算/讲义_二进制与位运算.md?raw'),
  3: () => import('../../第03章_数据类型/讲义_数据类型.md?raw'),
  4: () => import('../../第04章_程序结构与运算符/讲义_程序结构与运算符.md?raw'),
  5: () => import('../../第05章_条件分支/讲义_条件分支.md?raw'),
  6: () => import('../../第06章_离散分支/讲义_离散分支.md?raw'),
  7: () => import('../../第07章_while循环/讲义_while循环.md?raw'),
  8: () => import('../../第08章_for循环/讲义_for循环.md?raw'),
  9: () => import('../../第09章_初识数组/讲义_初识数组.md?raw'),
  10: () => import('../../第10章_嵌套循环/讲义_嵌套循环.md?raw'),
  11: () => import('../../第11章_二维数组/讲义_二维数组.md?raw'),
  12: () => import('../../第12章_字符串/讲义_字符串.md?raw'),
  13: () => import('../../第13章_动态数组/讲义_动态数组.md?raw'),
  14: () => import('../../第01课_函数强化与传参机制/讲义_函数强化与传参机制.md?raw'),
  15: () => import('../../第15章_指针/讲义_指针.md?raw'),
  16: () => import('../../第16章_文件操作/讲义_文件操作.md?raw'),
  17: () => import('../../第03课_结构体与类的应用/讲义_结构体与类的应用.md?raw'),
  18: () => import('../../第13课_链表基础/讲义_链表基础.md?raw'),
  19: () => import('../../第19章_栈和队列/讲义_栈和队列.md?raw'),
  20: () => import('../../第20章_union集合体/讲义_union集合体.md?raw'),
  21: () => import('../../第09课_树与二叉树/讲义_树与二叉树.md?raw'),
  22: () => import('../../第22章_图/讲义_图.md?raw'),
  23: () => import('../../第07课_插入排序/讲义_插入排序.md?raw'),
  24: () => import('../../第08课_冒泡排序/讲义_冒泡排序.md?raw'),
  25: () => import('../../第10课_分治与归并/讲义_分治与归并.md?raw'),
  26: () => import('../../第11课_快速排序与贪心/讲义_快速排序与贪心.md?raw'),
  27: () => import('../../第13课_堆与堆排序/讲义_堆与堆排序.md?raw'),
  28: () => import('../../第04课_高精度加法/讲义_高精度加法.md?raw'),
  29: () => import('../../第05课_高精度减法/讲义_高精度减法.md?raw'),
  30: () => import('../../第06课_高精度乘法/讲义_高精度乘法.md?raw'),
  31: () => import('../../第12课_动态规划/讲义_动态规划.md?raw'),
  32: () => import('../../第14课_搜索算法/讲义_搜索算法.md?raw'),
  33: () => import('../../第16课_哈希表基础/讲义_哈希表基础.md?raw'),
  34: () => import('../../第17课_unordered_map详解/讲义_unordered_map详解.md?raw'),
  35: () => import('../../第15课_综合训练与测评/讲义_综合训练.md?raw'),
}

async function loadLessonContent(lessonId) {
  const loader = lessonContentLoaders[lessonId]
  if (!loader) return null
  try {
    const mod = await loader()
    return mod.default || null
  } catch {
    return null
  }
}

function Lesson() {
  const { id } = useParams()
  const courseId = parseInt(id)
  const course = courses.find(c => c.id === courseId)
  const [content, setContent] = useState('')
  const [activeSection, setActiveSection] = useState('')
  const [toc, setToc] = useState([])
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState('')
  const [modalTitle, setModalTitle] = useState('')
  
  const openResource = async (type) => {
    let resContent = null
    let resTitle = ''

    try {
      const { getTestContent, getAnswerContent } = await import('../data/supplementaryContents')
      if (type === 'test') {
        resContent = getTestContent(courseId)
        resTitle = `📝 第${courseId}课 测试卷 (简化版)`
      } else if (type === 'answer') {
        resContent = getAnswerContent(courseId)
        resTitle = `✅ 第${courseId}课 参考答案 (简化版)`
      }
    } catch {
    }
    
    if (resContent) {
      setModalContent(resContent)
      setModalTitle(resTitle)
      setModalOpen(true)
    } else {
      setModalContent('> ⚠️ 该内容暂未上线')
      setModalTitle(type === 'test' ? '测试卷' : '参考答案')
      setModalOpen(true)
    }
  }
  
  const courseStatus = getUnlockedCourses()
  const isUnlocked = isCourseUnlocked(courseId)
  
  useEffect(() => {
    if (!isUnlocked) return
    let cancelled = false
    ;(async () => {
      const lessonContent = await loadLessonContent(courseId)
      if (cancelled) return

      if (lessonContent) {
        setContent(lessonContent)
        const headings = lessonContent.match(/^##\s+.+$/gm) || []
        const tocItems = headings.map(h => {
          const text = h.replace(/^##\s+/, '')
          const id = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '-').toLowerCase()
          return { text, id }
        })
        setToc(tocItems)
      } else {
        setContent(`# 📘 第${courseId}课：${course?.title || '加载中...'}\n\n> 💡 课程内容正在准备中...`)
        setToc([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [courseId, course, isUnlocked])
  
  // 课程已过期
  if (courseStatus.isExpired) {
    return <Navigate to="/login" replace />
  }
  
  // 课程未解锁
  if (!isUnlocked) {
    const unlockTime = getCourseUnlockTime(courseId)
    const currentLevel = courseStatus.userLevel || DEFAULT_USER_LEVEL
    const formatDate = (date) => {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
    
    return (
      <motion.div 
        className="lesson-locked-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="locked-content">
          <div className="locked-icon">🔒</div>
          <h1>课程尚未解锁</h1>
          <p className="locked-course-name">
            <span className="course-icon">{course?.icon}</span>
            Day {courseId}: {course?.title}
          </p>
          <div className="unlock-info">
            <span className="unlock-label">当前状态</span>
            <span className="unlock-time">{currentLevel} · 当前不可访问</span>
          </div>
          <p className="locked-hint">
            {courseStatus.accessLabel
              ? `你当前是${currentLevel}用户，${courseStatus.accessLabel}。`
              : `课程预计开放时间：${formatDate(unlockTime)}。`}
          </p>
          <Link to="/" className="btn btn-primary">
            ← 返回课程列表
          </Link>
        </div>
      </motion.div>
    )
  }
  
  if (!course) {
    return (
      <div className="lesson-page container">
        <h1>课程不存在</h1>
        <Link to="/" className="btn btn-primary">返回首页</Link>
      </div>
    )
  }
  
  // 滚动到指定章节
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(sectionId)
    }
  }
  
  // 自定义渲染器：为标题添加 ID
  const HeadingRenderer = ({ level, children }) => {
    const text = children?.toString() || ''
    const id = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '-').toLowerCase()
    const Tag = `h${level}`
    return <Tag id={id}>{children}</Tag>
  }
  
  // 代码块渲染器
  const CodeBlock = ({ inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '')
    const language = match ? match[1] : ''
    
    if (inline) {
      return <code className="inline-code" {...props}>{children}</code>
    }
    
    return (
      <div className="code-block">
        {language && <div className="code-language">{language}</div>}
        <pre className={className} {...props}>
          <code>{children}</code>
        </pre>
      </div>
    )
  }
  
  // 获取可访问的上一课和下一课
  const prevCourseId = courseId > 1 ? courseId - 1 : null
  const nextCourseId = courseId < 17 && isCourseUnlocked(courseId + 1) ? courseId + 1 : null
  
  return (
    <motion.div 
      className="lesson-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* 主要内容区 */}
      <div className="lesson-content">
        <div className="lesson-header">
          <div className="lesson-breadcrumb">
            <Link to="/">首页</Link>
            <span>›</span>
            <span>{course.category}</span>
            <span>›</span>
            <span>Day {course.id}</span>
          </div>
          
          <div className="lesson-title-row">
            <span className="lesson-icon">{course.icon}</span>
            <div>
              <h1 className="lesson-main-title">{course.title}</h1>
              <p className="lesson-subtitle">{course.subtitle}</p>
            </div>
          </div>
          
          {course.hasAnimation && (
            <Link 
              to={`/visualizer/${course.animationType}`}
              className="btn btn-primary"
              style={{ marginTop: '16px', display: 'inline-flex' }}
            >
              <span>🎬</span> 查看算法动画演示
            </Link>
          )}
        </div>
        
        <div className="markdown-content">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              h1: (props) => <HeadingRenderer level={1} {...props} />,
              h2: (props) => <HeadingRenderer level={2} {...props} />,
              h3: (props) => <HeadingRenderer level={3} {...props} />,
              code: CodeBlock,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
        
        {/* 课程导航 */}
        <div className="lesson-nav-buttons">
          {prevCourseId && (
            <Link to={`/lesson/${prevCourseId}`} className="nav-btn prev">
              <span>←</span>
              <span>上一课</span>
            </Link>
          )}
          <Link to="/" className="nav-btn home">
            <span>🏠</span>
            <span>课程列表</span>
          </Link>
          {nextCourseId ? (
            <Link to={`/lesson/${nextCourseId}`} className="nav-btn next">
              <span>下一课</span>
              <span>→</span>
            </Link>
          ) : courseId < 17 && (
            <div className="nav-btn next locked">
              <span>🔒</span>
              <span>未解锁</span>
            </div>
          )}
        </div>
      </div>
      
      {/* 侧边栏 */}
      <div className="lesson-sidebar">
        {/* 相关资料区 */}
        <nav className="resource-list">
          <h4 className="resource-title">📚 相关资料</h4>
          <button className="resource-item" onClick={() => openResource('test')}>
            <span className="resource-icon">📝</span>
            <span>测试卷 (简化版)</span>
          </button>
          <button className="resource-item" onClick={() => openResource('answer')}>
            <span className="resource-icon">✅</span>
            <span>参考答案 (简化版)</span>
          </button>
        </nav>

        {/* 目录导航 */}
        {toc.length > 0 && (
          <nav className="lesson-toc">
            <h4 className="toc-title">📑 本课目录</h4>
            <ul className="toc-list">
              {toc.map((item, index) => (
                <li key={index}>
                  <button
                    className={`toc-item ${activeSection === item.id ? 'active' : ''}`}
                    onClick={() => scrollToSection(item.id)}
                  >
                    {item.text}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
        
        {/* 课程导航 */}
        <nav className="lesson-nav">
          <h4 className="lesson-nav-title">📚 全部课程</h4>
          <div className="lesson-nav-list">
            {courses.map((c) => {
              const cUnlocked = isCourseUnlocked(c.id)
              return (
                <div key={c.id}>
                  {cUnlocked ? (
                    <Link 
                      to={`/lesson/${c.id}`}
                      className={`lesson-nav-item ${c.id === courseId ? 'active' : ''}`}
                    >
                      <span className="icon">{c.icon}</span>
                      <span className="number">Day {c.id}</span>
                    </Link>
                  ) : (
                    <div className="lesson-nav-item locked">
                      <span className="icon">🔒</span>
                      <span className="number">Day {c.id}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </nav>
      </div>
      
      {/* 资源查看 Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
      >
        <div className="markdown-content">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              h1: (props) => <HeadingRenderer level={1} {...props} />,
              h2: (props) => <HeadingRenderer level={2} {...props} />,
              h3: (props) => <HeadingRenderer level={3} {...props} />,
              code: CodeBlock,
            }}
          >
            {modalContent}
          </ReactMarkdown>
        </div>
      </Modal>
    </motion.div>
  )
}

export default Lesson
