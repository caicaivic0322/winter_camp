import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import API_BASE from '../../config/api'
import { buildAuthHeaders } from '../../utils/auth'

export default function WrongBook() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState('all')
  const [showAnswer, setShowAnswer] = useState({})
  const sanitizeText = (value) =>
    String(value || '')
      .replace(/`/g, '')
      .replace(/^['"“”‘’]+|['"“”‘’]+$/g, '')
      .replace(/\*\*/g, '')
      .replace(/\s*[（(]\s*[　 ]*[√×][　 ]*[）)]\s*$/g, '')
      .trim()
  const renderMathToken = (expr, keyPrefix = 'm') => {
    const normalized = String(expr || '')
      .replace(/\\times/g, '×')
      .replace(/\\cdot/g, '·')
      .replace(/\\leq/g, '≤')
      .replace(/\\geq/g, '≥')
      .replace(/\\log/g, 'log')
      .replace(/\^\{([^}]+)\}/g, '^$1')
      .trim()
    const regex = /([A-Za-z0-9)\]])\^([A-Za-z0-9+\-]+)/g
    const parts = []
    let lastIndex = 0
    let match
    let i = 0
    while ((match = regex.exec(normalized)) !== null) {
      const start = match.index
      if (start > lastIndex) parts.push(<span key={`${keyPrefix}-t-${i++}`}>{normalized.slice(lastIndex, start)}</span>)
      parts.push(<span key={`${keyPrefix}-s-${i++}`}>{match[1]}<sup>{match[2]}</sup></span>)
      lastIndex = start + match[0].length
    }
    if (lastIndex < normalized.length) parts.push(<span key={`${keyPrefix}-tail`}>{normalized.slice(lastIndex)}</span>)
    return parts.length ? parts : normalized
  }
  const renderInlineRich = (value) => {
    const clean = sanitizeText(value)
    const tokenRegex = /(`[^`]+`|\$[^$]+\$)/g
    const segments = clean.split(tokenRegex).filter(Boolean)
    return segments.map((part, idx) => {
      const isCode = /^`[^`]+`$/.test(part)
      const isMath = /^\$[^$]+\$$/.test(part)
      if (isCode || isMath) {
        const token = sanitizeText(part.slice(1, -1))
        return (
          <span key={idx} style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>
            {isMath ? renderMathToken(token, `math-${idx}`) : token}
          </span>
        )
      }
      return <span key={idx}>{part}</span>
    })
  }
  const normalizeOptions = (options = []) => {
    const list = []
    const seen = new Set()
    for (const opt of options) {
      const label = String(opt?.label || '').trim()
      const text = sanitizeText(opt?.text || '')
      if (!label || !text) continue
      const key = `${label}::${text}`
      if (seen.has(key)) continue
      seen.add(key)
      list.push({ label, text })
    }
    return list
  }

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`${API_BASE}/my/wrong-book`, {
          headers: buildAuthHeaders(),
        })
        const data = await res.json()
        setItems(Array.isArray(data) ? data : [])
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [user.username])

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (type !== 'all' && item.type !== type) return false
      if (!keyword) return true
      return String(item.title || '').toLowerCase().includes(keyword.toLowerCase())
    })
  }, [items, type, keyword])

  const toggleAnswer = (id) => setShowAnswer(prev => ({ ...prev, [id]: !prev[id] }))

  if (loading) return <div style={{ padding: '24px' }}>加载错题本中...</div>

  return (
    <div style={{ padding: '28px 24px 40px', maxWidth: '1120px', margin: '0 auto' }}>
      <div style={{
        padding: '30px 28px',
        borderRadius: 28,
        marginBottom: 24,
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
              background: 'var(--status-warn-bg)',
              border: '1px solid var(--status-warn-border)',
              color: 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 700,
            }}>
              Review Studio
            </div>
            <h2 style={{ marginBottom: '10px' }}>错题本</h2>
            <div style={{ color: 'var(--text-secondary)' }}>
              共 {filtered.length} 题，累计错误记录 {items.reduce((s, x) => s + (x.wrongCount || 1), 0)} 次
            </div>
          </div>
          <div style={{
            minWidth: 190,
            padding: '16px 18px',
            borderRadius: 22,
            background: 'var(--panel-strong)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-md)',
          }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 4 }}>当前登录用户</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading)' }}>{user?.nickname || user?.username}</div>
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        padding: '14px',
        borderRadius: 22,
        background: 'var(--panel-bg)',
        border: '1px solid var(--border-default)',
      }}>
        <input
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          placeholder="搜索题干关键词"
          style={{
            minWidth: '260px',
            flex: '1 1 260px',
            padding: '12px 14px',
            borderRadius: '14px',
            border: '1px solid var(--border-default)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)'
          }}
        />
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          style={{
            padding: '12px 14px',
            borderRadius: '14px',
            border: '1px solid var(--border-default)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)'
          }}
        >
          <option value="all">全部题型</option>
          <option value="single">单选题</option>
          <option value="judge">判断题</option>
        </select>
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: '28px', border: '1px dashed var(--border-default)', borderRadius: '18px', background: 'var(--bg-elevated)' }}>
          暂无错题，继续保持！
        </div>
      )}

      {filtered.map((item, idx) => (
        <div key={item.questionId} style={{
          marginBottom: '20px',
          border: '1px solid var(--border-default)',
          borderRadius: '24px',
          background: 'linear-gradient(180deg, color-mix(in oklab, var(--panel-strong) 96%, transparent), color-mix(in oklab, var(--panel-bg) 82%, transparent))',
          padding: '20px',
          boxShadow: 'var(--shadow-lg)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '1.08rem', lineHeight: 1.65 }}>{idx + 1}. {renderInlineRich(item.title)}</h4>
            <span style={{ color: 'var(--status-danger-fg)', fontWeight: 700, whiteSpace: 'nowrap', padding: '6px 12px', borderRadius: 999, background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)' }}>错 {item.wrongCount} 次</span>
          </div>

          {item.codeSnippet && (
            <pre style={{
              marginTop: '10px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--exam-code-border)',
              background: 'var(--exam-code-bg)',
              color: 'var(--exam-code-text)',
              overflowX: 'auto',
              whiteSpace: 'pre'
            }}>
              <code style={{ color: 'inherit' }}>{item.codeSnippet}</code>
            </pre>
          )}

          {item.type === 'single' && Array.isArray(item.options) && item.options.length > 0 && (
            <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
              {normalizeOptions(item.options).map((opt, optionIdx) => (
                <div key={`${opt.label}-${optionIdx}`} style={{
                  padding: '10px 12px',
                  border: '1px solid var(--border-default)',
                  borderRadius: '14px',
                  background: 'var(--panel-soft)'
                }}>
                  <b>{opt.label}.</b> {renderInlineRich(opt.text)}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
              最近错误答案：{sanitizeText(item.lastYourAnswer || '未作答')}
            </span>
            <button
              onClick={() => toggleAnswer(item.questionId)}
              style={{
                border: '1px solid var(--border-default)',
                background: 'var(--panel-bg)',
                color: 'var(--text-primary)',
                borderRadius: '12px',
                padding: '8px 12px',
                cursor: 'pointer'
              }}
            >
              {showAnswer[item.questionId] ? '隐藏答案' : '显示答案'}
            </button>
            {showAnswer[item.questionId] && (
              <span style={{ color: 'var(--status-success-fg)', fontWeight: 700 }}>正确答案：{sanitizeText(item.correctAnswer)}</span>
            )}
          </div>

          {item.analysis && (
            <div style={{
              marginTop: '14px',
              padding: '14px 16px',
              borderRadius: '16px',
              background: 'var(--panel-bg)',
              border: '1px solid var(--border-default)',
            }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8 }}>
                错题解析
              </div>
              <div style={{ color: 'var(--text-body)', lineHeight: 1.75 }}>
                {item.analysis}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
