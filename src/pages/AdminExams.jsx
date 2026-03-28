import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import API_BASE from '../config/api'
import { buildAuthHeaders } from '../utils/auth'
import { COURSE_LEVELS, DEFAULT_EXAM_LEVEL, formatExamAudienceLabel, normalizeExamAudienceLevels } from '../../shared/courseAccess.js'

const LEVELS = COURSE_LEVELS

function toDatetimeLocal(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toIso(local) {
  if (!local) return ''
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}

function pad(num) {
  return String(num).padStart(2, '0')
}

function splitDatetimeLocal(local) {
  if (!local) return { date: '', time: '' }
  const [date = '', time = ''] = String(local).split('T')
  return { date, time: time.slice(0, 5) }
}

function splitDateParts(dateValue) {
  if (!dateValue) return { year: '', month: '', day: '' }
  const [year = '', month = '', day = ''] = String(dateValue).split('-')
  return { year, month, day }
}

function mergeDateParts(year, month, day) {
  if (!year || !month || !day) return ''
  return `${year}-${month}-${day}`
}

function mergeDatetimeLocal(date, time) {
  if (!date || !time) return ''
  return `${date}T${time}`
}

function clampDay(year, month, day) {
  if (!year || !month) return ''
  const maxDay = new Date(Number(year), Number(month), 0).getDate()
  const numericDay = Number(day || 1)
  return pad(Math.min(Math.max(numericDay, 1), maxDay))
}

function addMinutesToLocal(local, minutes) {
  if (!local) return ''
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return ''
  d.setMinutes(d.getMinutes() + minutes)
  return toDatetimeLocal(d.toISOString())
}

function getDurationMinutes(startTime, endTime) {
  const start = new Date(startTime || '').getTime()
  const end = new Date(endTime || '').getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  return Math.round((end - start) / 60000)
}

function formatScheduleSummary(startTime, endTime) {
  if (!startTime || !endTime) return '请选择开始和结束时间'
  const start = new Date(startTime)
  const end = new Date(endTime)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '时间格式不完整'
  const durationMinutes = getDurationMinutes(startTime, endTime)
  if (durationMinutes <= 0) return '结束时间必须晚于开始时间'
  const durationLabel = durationMinutes >= 60 && durationMinutes % 60 === 0
    ? `${durationMinutes / 60} 小时`
    : `${durationMinutes} 分钟`
  return `${start.toLocaleString()} 至 ${end.toLocaleString()} · 窗口时长 ${durationLabel}`
}

function uniqueOptions(list, key) {
  return Array.from(new Set(list.map(item => item[key]).filter(Boolean)))
}

function buildYearOptions(count = 10) {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: count }, (_, index) => String(currentYear + index))
}

function buildMonthOptions() {
  return Array.from({ length: 12 }, (_, index) => pad(index + 1))
}

function buildDayOptions(year, month) {
  if (!year || !month) return []
  const dayCount = new Date(Number(year), Number(month), 0).getDate()
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)

  return Array.from({ length: dayCount }, (_, index) => {
    const day = pad(index + 1)
    const isToday = Number(year) === today.getFullYear() && Number(month) === today.getMonth() + 1 && Number(day) === today.getDate()
    const isTomorrow = Number(year) === tomorrow.getFullYear() && Number(month) === tomorrow.getMonth() + 1 && Number(day) === tomorrow.getDate()
    return {
      value: day,
      label: `${day}日${isToday ? ' 今天' : isTomorrow ? ' 明天' : ''}`,
    }
  })
}

function buildTimeOptions(stepMinutes = 30) {
  const options = []
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += stepMinutes) {
      const value = `${pad(hour)}:${pad(minute)}`
      options.push({ value, label: value })
    }
  }
  return options
}

