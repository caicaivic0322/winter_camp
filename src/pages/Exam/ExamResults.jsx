import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import API_BASE from '../../config/api'
import { buildAuthHeaders } from '../../utils/auth'

function formatDateTime(value) {
  if (!value) return '暂无时间'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '暂无时间'
  return date.toLocaleString()
}

function getStatusMeta(status) {
  if (status === 'pending' || status === 'grading') {
    return {
      label: '判题中',
      color: 'var(--status-warn-fg)',
      background: 'var(--status-warn-bg)',
      borderColor: 'var(--status-warn-border)',
    }
  }

  if (status === 'failed') {
    return {
      label: '判题失败',
      color: 'var(--status-danger-fg)',
      background: 'var(--status-danger-bg)',
      borderColor: 'var(--status-danger-border)',
    }
  }

  return {
    label: '已出成绩',
    color: 'var(--status-success-fg)',
    background: 'var(--status-success-bg)',
    borderColor: 'var(--status-success-border)',
  }
}

function sanitizeText(value) {
  return String(value || '')
    .replace(/\*\*/g, '')
    .replace(/\s*[（(]\s*[　 ]*[√×][　 ]*[）)]\s*$/g, '')
    .trim()
}

export default function ExamResults() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const [list, setList] = useState([])
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const run = async () => {
      try {
        setLoading(true)
        const res = await fetch(`${API_BASE}/my/exam-results`, {
          headers: buildAuthHeaders(),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!active) return
        setList(Array.isArray(data) ? data : [])
      } catch (err) {
        if (!active) return
        setError(`加载考试成绩失败：${err?.message || '网络错误'}`)
      } finally {
        if (active) setLoading(false)
      }
    }

    run()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!attemptId) {
      setDetail(null)
      return
    }

    let active = true

    const run = async () => {
      try {
        setDetailLoading(true)
        const res = await fetch(`${API_BASE}/my/exam-results/${attemptId}`, {
          headers: buildAuthHeaders(),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!active) return
        setDetail(data)
      } catch (err) {
        if (!active) return
        setError(`加载考试详情失败：${err?.message || '网络错误'}`)
      } finally {
        if (active) setDetailLoading(false)
      }
    }

    run()
    return () => {
      active = false
    }
  }, [attemptId])

  const latestAttempt = useMemo(() => list[0] || null, [list])

  return (
    <div style={{ padding: '28px 24px 40px', maxWidth: 1160, margin: '0 auto' }}>
      <div style={{
        padding: '30px 28px',
        borderRadius: 28,
        marginBottom: 24,
        background: 'var(--panel-glass)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-lg)',
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
              Score Archive
            </div>
            <h2 style={{ margin: '0 0 10px' }}>考试成绩</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: 620 }}>
              这里按时间倒序保留每次考试的最终成绩。点击某次考试后，可以查看本次保存下来的错题题干与分析。
            </p>
          </div>
          <div style={{
            minWidth: 220,
            padding: '16px 18px',
            borderRadius: 22,
            background: 'var(--panel-strong)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-md)',
          }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 4 }}>最近一次考试</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-heading)' }}>
              {latestAttempt?.examTitle || '暂无记录'}
            </div>
            <div style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {latestAttempt ? formatDateTime(latestAttempt.submittedAt) : '完成考试后会显示在这里'}
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div style={{
          marginBottom: 20,
          padding: '16px 18px',
          borderRadius: 18,
          background: 'var(--status-danger-bg)',
          color: 'var(--status-danger-fg)',
          border: '1px solid var(--status-danger-border)',
        }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: attemptId ? 'minmax(320px, 420px) minmax(0, 1fr)' : '1fr' }}>
        <section style={{
          borderRadius: 24,
          border: '1px solid var(--border-default)',
          background: 'var(--panel-strong)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-default)', fontWeight: 800 }}>
            成绩列表
          </div>
          <div style={{ padding: 18, display: 'grid', gap: 14 }}>
            {loading ? <div style={{ color: 'var(--text-secondary)' }}>加载成绩中...</div> : null}
            {!loading && list.length === 0 ? (
              <div style={{
                padding: 20,
                borderRadius: 18,
                border: '1px dashed var(--border-default)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
              }}>
                暂无考试成绩，完成考试后会在这里显示。
              </div>
            ) : null}
            {list.map((item) => {
              const status = getStatusMeta(item.status)
              const isActive = item.attemptId === attemptId

              return (
                <button
                  key={item.attemptId}
                  type="button"
                  onClick={() => navigate(`/my/exam-results/${item.attemptId}`)}
                  style={{
                    textAlign: 'left',
                    padding: 18,
                    borderRadius: 20,
                    border: `1px solid ${isActive ? 'var(--brand-primary)' : 'var(--border-default)'}`,
                    background: isActive ? 'var(--panel-glass)' : 'var(--panel-bg)',
                    cursor: 'pointer',
                    boxShadow: isActive ? 'var(--shadow-glow)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--text-heading)', marginBottom: 4 }}>{item.examTitle}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{formatDateTime(item.submittedAt)}</div>
                    </div>
                    <span style={{
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: status.background,
                      color: status.color,
                      border: `1px solid ${status.borderColor}`,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}>
                      {status.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                    {item.score === null ? '--' : item.score}
                    <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginLeft: 6 }}>/ {item.totalScore}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {attemptId ? (
          <section style={{
            borderRadius: 24,
            border: '1px solid var(--border-default)',
            background: 'var(--panel-strong)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-default)', fontWeight: 800 }}>
              考试详情
            </div>
            <div style={{ padding: 20 }}>
              {detailLoading ? <div style={{ color: 'var(--text-secondary)' }}>加载详情中...</div> : null}
              {!detailLoading && !detail ? <div style={{ color: 'var(--text-secondary)' }}>未找到这次考试记录。</div> : null}
              {!detailLoading && detail ? (
                <div style={{ display: 'grid', gap: 20 }}>
                  <div style={{
                    padding: 22,
                    borderRadius: 22,
                    background: 'var(--panel-bg)',
                    border: '1px solid var(--border-default)',
                  }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 8 }}>考试成绩</div>
                    <div style={{ fontSize: '2.6rem', fontWeight: 900, color: 'var(--text-heading)' }}>
                      {detail.score === null ? '--' : detail.score}
                      <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginLeft: 8 }}>/ {detail.totalScore}</span>
                    </div>
                    <div style={{ marginTop: 10, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                      <div>提交时间：{formatDateTime(detail.submittedAt)}</div>
                      {detail.gradedAt ? <div>出分时间：{formatDateTime(detail.gradedAt)}</div> : null}
                    </div>
                  </div>

                  {(detail.status === 'pending' || detail.status === 'grading') ? (
                    <div style={{
                      padding: 20,
                      borderRadius: 20,
                      background: 'var(--status-warn-bg)',
                      border: '1px solid var(--status-warn-border)',
                      color: 'var(--status-warn-fg)',
                      lineHeight: 1.7,
                    }}>
                      正在判题中，请稍后刷新页面查看最终成绩和错题分析。
                    </div>
                  ) : null}

                  {detail.status === 'failed' ? (
                    <div style={{
                      padding: 20,
                      borderRadius: 20,
                      background: 'var(--status-danger-bg)',
                      border: '1px solid var(--status-danger-border)',
                      color: 'var(--status-danger-fg)',
                      lineHeight: 1.7,
                    }}>
                      判题失败，请联系老师处理。{detail.gradingError ? `错误信息：${detail.gradingError}` : ''}
                    </div>
                  ) : null}

                  {detail.status === 'graded' ? (
                    <div style={{ display: 'grid', gap: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0 }}>错题分析</h3>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
                          共 {detail.wrongQuestions.length} 题
                        </span>
                      </div>

                      {detail.wrongQuestions.length === 0 ? (
                        <div style={{
                          padding: 20,
                          borderRadius: 20,
                          border: '1px dashed var(--border-default)',
                          background: 'var(--bg-elevated)',
                          color: 'var(--text-secondary)',
                        }}>
                          本次考试没有错题，继续保持。
                        </div>
                      ) : null}

                      {detail.wrongQuestions.map((item, index) => (
                        <article
                          key={`${item.questionId}-${index}`}
                          style={{
                            padding: 20,
                            borderRadius: 22,
                            border: '1px solid var(--border-default)',
                            background: 'var(--panel-bg)',
                            display: 'grid',
                            gap: 12,
                          }}
                        >
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 700 }}>
                            第 {item.questionNumber || index + 1} 题
                          </div>
                          <div style={{ fontWeight: 800, color: 'var(--text-heading)', lineHeight: 1.7 }}>
                            {sanitizeText(item.title)}
                          </div>
                          <div style={{
                            padding: '14px 16px',
                            borderRadius: 16,
                            background: 'var(--panel-soft)',
                            color: 'var(--text-body)',
                            lineHeight: 1.7,
                          }}>
                            {item.analysis || '暂无分析'}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        ) : (
          <section style={{
            borderRadius: 24,
            border: '1px dashed var(--border-default)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
            padding: 28,
            lineHeight: 1.8,
          }}>
            从左侧选择一次考试，即可查看最终成绩和该次考试保存下来的错题分析。
            <div style={{ marginTop: 16 }}>
              <Link to="/exams" style={{ color: 'var(--brand-primary)', fontWeight: 700, textDecoration: 'none' }}>
                去参加新的在线考试 →
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
