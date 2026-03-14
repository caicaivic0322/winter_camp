import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  competitionOverview,
  competitionPhases,
  competitionModules,
  hot100Groups,
} from '../data/competitionUnit'
import { useCompetitionProgress } from '../contexts/CompetitionProgressContext'

function CompetitionHub() {
  const { overallProgress, getModuleProgress } = useCompetitionProgress()

  return (
    <div className="competition-page container">
      <motion.section
        className="competition-hero"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="competition-hero-copy">
          <div className="competition-kicker">Competition Unit · CSP-J → CSP-S</div>
          <h1>{competitionOverview.title}</h1>
          <p>{competitionOverview.description}</p>

          <div className="competition-hero-actions">
            <Link to={`/competition/module/${competitionModules[0].slug}`} className="competition-primary-btn">
              从模块 1 开始
            </Link>
            <Link to="/competition/practice" className="competition-secondary-btn">
              打开 Hot 100 自测
            </Link>
          </div>
        </div>

        <div className="competition-hero-panel">
          <div className="competition-panel-label">{competitionOverview.subtitle}</div>
          <div className="competition-stat-grid">
            {competitionOverview.stats.map((stat) => (
              <div key={stat.label} className="competition-stat-card">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="competition-sequence-card">
            <span className="competition-sequence-label">推荐节奏</span>
            <p>专题讲解 2 天 + Hot 100 自测 1 天 + 复盘 1 天，四天一个循环。</p>
          </div>

          <div className="competition-progress-strip">
            <div>
              <strong>{overallProgress.percent}%</strong>
              <span>总进度</span>
            </div>
            <div>
              <strong>{overallProgress.completedCount}</strong>
              <span>已完成</span>
            </div>
            <div>
              <strong>{overallProgress.wrongCount}</strong>
              <span>错题标记</span>
            </div>
            <div>
              <strong>{overallProgress.favoriteCount}</strong>
              <span>收藏题目</span>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="competition-section">
        <div className="competition-section-head">
          <h2>循序渐进的进度路线</h2>
          <p>不是平铺 100 题，而是先学模式，再用题单校验掌握程度。</p>
        </div>

        <div className="competition-phase-grid">
          {competitionPhases.map((phase, index) => (
            <motion.article
              key={phase.id}
              className="competition-phase-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.45 }}
            >
              <span className="competition-phase-range">{phase.range}</span>
              <h3>{phase.title}</h3>
              <p>{phase.goal}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="competition-section">
        <div className="competition-section-head">
          <h2>10 个专题模块</h2>
          <p>每个模块都绑定一组核心思维、若干代表题和一批 Hot 100 自测任务。</p>
        </div>

        <div className="competition-module-grid">
          {competitionModules.map((module) => (
            <Link
              key={module.slug}
              to={`/competition/module/${module.slug}`}
              className="competition-module-card"
              style={{ '--competition-accent': module.accent }}
            >
              <div className="competition-module-topline">
                <span>模块 {module.order}</span>
                <span>{module.stage}</span>
              </div>
              <h3>{module.title}</h3>
              <p>{module.tagline}</p>
              <div className="competition-module-tags">
                {module.goals.slice(0, 2).map((goal) => (
                  <span key={goal}>{goal}</span>
                ))}
              </div>
              <div className="competition-module-progress">
                <div className="competition-progress-bar">
                  <span style={{ width: `${getModuleProgress(module).percent}%` }} />
                </div>
                <strong>{getModuleProgress(module).completedCount} / {getModuleProgress(module).totalCount}</strong>
              </div>
              <div className="competition-module-footer">
                <span>{module.recommendedProblemIds.length} 道推荐自测</span>
                <span>进入专题 →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="competition-section competition-practice-preview">
        <div className="competition-section-head">
          <h2>Hot 100 自测题单</h2>
          <p>题目标题与分组完全对齐热题 100，页面组织参考 LeetCode 学习计划与题单界面。</p>
        </div>

        <div className="competition-practice-groups">
          {hot100Groups.map((group) => (
            <article key={group.key} className="competition-practice-group">
              <div className="competition-practice-group-head">
                <h3>{group.title}</h3>
                <span>{group.problems.length} 题</span>
              </div>
              <p>{group.focus}</p>
              <div className="competition-problem-preview-list">
                {group.problems.slice(0, 4).map((problem) => (
                  <span key={problem.id}>#{problem.id} {problem.title}</span>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="competition-practice-cta">
          <div>
            <strong>100 / 100</strong>
            <span>按分组组织，适合专题学完立刻做。</span>
          </div>
          <Link to="/competition/practice" className="competition-primary-btn">
            打开完整题单
          </Link>
        </div>
      </section>
    </div>
  )
}

export default CompetitionHub
