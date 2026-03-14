import { Link, Navigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  getCompetitionProblemById,
  buildLeetCodeProblemUrl,
} from '../data/competitionUnit'
import { useCompetitionProgress } from '../contexts/CompetitionProgressContext'

function buildApproachLecture(problem, path, index) {
  const detail = path.idea || path.summary || ''
  const tradeoff = path.tradeoff || path.when || ''
  const complexity = path.complexity || '复杂度依题目而定'

  const stepTemplates = [
    [
      '先把题目抽象成最直接的状态或区间定义，保证思路正确。',
      '围绕当前状态逐步转移，先写出可以通过小数据的版本。',
      '用样例手推边界，确认答案更新时机和返回值语义。',
    ],
    [
      '观察重复计算出现的位置，把重复部分改成可复用的信息。',
      '引入前缀、哈希、双指针或 DP 状态，把复杂度降下来。',
      '写完后重点验证边界：空集、全负数、重复值、越界点。',
    ],
    [
      '把最终写法压缩成比赛模板，保证实现短、边界清晰。',
      '只保留真正影响答案的状态，减少不必要的中间变量。',
      '再反查一遍复杂度和极端数据，确认这就是提交版本。',
    ],
    [
      '从模型切换入手，把题目转成更熟悉的结构。',
      '围绕核心不变量推进状态，持续维护合法性。',
      '最后验证是否满足题目额外限制，例如原地、空间或稳定性。',
    ],
  ]

  const pitfallTemplates = [
    '最常见错误是状态定义不清，导致样例能过但边界一错就全错。',
    '优化时容易把“更新顺序”写反，尤其是前缀统计、窗口收缩和 DP 转移。',
    '比赛写法要特别注意初始化与答案位置，很多题不是最后一个状态就是答案。',
    '如果题目要求原地处理，要先判断当前写法是否覆盖了尚未使用的数据。',
  ]

  return {
    detail,
    tradeoff,
    complexity,
    steps: stepTemplates[index] || stepTemplates[stepTemplates.length - 1],
    pitfall: pitfallTemplates[index] || pitfallTemplates[pitfallTemplates.length - 1],
  }
}

function buildVisualSignals(problem, lectures) {
  return [
    {
      label: '先认模型',
      value: problem.group,
      tone: 'gold',
      note: `${problem.focus} 是这题最先要抓住的线索`,
    },
    {
      label: '起手路线',
      value: lectures[0]?.name || '直接做法',
      tone: 'teal',
      note: '先把正确做法写出来，再谈优化',
    },
    {
      label: '升级方向',
      value: lectures[1]?.name || '继续优化',
      tone: 'violet',
      note: '找到重复计算的位置，把它消掉',
    },
    {
      label: '提交重点',
      value: problem.solvingChecklist[0] || '检查边界',
      tone: 'rose',
      note: '最后一遍检查最容易丢分的地方',
    },
  ]
}

