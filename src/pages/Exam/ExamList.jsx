import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import API_BASE from '../../config/api'
import { buildAuthHeaders } from '../../utils/auth'
import { canAccessExamLevel, DEFAULT_EXAM_LEVEL, DEFAULT_USER_LEVEL } from '../../../shared/courseAccess.js'

function getExamStatus(exam) {
  const now = Date.now()
  const startAt = new Date(exam.startTime).getTime()
  const endAt = new Date(exam.endTime).getTime()

  if (Number.isFinite(endAt) && endAt < now) {
    return {
      key: 'expired',
      label: '已过期',
      color: 'var(--status-danger-fg)',
      background: 'var(--status-danger-bg)',
      borderColor: 'var(--status-danger-border)',
    }
  }

  if (Number.isFinite(startAt) && startAt > now) {
    return {
      key: 'upcoming',
      label: '未开始',
      color: 'var(--status-warn-fg)',
      background: 'var(--status-warn-bg)',
      borderColor: 'var(--status-warn-border)',
    }
  }

  return {
    key: 'active',
    label: '进行中',
    color: 'var(--status-success-fg)',
    background: 'var(--status-success-bg)',
    borderColor: 'var(--status-success-border)',
  }
}

export default function ExamList() {
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    fetchExams()
  }, [isAdmin])

  const fetchExams = async () => {
    try {
      const endpoint = isAdmin ? '/admin/exams' : '/exams/available'
      const res = await fetch(`${API_BASE}${endpoint}`, {
        headers: buildAuthHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setExams(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleStart = (exam) => {
    const now = Date.now()
    const startAt = new Date(exam.startTime).getTime()
    const endAt = new Date(exam.endTime).getTime()

    if (endAt < now) {
      alert('这场考试已经结束，无法再进入答题')
      return
    }

    if (startAt > now) {
      alert(`考试尚未开始，将于 ${new Date(exam.startTime).toLocaleString()} 开放`)
      return
    }
    // 检查等级
    if (!canAccessExamLevel(user.level || DEFAULT_USER_LEVEL, exam.levelRequired || DEFAULT_EXAM_LEVEL)) {
      alert(`您的等级 (${user.level}) 不足，需要 ${exam.levelRequired} 及以上才能参加`)
      return
    }
    
    if (window.confirm(`确认开始考试 "${exam.title}" 吗？\n考试限时 ${Math.round(exam.duration / 60)} 分钟，开始后无法暂停。`)) {
      navigate(`/exam/${exam.id}`)
    }
  }

  if (loading) return <div className="p-8">加载中...</div>

  return (
    <div className="container" style={{ padding: '32px', maxWidth: '1240px' }}>
      <div style={{
        padding: '30px 28px',
        borderRadius: 28,
        marginBottom: 28,
        background: 'var(--panel-glass)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-lg)',
        backdropFilter: 'blur(18px)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderRadius: 999,
              marginBottom: 14,
              background: 'var(--status-info-bg)',
              border: '1px solid var(--status-info-border)',
              color: 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 700,
            }}>
              Exam Lobby
            </div>
            <h2 style={{ marginBottom: 10 }}>在线考试</h2>
            <p style={{ maxWidth: 620, color: 'var(--text-secondary)', margin: 0 }}>
              {isAdmin ? '管理员视角会展示全部考试，并用颜色区分未开始、进行中和已过期。' : '进入考试前先确认等级要求和时间窗口，提交后将自动记录成绩与错题。'}
            </p>
          </div>
          <div style={{
            minWidth: 180,
            padding: '16px 18px',
            borderRadius: 22,
            background: 'var(--panel-strong)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-md)',
          }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 4 }}>当前可见</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-heading)', lineHeight: 1 }}>{exams.length}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: 6 }}>{isAdmin ? '全部考试' : '可参加考试'}</div>
          </div>
        </div>
      </div>
      
      {exams.length === 0 ? (
        <div className="card" style={{
          padding: '42px 32px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          borderRadius: 24,
          border: '1px dashed var(--border-default)',
          background: 'var(--bg-elevated)',
        }}>
          {isAdmin ? '暂无考试' : '暂无可参加的考试'}
        </div>
      ) : (
        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {exams.map(exam => {
            const status = getExamStatus(exam)
            const disabled = status.key !== 'active'

            return (
            <div key={exam.id} className="card" style={{ 
              padding: '24px', 
              borderRadius: '24px',
              border: '1px solid var(--border-default)',
              background: 'linear-gradient(180deg, color-mix(in oklab, var(--panel-strong) 96%, transparent), color-mix(in oklab, var(--panel-bg) 82%, transparent))',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: 'var(--shadow-lg)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute',
                inset: '0 auto auto 0',
                width: '100%',
                height: 4,
                background: `linear-gradient(90deg, ${status.color}, transparent)`,
                opacity: 0.9,
              }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{exam.title}</h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="tag" style={{ background: 'var(--status-info-bg)', color: 'var(--status-info-fg)', border: '1px solid var(--status-info-border)', padding: '4px 10px', borderRadius: '999px', fontSize: '0.82rem', fontWeight: 700 }}>
                  {exam.levelRequired}及以上
                </span>
                <span className="tag" style={{ background: status.background, color: status.color, border: `1px solid ${status.borderColor}`, padding: '4px 10px', borderRadius: '999px', fontSize: '0.82rem', fontWeight: '700' }}>
                  {status.label}
                </span>
                <span className="tag" style={{ background: 'var(--status-warn-bg)', color: 'var(--status-warn-fg)', border: '1px solid var(--status-warn-border)', padding: '4px 10px', borderRadius: '999px', fontSize: '0.82rem', fontWeight: 700 }}>
                  限时 {Math.round(exam.duration / 60)} 分钟
                </span>
              </div>
              <div style={{
                padding: '14px 16px',
                borderRadius: 18,
                background: 'var(--panel-soft)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
                fontSize: '0.92rem',
              }}>
                <div>题目数量：{exam.questionCount} 题</div>
                <div>开始时间：{new Date(exam.startTime).toLocaleString()}</div>
                <div>结束时间：{new Date(exam.endTime).toLocaleString()}</div>
              </div>
              <button 
                disabled={disabled}
                onClick={() => handleStart(exam)}
                style={{
                  marginTop: 'auto',
                  padding: '13px 14px',
                  background: disabled ? 'var(--panel-soft)' : 'linear-gradient(135deg, var(--primary), var(--accent-secondary))',
                  color: disabled ? 'var(--text-muted)' : 'white',
                  border: disabled ? '1px solid var(--border-default)' : 'none',
                  borderRadius: '16px',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontWeight: '700',
                  opacity: disabled ? 0.75 : 1,
                  boxShadow: disabled ? 'none' : 'var(--shadow-glow)',
                }}
              >
                {status.key === 'expired' ? '考试已过期' : status.key === 'upcoming' ? '等待开始' : '开始答题'}
              </button>
            </div>
          )})}
        </div>
      )}
    </div>
  )
}
