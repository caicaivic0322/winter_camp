import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import API_BASE from '../config/api'
import { buildAuthHeaders } from '../utils/auth'

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

function formatDuration(seconds) {
  if (!Number.isFinite(Number(seconds)) || Number(seconds) < 0) return '—'
  const total = Math.round(Number(seconds))
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}分${String(secs).padStart(2, '0')}秒`
}

function average(items, key) {
  if (!items.length) return 0
  return Math.round(items.reduce((sum, item) => sum + Number(item[key] || 0), 0) / items.length)
}

function downloadCsv(filename, rows) {
  const csv = rows.map(row => row.map(value => {
    const text = String(value ?? '')
    if (!/[",\n]/.test(text)) return text
    return `"${text.replace(/"/g, '""')}"`
  }).join(',')).join('\n')

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function MetricCard({ label, value, hint, accent }) {
  return (
    <div style={{ ...metricCardStyle, borderTop: `4px solid ${accent}` }}>
      <div style={metricLabelStyle}>{label}</div>
      <div style={metricValueStyle}>{value}</div>
      <div style={metricHintStyle}>{hint}</div>
    </div>
  )
}

function BarChart({ data = [] }) {
  const max = Math.max(...data.map(item => item.value), 1)

  return (
    <div style={chartShellStyle}>
      <div style={chartHeaderStyle}>
        <h3 style={chartTitleStyle}>成绩柱状图</h3>
        <span style={chartMetaStyle}>按考试得分</span>
      </div>
      <div style={barChartWrapStyle}>
        {data.length === 0 ? (
          <div style={emptyChartStyle}>当前筛选条件下暂无成绩</div>
        ) : data.map(item => (
          <div key={`${item.label}-${item.value}`} style={barItemStyle}>
            <div style={barTrackStyle}>
              <div
                style={{
                  ...barFillStyle,
                  height: `${Math.max(12, (item.value / max) * 100)}%`,
                }}
              />
            </div>
            <div style={barValueStyle}>{item.value}</div>
            <div style={barLabelStyle} title={item.label}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LineChart({ data = [] }) {
  const width = 720
  const height = 260
  const padding = 28

  const points = useMemo(() => {
    if (data.length === 0) return []
    const max = Math.max(...data.map(item => item.value), 100)
    const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0
    return data.map((item, index) => {
      const x = padding + index * stepX
      const y = height - padding - ((item.value / max) * (height - padding * 2))
      return { ...item, x, y }
    })
  }, [data])

  const polyline = points.map(point => `${point.x},${point.y}`).join(' ')

  return (
    <div style={chartShellStyle}>
      <div style={chartHeaderStyle}>
        <h3 style={chartTitleStyle}>成绩趋势图</h3>
        <span style={chartMetaStyle}>按提交时间排序</span>
      </div>
      {points.length === 0 ? (
        <div style={emptyChartStyle}>当前筛选条件下暂无成绩</div>
      ) : (
        <>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
            <defs>
              <linearGradient id="scoreLine" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="#2f7cff" />
                <stop offset="100%" stopColor="#1dd1a1" />
              </linearGradient>
            </defs>
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border-default)" strokeWidth="1.5" />
            <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="var(--border-default)" strokeWidth="1.5" />
            <polyline
              fill="none"
              stroke="url(#scoreLine)"
              strokeWidth="4"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={polyline}
            />
            {points.map(point => (
              <g key={`${point.label}-${point.value}`}>
                <circle cx={point.x} cy={point.y} r="5.5" fill="#fff" stroke="#2f7cff" strokeWidth="3" />
                <text x={point.x} y={point.y - 12} textAnchor="middle" fontSize="12" fill="var(--text-secondary)">
                  {point.value}
                </text>
              </g>
            ))}
          </svg>
          <div style={lineLegendStyle}>
            {points.map(point => (
              <div key={point.label} style={lineLegendItemStyle}>
                <strong>{point.label}</strong>
                <span>{formatDateTime(point.meta)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function AdminScores() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [payload, setPayload] = useState({
    examOptions: [],
    studentOptions: [],
    examAttempts: [],
  })
  const [selectedExamId, setSelectedExamId] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    if (!isAdmin) return
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const res = await fetch(`${API_BASE}/admin/exam-results`, {
          headers: buildAuthHeaders(),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
        setPayload({
          examOptions: Array.isArray(data.examOptions) ? data.examOptions : [],
          studentOptions: Array.isArray(data.studentOptions) ? data.studentOptions : [],
          examAttempts: Array.isArray(data.examAttempts) ? data.examAttempts : [],
        })
      } catch (e) {
        setError(`加载学生成绩失败：${e?.message || '网络错误'}`)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isAdmin])

  useEffect(() => {
    if (!selectedExamId && payload.examOptions.length > 0) {
      setSelectedExamId(payload.examOptions[0].id)
    }
  }, [payload.examOptions, selectedExamId])

  useEffect(() => {
    if (!selectedStudent && payload.studentOptions.length > 0) {
      setSelectedStudent(payload.studentOptions[0].username)
    }
  }, [payload.studentOptions, selectedStudent])

  const attemptsInRange = useMemo(() => {
    return payload.examAttempts.filter(item => {
      const submittedAt = item.submittedAt || item.examStartTime
      const time = new Date(submittedAt).getTime()
      if (!Number.isFinite(time)) return false
      if (dateFrom) {
        const from = new Date(`${dateFrom}T00:00:00`).getTime()
        if (time < from) return false
      }
      if (dateTo) {
        const to = new Date(`${dateTo}T23:59:59`).getTime()
        if (time > to) return false
      }
      return true
    })
  }, [payload.examAttempts, dateFrom, dateTo])

  const examAttempts = useMemo(() => {
    return attemptsInRange
      .filter(item => item.examId === selectedExamId)
      .sort((a, b) => b.score - a.score || new Date(a.submittedAt) - new Date(b.submittedAt))
  }, [attemptsInRange, selectedExamId])

  const studentAttempts = useMemo(() => {
    return attemptsInRange
      .filter(item => item.username === selectedStudent)
      .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
  }, [attemptsInRange, selectedStudent])

  const examSummary = useMemo(() => {
    if (examAttempts.length === 0) {
      return { participantCount: 0, averageScore: 0, highestScore: 0, averageDurationSeconds: 0 }
    }
    return {
      participantCount: examAttempts.length,
      averageScore: average(examAttempts, 'score'),
      highestScore: Math.max(...examAttempts.map(item => item.score), 0),
      averageDurationSeconds: average(examAttempts, 'durationSeconds'),
    }
  }, [examAttempts])

  const studentSummary = useMemo(() => {
    if (studentAttempts.length === 0) {
      return { examCount: 0, averageScore: 0, bestScore: 0, averageWrongCount: 0 }
    }
    return {
      examCount: studentAttempts.length,
      averageScore: average(studentAttempts, 'score'),
      bestScore: Math.max(...studentAttempts.map(item => item.score), 0),
      averageWrongCount: average(studentAttempts, 'wrongCount'),
    }
  }, [studentAttempts])

  const barChartData = useMemo(() => {
    return studentAttempts.map(item => ({
      label: item.examTitle,
      value: item.score,
    }))
  }, [studentAttempts])

  const lineChartData = useMemo(() => {
    return studentAttempts.map(item => ({
      label: item.examTitle,
      value: item.score,
      meta: item.submittedAt,
    }))
  }, [studentAttempts])

  const selectedExamTitle = payload.examOptions.find(item => item.id === selectedExamId)?.title || '未选择考试'
  const selectedStudentLabel = payload.studentOptions.find(item => item.username === selectedStudent)?.nickname || selectedStudent || '未选择学生'

  const exportExamTable = () => {
    downloadCsv(`${selectedExamTitle}-成绩汇总.csv`, [
      ['考试', '学生', '分数', '总分', '错题号', '开始答题时间', '提交时间', '答题时长', '作答题数'],
      ...examAttempts.map(item => [
        item.examTitle,
        item.nickname,
        item.score,
        item.totalScore,
        item.wrongQuestionNumbers.join('、') || '无',
        formatDateTime(item.startedAt),
        formatDateTime(item.submittedAt),
        formatDuration(item.durationSeconds),
        item.answeredCount,
      ]),
    ])
  }

  const exportStudentTable = () => {
    downloadCsv(`${selectedStudentLabel}-阶段成绩汇总.csv`, [
      ['学生', '考试', '分数', '总分', '错题数', '错题号', '提交时间', '答题时长'],
      ...studentAttempts.map(item => [
        item.nickname,
        item.examTitle,
        item.score,
        item.totalScore,
        item.wrongCount,
        item.wrongQuestionNumbers.join('、') || '无',
        formatDateTime(item.submittedAt),
        formatDuration(item.durationSeconds),
      ]),
    ])
  }

  if (!isAdmin) {
    return <div className="container" style={{ padding: 32 }}>仅管理员可访问学生成绩页面。</div>
  }

  return (
    <div className="container" style={{ padding: '32px', maxWidth: 1400 }}>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={heroStyle}
      >
        <div>
          <div style={eyebrowStyle}>Score Observatory</div>
          <h1 style={{ margin: '8px 0 12px', fontSize: '2.4rem' }}>学生成绩总览</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: 720, lineHeight: 1.7 }}>
            这里可以按考试查看全班成绩明细，也可以按学生查看某个阶段内的成绩变化、错题分布和答题用时。
          </p>
        </div>
        <div style={heroAsideStyle}>
          <div style={heroAsideValueStyle}>{payload.examAttempts.length}</div>
          <div style={heroAsideLabelStyle}>累计考试记录</div>
        </div>
      </motion.section>

      <section style={filterCardStyle}>
        <div style={filterGridStyle}>
          <label style={fieldStyle}>
            <span style={fieldLabelStyle}>考试筛选</span>
            <select value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)} style={inputStyle}>
              {payload.examOptions.map(item => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </label>

          <label style={fieldStyle}>
            <span style={fieldLabelStyle}>学生筛选</span>
            <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} style={inputStyle}>
              {payload.studentOptions.map(item => (
                <option key={item.username} value={item.username}>{item.nickname} ({item.username})</option>
              ))}
            </select>
          </label>

          <label style={fieldStyle}>
            <span style={fieldLabelStyle}>开始日期</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} />
          </label>

          <label style={fieldStyle}>
            <span style={fieldLabelStyle}>结束日期</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} />
          </label>
        </div>

        <div style={filterActionsStyle}>
          <button type="button" style={ghostButtonStyle} onClick={() => {
            setDateFrom('')
            setDateTo('')
          }}>
            清空阶段筛选
          </button>
          <button type="button" style={primaryButtonStyle} onClick={exportExamTable}>导出考试汇总表</button>
          <button type="button" style={primaryButtonStyle} onClick={exportStudentTable}>导出个人汇总表</button>
        </div>
      </section>

      {error && (
        <div style={errorStyle}>{error}</div>
      )}

      {loading ? (
        <div style={loadingStyle}>成绩数据加载中...</div>
      ) : (
        <>
          <section style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <div style={sectionEyebrowStyle}>按考试查看</div>
                <h2 style={sectionTitleStyle}>{selectedExamTitle}</h2>
              </div>
            </div>

            <div style={metricGridStyle}>
              <MetricCard label="参考人数" value={`${examSummary.participantCount} 人`} hint="当前筛选阶段内参与该考试的人数" accent="#2f7cff" />
              <MetricCard label="平均分" value={`${examSummary.averageScore} 分`} hint="本场考试整体成绩水平" accent="#1dd1a1" />
              <MetricCard label="最高分" value={`${examSummary.highestScore} 分`} hint="当前考试内的最佳成绩" accent="#ff9f43" />
              <MetricCard label="平均用时" value={formatDuration(examSummary.averageDurationSeconds)} hint="根据开始与提交时间计算" accent="#ff6b6b" />
            </div>

            <div style={tableShellStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>学生</th>
                    <th style={thStyle}>成绩</th>
                    <th style={thStyle}>错题号</th>
                    <th style={thStyle}>开始答题</th>
                    <th style={thStyle}>提交时间</th>
                    <th style={thStyle}>答题时长</th>
                    <th style={thStyle}>作答题数</th>
                  </tr>
                </thead>
                <tbody>
                  {examAttempts.length === 0 ? (
                    <tr>
                      <td style={emptyCellStyle} colSpan={7}>当前筛选条件下没有考试成绩</td>
                    </tr>
                  ) : examAttempts.map(item => (
                    <tr key={item.id}>
                      <td style={tdStyle}>
                        <strong>{item.nickname}</strong>
                        <div style={tdHintStyle}>{item.username}</div>
                      </td>
                      <td style={tdStyle}>{item.score} / {item.totalScore}</td>
                      <td style={tdStyle}>{item.wrongQuestionNumbers.join('、') || '无'}</td>
                      <td style={tdStyle}>{formatDateTime(item.startedAt)}</td>
                      <td style={tdStyle}>{formatDateTime(item.submittedAt)}</td>
                      <td style={tdStyle}>{formatDuration(item.durationSeconds)}</td>
                      <td style={tdStyle}>{item.answeredCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <div style={sectionEyebrowStyle}>按学生查看</div>
                <h2 style={sectionTitleStyle}>{selectedStudentLabel} 的阶段成绩</h2>
              </div>
            </div>

            <div style={metricGridStyle}>
              <MetricCard label="考试次数" value={`${studentSummary.examCount} 次`} hint="筛选阶段内的个人考试次数" accent="#2f7cff" />
              <MetricCard label="平均分" value={`${studentSummary.averageScore} 分`} hint="该学生的阶段平均成绩" accent="#1dd1a1" />
              <MetricCard label="最好成绩" value={`${studentSummary.bestScore} 分`} hint="该阶段的个人峰值" accent="#ff9f43" />
              <MetricCard label="平均错题数" value={`${studentSummary.averageWrongCount} 题`} hint="错题数越低越稳定" accent="#ff6b6b" />
            </div>

            <div style={chartGridStyle}>
              <BarChart data={barChartData} />
              <LineChart data={lineChartData} />
            </div>

            <div style={tableShellStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>考试</th>
                    <th style={thStyle}>成绩</th>
                    <th style={thStyle}>错题号</th>
                    <th style={thStyle}>提交时间</th>
                    <th style={thStyle}>答题时长</th>
                  </tr>
                </thead>
                <tbody>
                  {studentAttempts.length === 0 ? (
                    <tr>
                      <td style={emptyCellStyle} colSpan={5}>当前筛选条件下没有个人成绩</td>
                    </tr>
                  ) : studentAttempts.map(item => (
                    <tr key={item.id}>
                      <td style={tdStyle}>{item.examTitle}</td>
                      <td style={tdStyle}>{item.score} / {item.totalScore}</td>
                      <td style={tdStyle}>{item.wrongQuestionNumbers.join('、') || '无'}</td>
                      <td style={tdStyle}>{formatDateTime(item.submittedAt)}</td>
                      <td style={tdStyle}>{formatDuration(item.durationSeconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

const heroStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 20,
  flexWrap: 'wrap',
  padding: '30px 32px',
  borderRadius: 28,
  border: '1px solid var(--border-default)',
  background: 'linear-gradient(135deg, color-mix(in oklab, var(--panel-strong) 88%, #2f7cff 12%), color-mix(in oklab, var(--panel-bg) 86%, #1dd1a1 14%))',
  boxShadow: 'var(--shadow-lg)',
}

const eyebrowStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 12px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.16)',
  color: 'var(--text-heading)',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  fontSize: '0.78rem',
}

const heroAsideStyle = {
  minWidth: 180,
  padding: '18px 20px',
  borderRadius: 24,
  background: 'rgba(255,255,255,0.18)',
  border: '1px solid rgba(255,255,255,0.24)',
  backdropFilter: 'blur(16px)',
}

const heroAsideValueStyle = {
  fontSize: '2.2rem',
  fontWeight: 800,
}

const heroAsideLabelStyle = {
  color: 'var(--text-secondary)',
}

const filterCardStyle = {
  marginTop: 24,
  padding: '22px 24px',
  borderRadius: 24,
  border: '1px solid var(--border-default)',
  background: 'var(--panel-glass)',
  boxShadow: 'var(--shadow-md)',
}

const filterGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 16,
}

const fieldStyle = {
  display: 'grid',
  gap: 8,
}

const fieldLabelStyle = {
  fontSize: '0.88rem',
  color: 'var(--text-secondary)',
  fontWeight: 700,
}

const inputStyle = {
  height: 46,
  borderRadius: 14,
  border: '1px solid var(--border-default)',
  background: 'var(--panel-strong)',
  color: 'var(--text-heading)',
  padding: '0 14px',
}

const filterActionsStyle = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  marginTop: 18,
}

const primaryButtonStyle = {
  padding: '11px 16px',
  borderRadius: 14,
  border: 'none',
  cursor: 'pointer',
  color: '#fff',
  fontWeight: 700,
  background: 'linear-gradient(135deg, #2f7cff, #1dd1a1)',
}

const ghostButtonStyle = {
  padding: '11px 16px',
  borderRadius: 14,
  border: '1px solid var(--border-default)',
  cursor: 'pointer',
  color: 'var(--text-heading)',
  fontWeight: 700,
  background: 'var(--panel-soft)',
}

const errorStyle = {
  marginTop: 18,
  padding: '14px 16px',
  borderRadius: 16,
  background: 'var(--status-danger-bg)',
  border: '1px solid var(--status-danger-border)',
  color: 'var(--status-danger-fg)',
}

const loadingStyle = {
  padding: '42px 0',
  textAlign: 'center',
  color: 'var(--text-secondary)',
}

const sectionStyle = {
  marginTop: 28,
  padding: '24px',
  borderRadius: 26,
  border: '1px solid var(--border-default)',
  background: 'var(--panel-glass)',
  boxShadow: 'var(--shadow-md)',
}

const sectionHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'center',
  marginBottom: 18,
}

const sectionEyebrowStyle = {
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontSize: '0.78rem',
  fontWeight: 700,
}

const sectionTitleStyle = {
  margin: '6px 0 0',
  fontSize: '1.65rem',
}

const metricGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 16,
}

const metricCardStyle = {
  padding: '18px 18px 16px',
  borderRadius: 20,
  background: 'var(--panel-strong)',
  border: '1px solid var(--border-default)',
  boxShadow: 'var(--shadow-sm)',
}

const metricLabelStyle = {
  color: 'var(--text-secondary)',
  fontSize: '0.85rem',
  fontWeight: 700,
}

const metricValueStyle = {
  marginTop: 10,
  fontSize: '2rem',
  fontWeight: 800,
}

const metricHintStyle = {
  marginTop: 6,
  color: 'var(--text-muted)',
  lineHeight: 1.5,
  fontSize: '0.9rem',
}

const tableShellStyle = {
  marginTop: 18,
  overflowX: 'auto',
  borderRadius: 20,
  border: '1px solid var(--border-default)',
}

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  minWidth: 920,
  background: 'var(--panel-strong)',
}

const thStyle = {
  textAlign: 'left',
  padding: '14px 16px',
  borderBottom: '1px solid var(--border-default)',
  color: 'var(--text-secondary)',
  fontSize: '0.84rem',
}

const tdStyle = {
  padding: '14px 16px',
  borderBottom: '1px solid color-mix(in oklab, var(--border-default) 76%, transparent)',
  verticalAlign: 'top',
}

const tdHintStyle = {
  marginTop: 4,
  color: 'var(--text-muted)',
  fontSize: '0.82rem',
}

const emptyCellStyle = {
  padding: '26px 16px',
  textAlign: 'center',
  color: 'var(--text-muted)',
}

const chartGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 18,
  marginTop: 18,
}

const chartShellStyle = {
  padding: '18px',
  borderRadius: 22,
  background: 'var(--panel-strong)',
  border: '1px solid var(--border-default)',
}

const chartHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'center',
  marginBottom: 16,
}

const chartTitleStyle = {
  margin: 0,
  fontSize: '1.05rem',
}

const chartMetaStyle = {
  color: 'var(--text-muted)',
  fontSize: '0.84rem',
}

const emptyChartStyle = {
  minHeight: 220,
  display: 'grid',
  placeItems: 'center',
  color: 'var(--text-muted)',
}

const barChartWrapStyle = {
  minHeight: 280,
  display: 'flex',
  alignItems: 'flex-end',
  gap: 14,
  overflowX: 'auto',
  paddingBottom: 8,
}

const barItemStyle = {
  minWidth: 72,
  display: 'grid',
  gap: 8,
}

const barTrackStyle = {
  height: 210,
  borderRadius: 18,
  background: 'linear-gradient(180deg, color-mix(in oklab, var(--panel-soft) 78%, transparent), color-mix(in oklab, var(--panel-bg) 90%, transparent))',
  display: 'flex',
  alignItems: 'flex-end',
  padding: 8,
}

const barFillStyle = {
  width: '100%',
  borderRadius: 12,
  background: 'linear-gradient(180deg, #2f7cff, #1dd1a1)',
}

const barValueStyle = {
  textAlign: 'center',
  fontWeight: 800,
}

const barLabelStyle = {
  textAlign: 'center',
  fontSize: '0.8rem',
  color: 'var(--text-secondary)',
  wordBreak: 'break-word',
}

const lineLegendStyle = {
  display: 'grid',
  gap: 8,
  marginTop: 12,
}

const lineLegendItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  fontSize: '0.88rem',
  color: 'var(--text-secondary)',
}