function CompetitionProblemDetail() {
  const { id } = useParams()
  const problem = getCompetitionProblemById(Number(id))
  const {
    getProblemStatus,
    toggleCompleted,
    toggleWrong,
    toggleFavorite,
  } = useCompetitionProgress()

  if (!problem) {
    return <Navigate to="/competition/practice" replace />
  }

  const status = getProblemStatus(problem.id)
  const lectures = problem.algorithmPaths.map((path, index) => ({
    ...path,
    ...buildApproachLecture(problem, path, index),
  }))
  const visualSignals = buildVisualSignals(problem, lectures)

  return (
    <div className="competition-lesson-page container">
      <div className="competition-breadcrumb">
        <Link to="/">首页</Link>
        <span>›</span>
        <Link to="/competition">竞赛单元</Link>
        <span>›</span>
        <Link to="/competition/practice">Hot 100 自测</Link>
        <span>›</span>
        <span>#{problem.id}</span>
      </div>

      <motion.div
        className="competition-problem-detail"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <section className="competition-problem-hero">
          <div className="competition-kicker">{problem.stage || 'Hot 100'}</div>
          <h1>#{problem.id} {problem.title}</h1>
          <p>{problem.why}</p>

          <div className="competition-lesson-meta">
            <span>{problem.group}</span>
            {problem.moduleTitle && <span>{problem.moduleTitle}</span>}
            {problem.titleSlug && <span>{problem.titleSlug}</span>}
          </div>

          <div className="competition-inline-actions" style={{ marginTop: '18px' }}>
            <button
              type="button"
              className={`competition-tag-btn ${status.completed ? 'active success' : ''}`}
              onClick={() => toggleCompleted(problem.id)}
            >
              已完成
            </button>
            <button
              type="button"
              className={`competition-tag-btn ${status.wrong ? 'active danger' : ''}`}
              onClick={() => toggleWrong(problem.id)}
            >
              错题
            </button>
            <button
              type="button"
              className={`competition-tag-btn ${status.favorite ? 'active warn' : ''}`}
              onClick={() => toggleFavorite(problem.id)}
            >
              收藏
            </button>
            <a
              href={buildLeetCodeProblemUrl(problem.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="competition-primary-btn"
            >
              打开 LeetCode 原题 ↗
            </a>
          </div>

          <div className="competition-signal-grid">
            {visualSignals.map((signal) => (
              <article key={signal.label} className={`competition-signal-card ${signal.tone}`}>
                <span>{signal.label}</span>
                <strong>{signal.value}</strong>
                <p>{signal.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="competition-lesson-section">
          <div className="competition-section-head compact">
            <h2>三步通关路线</h2>
            <p>别一上来就啃长文字，先按这三步走，做题会轻松很多。</p>
          </div>
          <div className="competition-path-strip">
            <article className="competition-path-card">
              <span className="competition-path-index">01</span>
              <strong>先看懂题目想让你维护什么</strong>
              <p>这题属于 {problem.group}，核心是 {problem.focus}。</p>
            </article>
            <article className="competition-path-card">
              <span className="competition-path-index">02</span>
              <strong>先写出能过小数据的版本</strong>
              <p>{lectures[0]?.name || '直接做法'} 负责帮你把思路跑通。</p>
            </article>
            <article className="competition-path-card">
              <span className="competition-path-index">03</span>
              <strong>再升级成比赛写法</strong>
              <p>{lectures.at(-1)?.name || '优化写法'} 才是最后提交版本。</p>
            </article>
          </div>
        </section>

        <section className="competition-lesson-section">
          <div className="competition-section-head compact">
            <h2>这题在练什么</h2>
            <p>把目标拆成几个小块，孩子能更快抓住重点。</p>
          </div>
          <div className="competition-check-grid competition-focus-grid">
            <article className="competition-mini-card">
              <strong>所属题组</strong>
              <p>{problem.group} · {problem.focus}</p>
            </article>
            <article className="competition-mini-card">
              <strong>训练目标</strong>
              <p>{problem.trainingGoal}</p>
            </article>
            <article className="competition-mini-card">
              <strong>第一反应</strong>
              <p>{lectures[0]?.detail || '先尝试最直接的做法。'}</p>
            </article>
            <article className="competition-mini-card">
              <strong>最后目标</strong>
              <p>{lectures.at(-1)?.tradeoff || '把做法压缩成可提交的比赛模板。'}</p>
            </article>
          </div>
        </section>

        <section className="competition-lesson-section">
          <div className="competition-section-head compact">
            <h2>详细解法讲解</h2>
            <p>每种算法单独做成一张讲解卡，先看标题和流程，再决定读不读细节。</p>
          </div>
          <div className="competition-detailed-list">
            {lectures.map((path, index) => (
              <article key={path.name} className="competition-detailed-card">
                <div className="competition-detailed-header">
                  <div className="competition-algorithm-top">
                    <strong>{path.name}</strong>
                    <span>{path.complexity}</span>
                  </div>
                  <span className="competition-path-badge">
                    {index === 0 ? '先想到' : index === lectures.length - 1 ? '提交版' : '升级版'}
                  </span>
                </div>
                <p className="competition-detailed-lead">{path.detail}</p>
                <div className="competition-step-flow">
                  {path.steps.map((step, stepIndex) => (
                    <div key={step} className="competition-step-node">
                      <span>{stepIndex + 1}</span>
                      <p>{step}</p>
                    </div>
                  ))}
                </div>
                <div className="competition-detailed-columns">
                  <div>
                    <span className="competition-detail-label">这一招为什么值得学</span>
                    <p>{path.tradeoff}</p>
                  </div>
                  <div>
                    <span className="competition-detail-label">危险警报</span>
                    <div className="competition-alert-card">
                      <strong>最容易错在这里</strong>
                      <p>{path.pitfall}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {problem.solvingChecklist.length > 0 && (
          <section className="competition-lesson-section">
            <div className="competition-section-head compact">
              <h2>做题检查单</h2>
              <p>这部分做成临门一脚清单，提交前扫一眼就够。</p>
            </div>
            <article className="competition-note-card competition-checklist-card">
              <ul className="competition-detail-list">
                {problem.solvingChecklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </section>
        )}

        <section className="competition-lesson-section">
            <div className="competition-section-head compact">
              <h2>推荐学习顺序</h2>
              <p>别直接背答案，按路线闯关，记忆会更牢。</p>
            </div>
          <article className="competition-note-card competition-learning-route">
            <ol className="competition-detail-list ordered">
              <li>先独立写出最直接的正确做法，哪怕复杂度偏高。</li>
              <li>观察哪里出现了重复计算，再对照本页第二种写法优化。</li>
              <li>最后把代码压缩成比赛提交版本，再去 LeetCode 做正式提交。</li>
            </ol>
          </article>
        </section>
      </motion.div>
    </div>
  )
}

export default CompetitionProblemDetail
