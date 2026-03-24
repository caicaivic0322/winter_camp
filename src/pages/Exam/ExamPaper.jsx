import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import API_BASE from '../../config/api'
import { buildAuthHeaders } from '../../utils/auth'
import { clearExamSession, hydrateExamSession, readExamSession, writeExamSession } from '../../utils/examSession'

const sectionConfig = [
  { key: 'single', title: '单选题', accent: 'var(--status-success-fg)' },
  { key: 'judge', title: '判断题', accent: 'var(--status-warn-fg)' },
  { key: 'code_completion', title: '程序完善', accent: 'var(--status-info-fg)' },
]

const pageStyle = {
  minHeight: '100vh',
  background: 'var(--page-gradient)',
  color: 'var(--text-heading)',
}

export default function ExamPaper() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const prefersReducedMotion = useReducedMotion()

  const [exam, setExam] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [submissionReceipt, setSubmissionReceipt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [isCompact, setIsCompact] = useState(() => window.innerWidth < 960)
  const [expiresAt, setExpiresAt] = useState(null)
  const [redirectCountdown, setRedirectCountdown] = useState(10)

  const timerRef = useRef(null)
  const sessionRef = useRef(null)
  const examRef = useRef(null)
  const answersRef = useRef({})
  const submittedRef = useRef(false)

  const displayOptionText = (value) =>
    String(value || '')
      .replace(/`/g, '')
      .trim()

  const displayQuestionTitle = (value) =>
    String(value || '')
      .replace(/^\*\*/, '')
      .replace(/\*\*$/, '')
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
      parts.push(
        <span key={`${keyPrefix}-s-${i++}`}>
          {match[1]}
          <sup>{match[2]}</sup>
        </span>
      )
      lastIndex = start + match[0].length
    }

    if (lastIndex < normalized.length) parts.push(<span key={`${keyPrefix}-tail`}>{normalized.slice(lastIndex)}</span>)
    return parts.length ? parts : normalized
  }

  const renderInlineRich = (value, stripJudge = false) => {
    const clean = stripJudge ? displayQuestionTitle(value) : String(value || '')
    const tokenRegex = /(`[^`]+`|\$[^$]+\$)/g
    const segments = clean.split(tokenRegex).filter(Boolean)

    return segments.map((part, idx) => {
      const isCode = /^`[^`]+`$/.test(part)
      const isMath = /^\$[^$]+\$$/.test(part)
      if (isCode || isMath) {
        const token = part.slice(1, -1)
          .replace(/^['"“”‘’]+|['"“”‘’]+$/g, '')
          .trim()
        return (
          <span key={idx} style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>
            {isMath ? renderMathToken(token, `math-${idx}`) : token}
          </span>
        )
      }
      return <span key={idx}>{part}</span>
    })
  }

  const buildQuestionBlocks = (questions = []) => {
    const blocks = []
    questions.forEach(q => {
      const blankMatch = String(q.title || '').match(/^(.*)\s*-\s*填空\s*([①-⑩])\s*$/)
      if (q.codeSnippet && blankMatch) {
        const baseTitle = blankMatch[1].trim()
        const blankNo = blankMatch[2]
        const last = blocks[blocks.length - 1]
        if (
          last &&
          last.kind === 'cloze' &&
          last.baseTitle === baseTitle &&
          last.codeSnippet === q.codeSnippet &&
          last.section === (q.section || 'code_completion')
        ) {
          last.items.push({ ...q, blankNo })
        } else {
          blocks.push({
            kind: 'cloze',
            section: q.section || 'code_completion',
            baseTitle,
            codeSnippet: q.codeSnippet,
            items: [{ ...q, blankNo }],
          })
        }
      } else {
        blocks.push({
          kind: 'normal',
          section: q.section || (q.type === 'judge' ? 'judge' : 'single'),
          question: q,
        })
      }
    })
    return blocks
  }

  const questionCards = useMemo(() => {
    if (!exam?.questions) return []

    const cards = []
    buildQuestionBlocks(exam.questions).forEach(block => {
      if (block.kind === 'normal') {
        const sectionMeta = sectionConfig.find(item => item.key === block.section) || sectionConfig[0]
        cards.push({
          id: block.question.id,
          questionId: block.question.id,
          section: block.section,
          sectionTitle: sectionMeta.title,
          accent: sectionMeta.accent,
          title: displayQuestionTitle(block.question.title),
          description: block.question.description || '',
          rawTitle: block.question.title,
          scoreLabel: `${block.question.score}分`,
          codeSnippet: block.question.codeSnippet || '',
          type: block.question.type,
          options: block.question.options || [],
        })
        return
      }

      const sectionMeta = sectionConfig.find(item => item.key === block.section) || sectionConfig[2]
      block.items.forEach(item => {
        cards.push({
          id: item.id,
          questionId: item.id,
          section: block.section,
          sectionTitle: sectionMeta.title,
          accent: sectionMeta.accent,
          title: `${block.baseTitle} · 填空 ${item.blankNo}`,
          description: item.description || '',
          rawTitle: block.baseTitle,
          scoreLabel: `${item.score}分`,
          codeSnippet: block.codeSnippet || '',
          type: 'single',
          options: item.options || [],
        })
      })
    })

    return cards
  }, [exam])

  const activeCard = questionCards[activeIndex]
  const answeredCount = questionCards.filter(card => Boolean(answers[card.questionId])).length
  const unansweredCount = questionCards.length - answeredCount

  useEffect(() => {
    examRef.current = exam
  }, [exam])

  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  useEffect(() => {
    submittedRef.current = submitted
  }, [submitted])

  useEffect(() => {
    fetchPaper()
    return () => clearInterval(timerRef.current)
  }, [id])

  useEffect(() => {
    const onResize = () => setIsCompact(window.innerWidth < 960)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!expiresAt || submitted) return undefined

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
      setTimeLeft(remaining)

      if (remaining <= 0) {
        clearInterval(timerRef.current)
        submitExam({ auto: true })
      }
    }

    tick()
    timerRef.current = setInterval(tick, 1000)
    return () => clearInterval(timerRef.current)
  }, [submitted, expiresAt])

  useEffect(() => {
    if (!exam || submitted || !user?.username || !sessionRef.current) return
    const nextSession = {
      ...sessionRef.current,
      answers,
    }
    sessionRef.current = nextSession
    writeExamSession(localStorage, nextSession)
  }, [answers, exam, submitted, user?.username])

  useEffect(() => {
    if (!exam || submitted) return undefined

    const beforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = '考试仍在进行中，离开后倒计时不会暂停。'
      return event.returnValue
    }

    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [exam, submitted])

  useEffect(() => {
    if (!submissionReceipt?.attemptId) return undefined

    setRedirectCountdown(10)

    const timer = setInterval(() => {
      setRedirectCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate('/my/exam-results', { replace: true })
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [submissionReceipt, navigate])

  const fetchPaper = async () => {
    try {
      const res = await fetch(`${API_BASE}/exams/${id}/start`, {
        headers: buildAuthHeaders(),
      })
      if (res.status === 401) {
        logout()
        alert('登录状态已失效，请重新登录后再进入考试')
        navigate('/login', { replace: true })
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      const storedSession = readExamSession(localStorage, user?.username, id)
      const { session, timeLeft: restoredTimeLeft, isExpired } = hydrateExamSession({
        storedSession,
        username: user?.username,
        examId: id,
        durationSeconds: data.duration,
      })

      sessionRef.current = session
      setExam(data)
      setAnswers(session.answers || {})
      setExpiresAt(session.expiresAt)
      setTimeLeft(restoredTimeLeft)
      writeExamSession(localStorage, session)
      setLoading(false)

      if (isExpired && !session.submitted) {
        setTimeout(() => {
          submitExam({
            auto: true,
            answersOverride: session.answers || {},
            examOverride: data,
          })
        }, 0)
      }
    } catch {
      alert('无法加载试卷或考试已结束')
      navigate('/exams')
    }
  }

  const goToIndex = (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= questionCards.length || nextIndex === activeIndex) return
    setDirection(nextIndex > activeIndex ? 1 : -1)
    setActiveIndex(nextIndex)
  }

  const handleOptionSelect = (qId, label) => {
    if (submitted) return
    setAnswers(prev => ({
      ...prev,
      [qId]: label,
    }))
  }

  const handleCardDragEnd = (_, info) => {
    if (prefersReducedMotion) return
    const swipe = info.offset.x + info.velocity.x * 0.2
    if (swipe <= -140 && activeIndex < questionCards.length - 1) {
      goToIndex(activeIndex + 1)
    }
    if (swipe >= 140 && activeIndex > 0) {
      goToIndex(activeIndex - 1)
    }
  }

  const submitExam = async ({ auto = false, answersOverride, examOverride } = {}) => {
    if (submittedRef.current) return

    const currentExam = examOverride || examRef.current
    if (!currentExam) return

    const currentAnswers = answersOverride || answersRef.current

    if (!auto && !window.confirm('确认提交试卷吗？提交后无法修改。')) return

    setSubmitted(true)
    setIsSubmitting(true)
    submittedRef.current = true
    clearInterval(timerRef.current)

    try {
      const res = await fetch(`${API_BASE}/exams/${id}/submit`, {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          answers: currentAnswers,
          questionIds: currentExam.questions.map(q => q.id),
          startedAt: sessionRef.current?.startedAt ? new Date(sessionRef.current.startedAt).toISOString() : '',
          submittedAt: new Date().toISOString(),
        }),
      })

      if (res.status === 401) {
        if (user?.username) {
          clearExamSession(localStorage, user.username, id)
        }
        setIsSubmitting(false)
        logout()
        alert('登录状态已失效，请重新登录后再提交考试')
        navigate('/login', { replace: true })
        return
      }

      const data = await res.json()
      if (user?.username) {
        clearExamSession(localStorage, user.username, id)
      }
      sessionRef.current = null
      setExpiresAt(null)
      setSubmissionReceipt(data)
      setIsSubmitting(false)
    } catch {
      alert('提交失败，请重试')
      setSubmitted(false)
      setIsSubmitting(false)
      submittedRef.current = false
    }
  }

  const handleSubmit = async (auto = false) => {
    await submitExam({ auto })
  }

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  if (loading) {
    return (
      <div style={{ ...pageStyle, display: 'grid', placeItems: 'center' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            padding: 28,
            borderRadius: 24,
            background: 'var(--panel-strong)',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--border-default)',
          }}
        >
          加载试卷中...
        </motion.div>
      </div>
    )
  }

  if (submissionReceipt) {
    return (
      <div style={{ ...pageStyle, padding: '32px 20px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{
            textAlign: 'center',
            padding: '40px',
            background: 'var(--panel-strong)',
            borderRadius: 28,
            marginBottom: 32,
            boxShadow: 'var(--shadow-xl)',
          }}>
            <h2 style={{ fontSize: '2rem', marginBottom: 16 }}>试卷已提交</h2>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 14px',
              borderRadius: 999,
              background: 'var(--status-warn-bg)',
              border: '1px solid var(--status-warn-border)',
              color: 'var(--status-warn-fg)',
              fontWeight: 700,
            }}>
              正在判题
            </div>
            <p style={{ marginTop: 18, color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '1.02rem' }}>
              正在判题，5分钟后进入考试成绩页面查看最终成绩。
            </p>
            <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>
              页面将在 {redirectCountdown} 秒后自动跳转到考试成绩页面。
            </p>
            <div style={{ marginTop: 24, display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/my/exam-results', { replace: true })} style={primaryActionStyle}>进入考试成绩</button>
              <button onClick={() => navigate('/exams', { replace: true })} style={secondaryActionStyle}>返回考试列表</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 16px 32px' }}>
        <AnimatePresence>
          {isSubmitting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={gradingOverlayStyle}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 14 }}
                transition={{ duration: 0.22 }}
                style={gradingCardStyle}
              >
                <div style={gradingSpinnerStyle} />
                <h3 style={{ margin: '0 0 10px', fontSize: '1.35rem' }}>提交中，请等待</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  正在提交试卷并创建判题任务，请不要关闭页面。
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: -12 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          style={{
            ...heroShellStyle,
            gridTemplateColumns: isCompact ? '1fr' : heroShellStyle.gridTemplateColumns,
          }}
        >
          <div>
            <div style={eyebrowStyle}>在线考试模式</div>
            <h2 style={{ margin: '6px 0 8px', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)' }}>{exam.title}</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              一题一卡，左右拖动切题。顶部色块表示答题状态，便于最后快速检查。
            </p>
          </div>

          <div style={heroStatRowStyle}>
            <div style={heroStatCardStyle}>
              <span style={heroStatLabelStyle}>已答</span>
              <strong style={heroStatValueStyle}>{answeredCount}</strong>
            </div>
            <div style={heroStatCardStyle}>
              <span style={heroStatLabelStyle}>未答</span>
              <strong style={{ ...heroStatValueStyle, color: unansweredCount ? 'var(--status-danger-fg)' : 'var(--status-success-fg)' }}>{unansweredCount}</strong>
            </div>
            <div style={{
              ...heroStatCardStyle,
              background: timeLeft < 300 ? 'var(--status-danger-bg)' : 'var(--panel-strong)',
            }}>
              <span style={heroStatLabelStyle}>剩余时间</span>
              <strong style={{ ...heroStatValueStyle, color: timeLeft < 300 ? 'var(--status-danger-fg)' : 'var(--text-heading)' }}>{formatTime(timeLeft)}</strong>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          style={trackerShellStyle}
        >
          <div style={trackerHeaderStyle}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={legendItemStyle}><span style={{ ...legendDotStyle, background: 'var(--status-success-fg)' }} />已答</span>
              <span style={legendItemStyle}><span style={{ ...legendDotStyle, background: 'var(--border-default)' }} />未答</span>
              <span style={legendItemStyle}><span style={{ ...legendDotStyle, background: 'var(--status-warn-fg)' }} />当前题</span>
            </div>
            <button type="button" onClick={() => handleSubmit(false)} style={submitGhostStyle}>交卷</button>
          </div>

          <div style={chipRailStyle}>
            {questionCards.map((card, index) => {
              const answered = Boolean(answers[card.questionId])
              const active = index === activeIndex
              const sectionShort = card.sectionTitle === '单选题'
                ? '单'
                : card.sectionTitle === '判断题'
                  ? '判'
                  : '程'
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => goToIndex(index)}
                  style={{
                    ...chipStyle,
                    borderColor: active ? 'var(--status-warn-border)' : answered ? 'var(--status-success-border)' : 'var(--border-default)',
                    background: active ? 'var(--status-warn-bg)' : answered ? 'var(--status-success-bg)' : 'var(--panel-bg)',
                    color: active ? 'var(--status-warn-fg)' : 'var(--text-heading)',
                    boxShadow: active ? 'var(--shadow-md)' : 'none',
                  }}
                >
                  <span style={chipIndexStyle}>{index + 1}</span>
                  <span style={chipMetaStyle}>{sectionShort}</span>
                </button>
              )
            })}
          </div>
        </motion.div>

        <div style={{
          ...examContentGridStyle,
          gridTemplateColumns: isCompact ? '1fr' : examContentGridStyle.gridTemplateColumns,
        }}>
          <div>
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={activeCard.id}
                custom={direction}
                initial={prefersReducedMotion ? false : ({ x: direction > 0 ? 72 : -72, opacity: 0 })}
                animate={prefersReducedMotion ? {} : { x: 0, opacity: 1 }}
                exit={prefersReducedMotion ? {} : ({ x: direction > 0 ? -72 : 72, opacity: 0 })}
                transition={{ duration: prefersReducedMotion ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }}
                drag={prefersReducedMotion ? false : 'x'}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.12}
                onDragEnd={handleCardDragEnd}
                style={questionCardStyle}
              >
                <div style={cardTopRowStyle}>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ ...sectionBadgeStyle, background: activeCard.accent }}>{activeCard.sectionTitle}</span>
                    <span style={scoreBadgeStyle}>{activeCard.scoreLabel}</span>
                    <span style={{
                      ...statusPillStyle,
                      color: answers[activeCard.questionId] ? 'var(--status-success-fg)' : 'var(--status-warn-fg)',
                      background: answers[activeCard.questionId] ? 'var(--status-success-bg)' : 'var(--status-warn-bg)',
                    }}>
                      {answers[activeCard.questionId] ? '已作答' : '待作答'}
                    </span>
                  </div>
                  <div style={miniProgressStyle}>
                    第 {activeIndex + 1} / {questionCards.length} 题
                  </div>
                </div>

                <h3 style={{ margin: '8px 0 18px', fontSize: 'clamp(1.2rem, 2vw, 1.55rem)', lineHeight: 1.45 }}>
                  {renderInlineRich(activeCard.title, true)}
                </h3>

                {activeCard.description ? (
                  <p style={{ margin: '0 0 18px', color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.98rem' }}>
                    {renderInlineRich(activeCard.description, true)}
                  </p>
                ) : null}

                {activeCard.codeSnippet ? (
                  <pre style={codeBlockStyle}>
                    <code style={codeTextStyle}>{activeCard.codeSnippet}</code>
                  </pre>
                ) : null}

                <div style={{ display: 'grid', gap: 14 }}>
                  {activeCard.type === 'judge' ? (
                    <>
                      {[
                        { label: 'T', text: '正确 (√)' },
                        { label: 'F', text: '错误 (×)' },
                      ].map(option => (
                        <OptionCard
                          key={option.label}
                          option={option}
                          selected={answers[activeCard.questionId] === option.label}
                          onSelect={() => handleOptionSelect(activeCard.questionId, option.label)}
                          renderInlineRich={renderInlineRich}
                        />
                      ))}
                    </>
                  ) : (
                    activeCard.options.map(option => (
                      <OptionCard
                        key={option.label}
                        option={{ ...option, text: displayOptionText(option.text) }}
                        selected={answers[activeCard.questionId] === option.label}
                        onSelect={() => handleOptionSelect(activeCard.questionId, option.label)}
                        renderInlineRich={renderInlineRich}
                      />
                    ))
                  )}
                </div>

                <div style={swipeHintStyle}>左右拖动题卡，可切换上一题 / 下一题</div>
              </motion.div>
            </AnimatePresence>
          </div>

          <aside style={{
            ...sidePanelStyle,
            position: isCompact ? 'static' : sidePanelStyle.position,
            top: isCompact ? 'auto' : sidePanelStyle.top,
          }}>
            <div style={sidePanelInnerStyle}>
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={sideHeadlineStyle}>检查面板</div>
                <div style={checkCardStyle}>
                  <div style={checkLabelStyle}>当前题状态</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: answers[activeCard.questionId] ? 'var(--status-success-fg)' : 'var(--status-warn-fg)' }}>
                    {answers[activeCard.questionId] ? '已经完成选择' : '还没有作答'}
                  </div>
                </div>
                <div style={checkCardStyle}>
                  <div style={checkLabelStyle}>待检查题号</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {questionCards
                      .map((card, index) => (!answers[card.questionId] ? index + 1 : null))
                      .filter(Boolean)
                      .slice(0, 12)
                      .map(index => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => goToIndex(index - 1)}
                          style={pendingChipStyle}
                        >
                          {index}
                        </button>
                      ))}
                    {unansweredCount === 0 ? <span style={{ color: 'var(--status-success-fg)', fontWeight: 700 }}>全部已作答</span> : null}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => goToIndex(Math.max(0, activeIndex - 1))}
                  disabled={activeIndex === 0}
                  style={{
                    ...secondaryActionStyle,
                    width: '100%',
                    opacity: activeIndex === 0 ? 0.45 : 1,
                    cursor: activeIndex === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  上一题
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeIndex === questionCards.length - 1) {
                      handleSubmit(false)
                      return
                    }
                    goToIndex(activeIndex + 1)
                  }}
                  style={{
                    ...primaryActionStyle,
                    width: '100%',
                    fontSize: '1.02rem',
                    padding: '16px 20px',
                    boxShadow: 'var(--shadow-glow)',
                  }}
                >
                  {activeIndex === questionCards.length - 1 ? '完成检查并交卷' : '下一题'}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function OptionCard({ option, selected, onSelect, renderInlineRich }) {
  return (
    <label
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 14,
        alignItems: 'start',
        padding: '16px 18px',
        borderRadius: 20,
        border: '1px solid',
        borderColor: selected ? 'var(--status-success-border)' : 'var(--border-default)',
        background: selected ? 'var(--status-success-bg)' : 'var(--panel-bg)',
        boxShadow: selected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        cursor: 'pointer',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
      }}
    >
      <input
        type="radio"
        checked={selected}
        onChange={onSelect}
        style={{ marginTop: 4, accentColor: 'var(--accent-secondary)' }}
      />
      <div style={{ display: 'grid', gap: 6 }}>
        <div style={{ fontWeight: 800, color: 'var(--text-heading)' }}>{option.label}.</div>
        <div style={{ color: 'var(--text-body)', lineHeight: 1.7 }}>{renderInlineRich(option.text)}</div>
      </div>
    </label>
  )
}

const heroShellStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 0.8fr)',
  gap: 20,
  padding: 24,
  borderRadius: 28,
  background: 'var(--panel-glass)',
  border: '1px solid var(--border-default)',
  boxShadow: 'var(--shadow-lg)',
  backdropFilter: 'blur(18px)',
}

const eyebrowStyle = {
  display: 'inline-flex',
  padding: '6px 12px',
  borderRadius: 999,
  background: 'var(--status-success-bg)',
  color: 'var(--status-success-fg)',
  fontWeight: 700,
  fontSize: '0.82rem',
  letterSpacing: '0.08em',
}

const heroStatRowStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 14,
}

const heroStatCardStyle = {
  padding: '18px 16px',
  borderRadius: 20,
  background: 'var(--panel-strong)',
  border: '1px solid var(--border-default)',
  boxShadow: 'var(--shadow-md)',
}

const heroStatLabelStyle = {
  display: 'block',
  fontSize: '0.84rem',
  color: 'var(--text-muted)',
  marginBottom: 6,
}

const heroStatValueStyle = {
  fontSize: '1.55rem',
  color: 'var(--text-heading)',
}

const trackerShellStyle = {
  marginTop: 18,
  padding: 12,
  borderRadius: 20,
  background: 'var(--panel-bg)',
  border: '1px solid var(--border-default)',
  boxShadow: 'var(--shadow-md)',
}

const trackerHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
  alignItems: 'center',
  marginBottom: 10,
}

const legendItemStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  color: 'var(--text-secondary)',
  fontSize: '0.85rem',
}

const legendDotStyle = {
  width: 10,
  height: 10,
  borderRadius: 999,
}

const submitGhostStyle = {
  padding: '8px 14px',
  borderRadius: 999,
  border: '1px solid var(--status-danger-border)',
  background: 'var(--status-danger-bg)',
  color: 'var(--status-danger-fg)',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: '0.9rem',
}

const chipRailStyle = {
  display: 'flex',
  gap: 8,
  overflowX: 'auto',
  paddingBottom: 4,
  scrollbarWidth: 'thin',
}

const chipStyle = {
  flex: '0 0 auto',
  border: '1px solid var(--border-default)',
  borderRadius: 16,
  minWidth: 56,
  padding: '10px 8px',
  textAlign: 'center',
  cursor: 'pointer',
}

const chipIndexStyle = {
  display: 'block',
  fontSize: '0.98rem',
  fontWeight: 800,
  lineHeight: 1.1,
}

const chipMetaStyle = {
  display: 'block',
  fontSize: '0.68rem',
  color: 'var(--text-muted)',
  marginTop: 4,
  lineHeight: 1,
}

const examContentGridStyle = {
  marginTop: 22,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 300px',
  gap: 20,
  alignItems: 'start',
}

const questionCardStyle = {
  padding: 24,
  borderRadius: 30,
  background: 'var(--panel-strong)',
  border: '1px solid var(--border-default)',
  boxShadow: 'var(--shadow-xl)',
  backdropFilter: 'blur(16px)',
}

const cardTopRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'center',
  flexWrap: 'wrap',
  marginBottom: 8,
}

const sectionBadgeStyle = {
  display: 'inline-flex',
  padding: '7px 12px',
  borderRadius: 999,
  color: 'white',
  fontWeight: 800,
  fontSize: '0.82rem',
}

const scoreBadgeStyle = {
  display: 'inline-flex',
  padding: '7px 12px',
  borderRadius: 999,
  background: 'var(--panel-soft)',
  color: 'var(--text-body)',
  fontWeight: 700,
  fontSize: '0.82rem',
}

const statusPillStyle = {
  display: 'inline-flex',
  padding: '7px 12px',
  borderRadius: 999,
  fontWeight: 700,
  fontSize: '0.82rem',
}

const miniProgressStyle = {
  color: 'var(--text-muted)',
  fontWeight: 700,
}

const gradingOverlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 1200,
  display: 'grid',
  placeItems: 'center',
  background: 'rgba(6, 12, 24, 0.76)',
  backdropFilter: 'blur(10px)',
}

const gradingCardStyle = {
  width: 'min(92vw, 460px)',
  padding: '28px 26px',
  borderRadius: 28,
  background: 'var(--panel-strong)',
  border: '1px solid var(--border-default)',
  boxShadow: 'var(--shadow-xl)',
  textAlign: 'center',
}

const gradingSpinnerStyle = {
  width: 56,
  height: 56,
  margin: '0 auto 18px',
  borderRadius: '50%',
  border: '4px solid rgba(255,255,255,0.12)',
  borderTopColor: 'var(--brand-primary)',
  animation: 'exam-spin 0.9s linear infinite',
}

const codeBlockStyle = {
  marginBottom: 18,
  padding: '16px 18px',
  borderRadius: 22,
  border: '1px solid var(--exam-code-border)',
  background: 'var(--exam-code-bg)',
  color: 'var(--exam-code-text)',
  overflowX: 'auto',
  whiteSpace: 'pre',
  boxShadow: 'var(--shadow-md)',
}

const codeTextStyle = {
  color: 'inherit',
  textShadow: 'none',
}

const swipeHintStyle = {
  marginTop: 18,
  color: 'var(--text-muted)',
  fontSize: '0.92rem',
}

const sidePanelStyle = {
  position: 'sticky',
  top: 24,
}

const sidePanelInnerStyle = {
  display: 'grid',
  gap: 18,
  padding: 20,
  borderRadius: 28,
  background: 'var(--panel-bg)',
  border: '1px solid var(--border-default)',
  boxShadow: 'var(--shadow-lg)',
}

const sideHeadlineStyle = {
  fontSize: '1rem',
  fontWeight: 800,
  color: 'var(--text-heading)',
}

const checkCardStyle = {
  padding: 16,
  borderRadius: 20,
  background: 'var(--panel-soft)',
  border: '1px solid var(--border-default)',
}

const checkLabelStyle = {
  fontSize: '0.82rem',
  color: 'var(--text-muted)',
  marginBottom: 8,
}

const pendingChipStyle = {
  padding: '8px 10px',
  borderRadius: 999,
  border: '1px solid var(--status-warn-border)',
  background: 'var(--status-warn-bg)',
  color: 'var(--status-warn-fg)',
  fontWeight: 800,
  cursor: 'pointer',
}

const primaryActionStyle = {
  border: 'none',
  borderRadius: 20,
  padding: '14px 20px',
  background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-secondary) 100%)',
  color: 'white',
  fontWeight: 800,
  cursor: 'pointer',
}

const secondaryActionStyle = {
  border: '1px solid var(--border-default)',
  borderRadius: 20,
  padding: '14px 20px',
  background: 'var(--panel-bg)',
  color: 'var(--text-heading)',
  fontWeight: 800,
  cursor: 'pointer',
}
