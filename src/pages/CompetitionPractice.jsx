import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  buildLeetCodeProblemUrl,
  hot100Groups,
  competitionModules,
} from '../data/competitionUnit'
import { useCompetitionProgress } from '../contexts/CompetitionProgressContext'

function CompetitionPractice() {
  const [activeGroup, setActiveGroup] = useState(hot100Groups[0].key)
  const currentGroup = hot100Groups.find((group) => group.key === activeGroup) || hot100Groups[0]
  const {
    overallProgress,
    getProblemStatus,
    toggleCompleted,
    toggleWrong,
    toggleFavorite,
  } = useCompetitionProgress()

  return (
    <div className="competition-practice-page container">
      <div className="competition-breadcrumb">
        <Link to="/">首页</Link>
        <span>›</span>
        <Link to="/competition">竞赛单元</Link>
        <span>›</span>
        <span>Hot 100 自测</span>
      </div>

      <motion.section
        className="competition-practice-shell"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <aside className="competition-practice-sidebar">
          <div className="competition-practice-sidebar-head">
            <span>Study Plan</span>
            <h1>Hot 100 自测</h1>
          </div>

          <div className="competition-group-list">
            {hot100Groups.map((group) => (
              <button
                key={group.key}
                type="button"
                className={`competition-group-item ${group.key === activeGroup ? 'active' : ''}`}
                onClick={() => setActiveGroup(group.key)}
              >
                <strong>{group.title}</strong>
                <span>{group.problems.length} 题</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="competition-problem-table-wrap">
          <div className="competition-problem-table-head">
            <div>
              <span className="competition-table-label">当前题组</span>
              <h2>{currentGroup.title}</h2>
              <p>{currentGroup.focus}</p>
            </div>
            <Link to="/competition" className="competition-secondary-btn">
              返回竞赛路线
            </Link>
          </div>

          <div className="competition-problem-table">
            <div className="competition-problem-row header">
              <span>状态</span>
              <span>题目</span>
              <span>编号</span>
              <span>专题</span>
              <span>操作</span>
            </div>

            {currentGroup.problems.map((problem, index) => {
              const status = getProblemStatus(problem.id)

              return (
                <div key={problem.id} className="competition-problem-row">
                  <span>
                    <i className={`competition-status-dot ${status.completed ? 'done' : index < 2 ? 'warmup' : ''}`} />
                  </span>
                  <Link to={`/competition/problem/${problem.id}`} className="competition-problem-link">
                    {problem.title}
                  </Link>
                  <span>#{problem.id}</span>
                  <span>{currentGroup.title}</span>
                  <div className="competition-row-actions">
                    <button
                      type="button"
                      className={`competition-tag-btn ${status.completed ? 'active success' : ''}`}
                      onClick={() => toggleCompleted(problem.id)}
                    >
                      完成
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
                      className="competition-open-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      原题 ↗
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </main>

        <aside className="competition-practice-inspector">
          <div className="competition-inspector-card">
            <span className="competition-nav-label">LeetCode 风格自测</span>
            <h3>{currentGroup.title}</h3>
            <p>{currentGroup.focus}</p>
            <div className="competition-inspector-metrics">
              <div>
                <strong>{currentGroup.problems.length}</strong>
                <span>当前题数</span>
              </div>
              <div>
                <strong>{overallProgress.percent}%</strong>
                <span>总完成率</span>
              </div>
            </div>
          </div>

          <div className="competition-inspector-card">
            <span className="competition-nav-label">推荐搭配模块</span>
            <div className="competition-module-pills">
              {competitionModules
                .filter((module) => module.focusGroups.includes(currentGroup.key))
                .map((module) => (
                  <Link key={module.slug} to={`/competition/module/${module.slug}`} className="competition-module-pill">
                    模块 {module.order} · {module.title}
                  </Link>
                ))}
            </div>
          </div>

          <div className="competition-inspector-card">
            <span className="competition-nav-label">刷题建议</span>
            <ul className="competition-side-list">
              <li>先独立限时完成，再看其它算法</li>
              <li>每组至少保留 1 道题二刷</li>
              <li>错题优先回到专题页补方法而不是直接背代码</li>
            </ul>
            <div className="competition-side-summary">
              <span>已完成 {overallProgress.completedCount}</span>
              <span>错题 {overallProgress.wrongCount}</span>
              <span>收藏 {overallProgress.favoriteCount}</span>
            </div>
          </div>
        </aside>
      </motion.section>
    </div>
  )
}

export default CompetitionPractice