function getExamPhase(exam) {
  const now = Date.now()
  const startAt = new Date(exam.startTime || '').getTime()
  const endAt = new Date(exam.endTime || '').getTime()

  if (Number.isFinite(endAt) && endAt < now) {
    return {
      label: '已过期',
      color: 'var(--status-danger-fg)',
      background: 'var(--status-danger-bg)',
      borderColor: 'var(--status-danger-border)',
    }
  }

  if (Number.isFinite(startAt) && startAt > now) {
    return {
      label: '未开始',
      color: 'var(--status-warn-fg)',
      background: 'var(--status-warn-bg)',
      borderColor: 'var(--status-warn-border)',
    }
  }

  return {
    label: '进行中',
    color: 'var(--status-success-fg)',
    background: 'var(--status-success-bg)',
    borderColor: 'var(--status-success-border)',
  }
}

export default function AdminExams() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [list, setList] = useState([])
  const [editingId, setEditingId] = useState('')
  const [editMap, setEditMap] = useState({})
  const [copyingTemplate, setCopyingTemplate] = useState(false)
  const [uploadPreview, setUploadPreview] = useState(null)
  const [form, setForm] = useState({
    title: '',
    totalScore: 100,
    duration: 1800,
    levelRequireds: [DEFAULT_EXAM_LEVEL],
    startTime: '',
    endTime: '',
    file: null,
  })

  const loadExams = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/admin/exams`, {
        headers: buildAuthHeaders(),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setList(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(`加载考试失败：${e?.message || '网络错误'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) loadExams()
  }, [isAdmin])

  const canSubmit = useMemo(() => {
    const durationMinutes = getDurationMinutes(form.startTime, form.endTime)
    return !!form.file && !!form.startTime && !!form.endTime && Number(form.totalScore) > 0 && Number(form.duration) > 0 && durationMinutes > 0
  }, [form])

  const uploadStartParts = useMemo(() => splitDatetimeLocal(form.startTime), [form.startTime])
  const uploadEndParts = useMemo(() => splitDatetimeLocal(form.endTime), [form.endTime])
  const uploadStartDateParts = useMemo(() => splitDateParts(uploadStartParts.date), [uploadStartParts.date])
  const uploadEndDateParts = useMemo(() => splitDateParts(uploadEndParts.date), [uploadEndParts.date])
  const uploadWindowMinutes = useMemo(() => getDurationMinutes(form.startTime, form.endTime), [form.startTime, form.endTime])
  const timeOptions = useMemo(() => buildTimeOptions(30), [])
  const yearOptions = useMemo(() => buildYearOptions(10), [])
  const monthOptions = useMemo(() => buildMonthOptions(), [])
  const startDayOptions = useMemo(
    () => buildDayOptions(uploadStartDateParts.year, uploadStartDateParts.month),
    [uploadStartDateParts.year, uploadStartDateParts.month]
  )
  const endDayOptions = useMemo(
    () => buildDayOptions(uploadEndDateParts.year, uploadEndDateParts.month),
    [uploadEndDateParts.year, uploadEndDateParts.month]
  )

  const buildUploadFormData = () => {
    const fd = new FormData()
    fd.append('file', form.file)
    fd.append('title', form.title || form.file.name.replace(/\.md$/i, ''))
    fd.append('totalScore', String(form.totalScore))
    fd.append('duration', String(form.duration))
    fd.append('levelRequireds', JSON.stringify(form.levelRequireds))
    fd.append('startTime', toIso(form.startTime))
    fd.append('endTime', toIso(form.endTime))
    return fd
  }

  const onPreviewUpload = async () => {
    try {
      setPreviewing(true)
      setError('')
      setOk('')
      setUploadPreview(null)

      const res = await fetch(`${API_BASE}/admin/exams/preview`, {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: buildUploadFormData(),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      setUploadPreview(data)
      setForm(v => ({
        ...v,
        totalScore: String(data.totalScore || v.totalScore),
      }))
      setOk(`预检完成：共解析出 ${data.questionCount} 题，当前总分 ${data.totalScore}`)
    } catch (e) {
      setError(`预检失败：${e?.message || '网络错误'}`)
    } finally {
      setPreviewing(false)
    }
  }

  const onUploadCreate = async () => {
    try {
      setSubmitting(true)
      setError('')
      setOk('')
      const res = await fetch(`${API_BASE}/admin/exams/upload`, {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: buildUploadFormData(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      setOk(`创建成功：${data?.exam?.title || '新考试'}`)
      setForm(v => ({ ...v, file: null, title: '' }))
      setUploadPreview(null)
      await loadExams()
    } catch (e) {
      setError(`创建失败：${e?.message || '网络错误'}`)
    } finally {
      setSubmitting(false)
    }
  }

  const beginEdit = (exam) => {
    setEditingId(exam.id)
    setEditMap({
      title: exam.title || '',
      totalScore: exam.totalScore || 100,
      duration: exam.duration || 60,
      questionCount: exam.questionCount || '',
      levelRequireds: normalizeExamAudienceLevels(exam.levelRequireds || exam.levelRequired),
      startTime: toDatetimeLocal(exam.startTime),
      endTime: toDatetimeLocal(exam.endTime),
      status: exam.status || 'scheduled'
    })
  }

  const saveEdit = async (id) => {
    try {
      setError('')
      const body = {
        ...editMap,
        levelRequireds: normalizeExamAudienceLevels(editMap.levelRequireds),
        startTime: toIso(editMap.startTime),
        endTime: toIso(editMap.endTime),
      }
      const res = await fetch(`${API_BASE}/admin/exams/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      setEditingId('')
      await loadExams()
    } catch (e) {
      setError(`保存失败：${e?.message || '网络错误'}`)
    }
  }

  const onDelete = async (id) => {
    if (!window.confirm('确认删除该考试吗？')) return
    try {
      setError('')
      const res = await fetch(`${API_BASE}/admin/exams/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: buildAuthHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      await loadExams()
    } catch (e) {
      setError(`删除失败：${e?.message || '网络错误'}`)
    }
  }

  const onDownloadTemplate = async () => {
    try {
      setError('')
      const res = await fetch(`${API_BASE}/admin/exams/template-md`, {
        headers: buildAuthHeaders(),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'exam-template.md'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setOk('已下载标准试卷模板')
    } catch (e) {
      setError(`下载模板失败：${e?.message || '网络错误'}`)
    }
  }

  const onCopyTemplate = async () => {
    try {
      setCopyingTemplate(true)
      setError('')
      const res = await fetch(`${API_BASE}/admin/exams/template-md`, {
        headers: buildAuthHeaders(),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const text = await res.text()
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        textarea.remove()
      }
      setOk('模板内容已复制到剪贴板')
    } catch (e) {
      setError(`复制模板失败：${e?.message || '网络错误'}`)
    } finally {
      setCopyingTemplate(false)
    }
  }

  const updateUploadDatePart = (field, part, value) => {
    setUploadPreview(null)
    setForm(prev => {
      const current = splitDatetimeLocal(prev[field])
      const currentDateParts = splitDateParts(current.date)
      let nextDate = current.date
      let nextTime = current.time || '08:00'

      if (part === 'time') {
        nextTime = value
      } else {
        const nextDateParts = {
          ...currentDateParts,
          [part]: value,
        }

        if (part === 'year') {
          nextDateParts.month = nextDateParts.month || '01'
          nextDateParts.day = clampDay(nextDateParts.year, nextDateParts.month, nextDateParts.day || '01')
        }

        if (part === 'month') {
          nextDateParts.year = nextDateParts.year || yearOptions[0] || String(new Date().getFullYear())
          nextDateParts.day = clampDay(nextDateParts.year, nextDateParts.month, nextDateParts.day || '01')
        }

        if (part === 'day') {
          nextDateParts.year = nextDateParts.year || yearOptions[0] || String(new Date().getFullYear())
          nextDateParts.month = nextDateParts.month || '01'
          nextDateParts.day = clampDay(nextDateParts.year, nextDateParts.month, nextDateParts.day || value || '01')
        }

        nextDate = mergeDateParts(nextDateParts.year, nextDateParts.month, nextDateParts.day)
      }

      return {
        ...prev,
        [field]: mergeDatetimeLocal(nextDate, nextTime),
      }
    })
  }

  const applyQuickWindow = ({ startOffsetMinutes, durationMinutes, baseDate = new Date(), startHour, startMinute = 0 }) => {
    const start = new Date(baseDate)
    if (typeof startOffsetMinutes === 'number') {
      start.setMinutes(start.getMinutes() + startOffsetMinutes)
    }
    if (typeof startHour === 'number') {
      start.setHours(startHour, startMinute, 0, 0)
    } else {
      start.setSeconds(0, 0)
    }
    const end = new Date(start.getTime() + durationMinutes * 60000)
    setUploadPreview(null)
    setForm(prev => ({
      ...prev,
      startTime: toDatetimeLocal(start.toISOString()),
      endTime: toDatetimeLocal(end.toISOString()),
    }))
  }

  const applyQuickEnd = (minutes) => {
    setUploadPreview(null)
    setForm(prev => ({
      ...prev,
      endTime: addMinutesToLocal(prev.startTime, minutes),
    }))
  }

  if (!isAdmin) {
    return <div className="container" style={{ padding: 32 }}><h2>无权限</h2></div>
  }

  return (
    <motion.div className="container" style={{ padding: 32, maxWidth: 1320 }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 18,
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        marginBottom: 18,
        padding: '28px 30px',
        borderRadius: 30,
        background: 'var(--panel-glass)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-lg)',
        backdropFilter: 'blur(18px)',
      }}>
        <div>
          <div style={adminEyebrowStyle}>Exam Atelier</div>
          <h2 style={{ marginBottom: 10 }}>考试管理后台</h2>
          <p style={{ margin: 0, maxWidth: 680, color: 'var(--text-secondary)', lineHeight: 1.75 }}>
            在这里完成试卷模板下载、试卷预检、考试时间编排与状态管理。整体面板已经同步 light / night 主题，状态色也会随主题切换保持清晰。
          </p>
        </div>
        <div style={adminSummaryCardStyle}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 4 }}>当前考试总数</div>
          <div style={{ color: 'var(--text-heading)', fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>{list.length}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 8 }}>包含未开始、进行中和已过期考试</div>
        </div>
      </div>

      <div style={{ border: '1px solid var(--border-default)', borderRadius: 28, padding: 24, background: 'var(--panel-strong)', boxShadow: 'var(--shadow-md)', marginBottom: 22 }}>
        <h3 style={{ marginBottom: 14 }}>上传考试文件并创建考试</h3>
        <div style={{
          marginBottom: 16,
          padding: 16,
          borderRadius: 18,
          border: '1px dashed var(--border-default)',
          background: 'var(--panel-bg)'
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>标准试卷模板</div>
          <div style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 12 }}>
            题目文件建议使用统一 Markdown 模板，包含 frontmatter、单选题、判断题、完善程序题三个区块。
            其中正确答案用下划线包裹选项，例如 `_B. 正确答案_`。
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onDownloadTemplate}
              style={templateGhostButtonStyle}
            >
              下载模板
            </button>
            <button
              type="button"
              onClick={onCopyTemplate}
              style={templateGhostButtonStyle}
            >
              {copyingTemplate ? '复制中...' : '复制模板'}
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(240px, 1fr))', gap: 12 }}>
          <input value={form.title} onChange={e => setForm(v => ({ ...v, title: e.target.value }))} placeholder="考试标题（可选）" style={formInputStyle} />
          <input
            type="file"
            accept=".md,text/markdown"
            onChange={e => {
              setUploadPreview(null)
              setForm(v => ({ ...v, file: e.target.files?.[0] || null }))
            }}
            style={formInputStyle}
          />
          <input type="number" value={form.totalScore} onChange={e => setForm(v => ({ ...v, totalScore: e.target.value }))} placeholder="总分" style={formInputStyle} />
          <input type="number" value={form.duration} onChange={e => setForm(v => ({ ...v, duration: e.target.value }))} placeholder="时长（分钟）" style={formInputStyle} />
          <div style={{ ...formInputStyle, display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
            {uploadPreview ? `按解析结果建卷：${uploadPreview.questionCount} 题` : '上传后按解析出的实际题量建卷'}
          </div>
          <div style={{ ...formInputStyle, display: 'grid', gap: 8 }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>可参加等级</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {LEVELS.map(level => {
                const checked = form.levelRequireds.includes(level)
                return (
                  <label key={level} style={levelChipLabelStyle(checked)}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setForm(v => {
                        const next = checked
                          ? v.levelRequireds.filter(item => item !== level)
                          : [...v.levelRequireds, level]
                        return {
                          ...v,
                          levelRequireds: normalizeExamAudienceLevels(next),
                        }
                      })}
                    />
                    <span>{level}</span>
                  </label>
                )
              })}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              当前可见范围：{formatExamAudienceLabel(form.levelRequireds)}
            </div>
          </div>
        </div>

        <div style={{
          marginTop: 16,
          padding: 18,
          borderRadius: 24,
          border: '1px solid var(--border-default)',
          background: 'var(--panel-glass)',
          boxShadow: 'var(--shadow-md)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>考试时间窗口</div>
              <div style={{ marginTop: 4, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                分开设置日期和时刻，并可用快捷方案快速生成整段考试窗口
              </div>
            </div>
            <div style={{
              padding: '8px 12px',
              borderRadius: 999,
              background: uploadWindowMinutes > 0 ? 'var(--status-success-bg)' : 'var(--status-warn-bg)',
              color: uploadWindowMinutes > 0 ? 'var(--status-success-fg)' : 'var(--status-warn-fg)',
              fontWeight: 700,
              fontSize: '0.85rem',
              border: `1px solid ${uploadWindowMinutes > 0 ? 'var(--status-success-border)' : 'var(--status-warn-border)'}`,
            }}>
              {formatScheduleSummary(form.startTime, form.endTime)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <button type="button" onClick={() => applyQuickWindow({ startHour: 20, startMinute: 0, durationMinutes: 120 })} style={timePresetGhostStyle}>今天 20:00 开始</button>
            <button type="button" onClick={() => {
              const tomorrow = new Date()
              tomorrow.setDate(tomorrow.getDate() + 1)
              applyQuickWindow({ baseDate: tomorrow, startHour: 8, startMinute: 0, durationMinutes: 120 })
            }} style={timePresetGhostStyle}>明天 08:00 开始</button>
            <button type="button" onClick={() => applyQuickWindow({ startOffsetMinutes: 10, durationMinutes: 90 })} style={timePresetGhostStyle}>10 分钟后开始</button>
            <button type="button" onClick={() => applyQuickWindow({ startOffsetMinutes: 30, durationMinutes: 120 })} style={timePresetGhostStyle}>30 分钟后开始</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            <div style={timeCardStyle}>
              <div style={timeCardLabelStyle}>开始时间</div>
              <div style={timeFieldGridStyle}>
                <label style={timeFieldLabelStyle}>
                  <span>日期</span>
                  <div style={dateSelectGridStyle}>
                    <select
                      value={uploadStartDateParts.year}
                      onChange={e => updateUploadDatePart('startTime', 'year', e.target.value)}
                      style={timeInputStyle}
                    >
                      <option value="">年</option>
                      {yearOptions.map(year => <option key={year} value={year}>{year}年</option>)}
                    </select>
                    <select
                      value={uploadStartDateParts.month}
                      onChange={e => updateUploadDatePart('startTime', 'month', e.target.value)}
                      style={timeInputStyle}
                    >
                      <option value="">月</option>
                      {monthOptions.map(month => <option key={month} value={month}>{month}月</option>)}
                    </select>
                    <select
                      value={uploadStartDateParts.day}
                      onChange={e => updateUploadDatePart('startTime', 'day', e.target.value)}
                      style={timeInputStyle}
                    >
                      <option value="">日</option>
                      {startDayOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                </label>
                <label style={timeFieldLabelStyle}>
                  <span>时刻</span>
                  <select
                    value={uploadStartParts.time}
                    onChange={e => updateUploadDatePart('startTime', 'time', e.target.value)}
                    style={timeInputStyle}
                  >
                    <option value="">请选择时刻</option>
                    {timeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              </div>
            </div>

            <div style={timeCardStyle}>
              <div style={timeCardLabelStyle}>结束时间</div>
              <div style={timeFieldGridStyle}>
                <label style={timeFieldLabelStyle}>
                  <span>日期</span>
                  <div style={dateSelectGridStyle}>
                    <select
                      value={uploadEndDateParts.year}
                      onChange={e => updateUploadDatePart('endTime', 'year', e.target.value)}
                      style={timeInputStyle}
                    >
                      <option value="">年</option>
                      {yearOptions.map(year => <option key={year} value={year}>{year}年</option>)}
                    </select>
                    <select
                      value={uploadEndDateParts.month}
                      onChange={e => updateUploadDatePart('endTime', 'month', e.target.value)}
                      style={timeInputStyle}
                    >
                      <option value="">月</option>
                      {monthOptions.map(month => <option key={month} value={month}>{month}月</option>)}
                    </select>
                    <select
                      value={uploadEndDateParts.day}
                      onChange={e => updateUploadDatePart('endTime', 'day', e.target.value)}
                      style={timeInputStyle}
                    >
                      <option value="">日</option>
                      {endDayOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                </label>
                <label style={timeFieldLabelStyle}>
                  <span>时刻</span>
                  <select
                    value={uploadEndParts.time}
                    onChange={e => updateUploadDatePart('endTime', 'time', e.target.value)}
                    style={timeInputStyle}
                  >
                    <option value="">请选择时刻</option>
                    {timeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                {[60, 90, 120, 180].map(minutes => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => applyQuickEnd(minutes)}
                    disabled={!form.startTime}
                    style={{
                      ...timePresetGhostStyle,
                      opacity: form.startTime ? 1 : 0.5,
                      cursor: form.startTime ? 'pointer' : 'not-allowed',
                    }}
                  >
                    结束 = 开始 + {minutes} 分钟
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 14, alignItems: 'center' }}>
          <button disabled={!canSubmit || previewing} onClick={onPreviewUpload} style={previewButtonStyle}>
            {previewing ? '预检中...' : '先解析预检'}
          </button>
          <button disabled={!canSubmit || submitting} onClick={onUploadCreate} style={createButtonStyle}>
            {submitting ? '创建中...' : '确认创建考试'}
          </button>
          {ok && <span style={{ color: 'var(--status-success-fg)', fontWeight: 600 }}>{ok}</span>}
          {error && <span style={{ color: 'var(--danger)' }}>{error}</span>}
        </div>
        {uploadPreview && (
          <div style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 18,
            border: '1px solid var(--border-default)',
            background: 'var(--panel-bg)'
          }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>解析预览</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12, color: 'var(--text-muted)' }}>
              <span>标题：{uploadPreview.title}</span>
              <span>语言：{uploadPreview.language}</span>
              <span>总题数：{uploadPreview.questionCount}</span>
              <span>总分：{uploadPreview.totalScore}</span>
              <span>原始分值：{uploadPreview.rawTotalScore}</span>
              <span>单选：{uploadPreview.sectionCounts?.single || 0}</span>
              <span>判断：{uploadPreview.sectionCounts?.judge || 0}</span>
              <span>程序完善：{uploadPreview.sectionCounts?.code_completion || 0}</span>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {uploadPreview.previewQuestions?.map((item, index) => (
                <div key={item.id || index} style={{
                  padding: '10px 12px',
                  borderRadius: 14,
                  background: 'var(--panel-soft)',
                  border: '1px solid var(--border-default)'
                }}>
                  <div style={{ fontWeight: 600 }}>{index + 1}. {item.title}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    分区：{item.section} · 题型：{item.type} · 选项数：{item.optionCount}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div style={{ border: '1px solid var(--border-default)', borderRadius: 28, padding: 24, background: 'var(--panel-strong)', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>考试列表</h3>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            管理员可查看全部考试，包括未开始、进行中和已过期考试
          </div>
        </div>
        {loading ? (
          <div>加载中...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: 10 }}>标题</th>
                  <th style={{ padding: 10 }}>状态</th>
                  <th style={{ padding: 10 }}>总分</th>
                  <th style={{ padding: 10 }}>时长</th>
                  <th style={{ padding: 10 }}>题量</th>
                  <th style={{ padding: 10 }}>可参加等级</th>
                  <th style={{ padding: 10 }}>时间段</th>
                  <th style={{ padding: 10 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map(exam => {
                  const editing = editingId === exam.id
                  const phase = getExamPhase(exam)
                  return (
                    <tr key={exam.id}>
                      <td style={{ padding: 10 }}>{editing ? <input value={editMap.title} onChange={e => setEditMap(v => ({ ...v, title: e.target.value }))} /> : exam.title}</td>
                      <td style={{ padding: 10 }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 10px',
                          borderRadius: 999,
                          color: phase.color,
                          background: phase.background,
                          border: `1px solid ${phase.borderColor}`,
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          whiteSpace: 'nowrap',
                        }}>
                          <span style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: phase.color,
                            display: 'inline-block',
                          }} />
                          {phase.label}
                        </span>
                      </td>
                      <td style={{ padding: 10 }}>{editing ? <input type="number" value={editMap.totalScore} onChange={e => setEditMap(v => ({ ...v, totalScore: e.target.value }))} style={{ width: 80 }} /> : (exam.totalScore || 100)}</td>
                      <td style={{ padding: 10 }}>{editing ? <input type="number" value={editMap.duration} onChange={e => setEditMap(v => ({ ...v, duration: e.target.value }))} style={{ width: 80 }} /> : `${Math.round(exam.duration / 60)}分钟`}</td>
                      <td style={{ padding: 10 }}>{editing ? <input type="number" value={editMap.questionCount} onChange={e => setEditMap(v => ({ ...v, questionCount: e.target.value }))} style={{ width: 80 }} /> : exam.questionCount}</td>
                      <td style={{ padding: 10 }}>
                        {editing ? (
                          <div style={{ display: 'grid', gap: 8 }}>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {LEVELS.map(level => {
                                const checked = normalizeExamAudienceLevels(editMap.levelRequireds).includes(level)
                                return (
                                  <label key={level} style={levelChipLabelStyle(checked)}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => setEditMap(v => {
                                        const current = normalizeExamAudienceLevels(v.levelRequireds)
                                        const next = checked
                                          ? current.filter(item => item !== level)
                                          : [...current, level]
                                        return {
                                          ...v,
                                          levelRequireds: normalizeExamAudienceLevels(next),
                                        }
                                      })}
                                    />
                                    <span>{level}</span>
                                  </label>
                                )
                              })}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                              {formatExamAudienceLabel(editMap.levelRequireds)}
                            </div>
                          </div>
                        ) : formatExamAudienceLabel(exam.levelRequireds || exam.levelRequired)}
                      </td>
                      <td style={{ padding: 10 }}>
                        {editing ? (
                          <div style={{ display: 'grid', gap: 6 }}>
                            <input type="datetime-local" value={editMap.startTime} onChange={e => setEditMap(v => ({ ...v, startTime: e.target.value }))} />
                            <input type="datetime-local" value={editMap.endTime} onChange={e => setEditMap(v => ({ ...v, endTime: e.target.value }))} />
                          </div>
                        ) : (
                          <div>{new Date(exam.startTime).toLocaleString()} ~ {new Date(exam.endTime).toLocaleString()}</div>
                        )}
                      </td>
                      <td style={{ padding: 10 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {!editing ? (
                            <button onClick={() => beginEdit(exam)} style={tableGhostButtonStyle}>编辑</button>
                          ) : (
                            <>
                              <button onClick={() => saveEdit(exam.id)} style={tablePrimaryButtonStyle}>保存</button>
                              <button onClick={() => setEditingId('')} style={tableGhostButtonStyle}>取消</button>
                            </>
                          )}
                          <button onClick={() => onDelete(exam.id)} style={tableDangerButtonStyle}>删除</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  )
}

const adminEyebrowStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 12px',
  borderRadius: 999,
  marginBottom: 14,
  background: 'var(--status-info-bg)',
  color: 'var(--status-info-fg)',
  fontSize: '0.82rem',
  fontWeight: 800,
  letterSpacing: '0.08em',
}

const adminSummaryCardStyle = {
  minWidth: 220,
  padding: '18px 20px',
  borderRadius: 24,
  background: 'var(--panel-strong)',
  border: '1px solid var(--border-default)',
  boxShadow: 'var(--shadow-md)',
}

const levelChipLabelStyle = (checked) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 12px',
  borderRadius: 999,
  border: `1px solid ${checked ? 'var(--status-success-border)' : 'var(--border-default)'}`,
  background: checked ? 'var(--status-success-bg)' : 'var(--panel-soft)',
  color: checked ? 'var(--status-success-fg)' : 'var(--text-body)',
  fontSize: '0.88rem',
  fontWeight: 600,
  cursor: 'pointer',
})

const templateGhostButtonStyle = {
  padding: '9px 16px',
  borderRadius: 999,
  border: '1px solid var(--border-default)',
  background: 'var(--panel-soft)',
  cursor: 'pointer',
  color: 'var(--text-body)',
  fontWeight: 700,
}

const formInputStyle = {
  padding: '11px 13px',
  borderRadius: 14,
  border: '1px solid var(--border-default)',
  background: 'var(--panel-bg)',
  color: 'var(--text-body)',
}

const previewButtonStyle = {
  padding: '10px 16px',
  borderRadius: 12,
  border: '1px solid var(--border-default)',
  cursor: 'pointer',
  background: 'var(--panel-soft)',
  color: 'var(--text-body)',
  fontWeight: 700,
}

const createButtonStyle = {
  padding: '10px 16px',
  borderRadius: 12,
  border: 'none',
  cursor: 'pointer',
  background: 'linear-gradient(135deg, var(--primary), var(--accent-secondary))',
  color: 'white',
  fontWeight: 800,
  boxShadow: 'var(--shadow-glow)',
}

const timePresetGhostStyle = {
  padding: '9px 14px',
  borderRadius: 999,
  border: '1px solid var(--border-default)',
  background: 'var(--panel-soft)',
  color: 'var(--text-body)',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.86rem',
}

const timeCardStyle = {
  padding: 16,
  borderRadius: 20,
  background: 'var(--panel-bg)',
  border: '1px solid var(--border-default)',
  boxShadow: 'var(--shadow-sm)',
}

const timeCardLabelStyle = {
  fontWeight: 700,
  color: 'var(--text-heading)',
  marginBottom: 10,
}

const timeFieldGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 12,
}

const timeFieldLabelStyle = {
  display: 'grid',
  gap: 6,
  fontSize: '0.86rem',
  color: 'var(--text-muted)',
}

const dateSelectGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1.1fr 0.9fr 0.9fr',
  gap: 8,
}

const timeInputStyle = {
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid var(--border-default)',
  background: 'var(--panel-soft)',
  color: 'var(--text-body)',
}

const tableGhostButtonStyle = {
  border: '1px solid var(--border-default)',
  background: 'var(--panel-soft)',
  borderRadius: 10,
  padding: '6px 10px',
  cursor: 'pointer',
  color: 'var(--text-body)',
}

const tablePrimaryButtonStyle = {
  border: 'none',
  background: 'linear-gradient(135deg, var(--primary), var(--accent-secondary))',
  color: 'white',
  borderRadius: 10,
  padding: '6px 10px',
  cursor: 'pointer',
  fontWeight: 700,
}

const tableDangerButtonStyle = {
  border: '1px solid var(--status-danger-border)',
  color: 'var(--status-danger-fg)',
  background: 'var(--status-danger-bg)',
  borderRadius: 10,
  padding: '6px 10px',
  cursor: 'pointer',
}
