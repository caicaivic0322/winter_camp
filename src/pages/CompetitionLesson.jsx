import { Link, Navigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  buildLeetCodeProblemUrl,
  competitionModules,
  getCompetitionModule,
  getGroupByKey,
  getPhaseById,
  getProblemsByIds,
} from '../data/competitionUnit'
import { useCompetitionProgress } from '../contexts/CompetitionProgressContext'

function CompetitionLesson() {
  const { slug } = useParams()
  const module = getCompetitionModule(slug)
  const {
    getModuleProgress,
    getProblemStatus,
    toggleCompleted,
    toggleWrong,
    toggleFavorite,
  } = useCompetitionProgress()

  if (!module) {
    return <Navigate to="/competition" replace />
  }

  const phase = getPhaseById(module.phase)
  const recommendedProblems = getProblemsByIds(module.recommendedProblemIds)
  const moduleProgress = getModuleProgress(module)

  return (
    <div className="competition-lesson-page container">
      <div className="competition-breadcrumb">
        <Link to="/">首页</Link>
        <span>›</span>
        <Link to="/competition">竞赛单元</Link>
        <span>›</span>
        <span>{module.title}</span>
      </div>

      <div className="competition-lesson-layout">
        <aside className="competition-lesson-nav">
          <div className="competition-nav-card">
            <span className="competition-nav-label">路线图</span>
            {competitionModules.map((item) => (
              <Link
                key={item.slug}
                to={`/competition/module/${item.slug}`}
                className={`competition-nav-item ${item.slug === module.slug ? 'active' : ''}`}
              >
                <span>模块 {item.order}</span>
                <strong>{item.title}</strong>
              </Link>
            ))}
          </div>
        </aside>

        <motion.main
          className="competition-lesson-main"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <section className="competition-lesson-hero" style={{ '--competition-accent': module.accent }}>
            <div className="competition-kicker">{module.stage}</div>
            <h1>{module.title}</h1>
            <p>{module.tagline}</p>

            <div className="competition-lesson-meta">
              <span>模块 {module.order}</span>
              <span>{phase?.title}</span>
              <span>{module.recommendedProblemIds.length} 道推荐自测</span>
            </div>
            <div className="competition-lesson-progress">
              <div className="competition-progress-bar">
                <span style={{ width: `${moduleProgress.percent}%` }} />
              </div>
              <strong>{moduleProgress.completedCount} / {moduleProgress.totalCount} 已完成</strong>
            </div>
          </section>

          <section className="competition-lesson-section">
            <div className="competition-section-head compact">
              <h2>本模块目标</h2>
              <p>先学通用套路，再做同类题，最后复盘可替换算法。</p>
            </div>
            <div className="competition-check-grid">
              {module.goals.map((goal) => (
                <article key={goal} className="competition-mini-card">
                  <strong>{goal}</strong>
                </article>
              ))}
            </div>
          </section>

          <section className="competition-lesson-section">
            <div className="competition-section-head compact">
              <h2>先修要求与做题检查单</h2>
              <p>这部分决定学生是不是已经准备好进入下一个梯度。</p>
            </div>
            <div className="competition-dual-panel">
              <article className="competition-note-card">
                <span>先修</span>
                <ul>
                  {module.prerequisites.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
              <article className="competition-note-card">
                <span>检查单</span>
                <ul>
                  {module.checklists.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            </div>
          </section>

          <section className="competition-lesson-section">
            <div className="competition-section-head compact">
              <h2>同一类题的多种算法</h2>
              <p>每道代表题都按“暴力 → 优化 → 比赛写法”展开，方便学生建立方法迁移。</p>
            </div>

            <div className="competition-algorithm-grid">
              {module.algorithmPaths.map((path) => (
                <article key={path.name} className="competition-algorithm-card">
                  <div className="competition-algorithm-top">
                    <strong>{path.name}</strong>
                    <span>{path.complexity}</span>
                  </div>
                  <p>{path.summary}</p>
                  <small>{path.when}</small>
                </article>
              ))}
            </div>
          </section>

          <section className="competition-lesson-section">
            <div className="competition-section-head compact">
              <h2>代表题讲解</h2>
              <p>每题给出多条可对比的解法路径，训练“同题多解”的竞赛视角。</p>
            </div>

            <div className="competition-anchor-list">
              {module.anchorProblems.map((problem) => (
                <article key={problem.id} className="competition-anchor-card">
                  <div className="competition-anchor-head">
                    <div>
                      <span>LeetCode #{problem.id}</span>
                      <h3>{problem.title}</h3>
                    </div>
                    <div className="competition-anchor-actions">
                      <Link to={`/competition/problem/${problem.id}`} className="competition-open-link">
                        查看详细讲解
                      </Link>
                      <a
                        href={buildLeetCodeProblemUrl(problem.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="competition-open-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        LeetCode 原题 ↗
                      </a>
                    </div>
                  </div>
                  <p>{problem.why}</p>
                  <div className="competition-approach-list">
                    {problem.approaches.map((approach) => (
                      <article key={approach.name} className="competition-approach-card">
                        <div className="competition-approach-title">
                          <strong>{approach.name}</strong>
                          <span>{approach.complexity}</span>
                        </div>
                        <p>{approach.idea}</p>
                        <small>{approach.tradeoff}</small>
                      </article>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="competition-lesson-section">
            <div className="competition-section-head compact">
              <h2>本模块推荐自测</h2>
              <p>建议顺序：先做基础题，再做综合题，最后回看其它解法。</p>
            </div>

            <div className="competition-recommend-list">
              {recommendedProblems.map((problem) => (
                <article key={problem.id} className="competition-recommend-item">
                  <span className="competition-problem-id">#{problem.id}</span>
                  <Link to={`/competition/problem/${problem.id}`} className="competition-problem-link">
                    {problem.title}
                  </Link>
                  <span>{problem.group}</span>
                  <div className="competition-inline-actions">
                    <button
                      type="button"
                      className={`competition-tag-btn ${getProblemStatus(problem.id).completed ? 'active success' : ''}`}
                      onClick={() => toggleCompleted(problem.id)}
                    >
                      已完成
                    </button>
                    <button
                      type="button"
                      className={`competition-tag-btn ${getProblemStatus(problem.id).wrong ? 'active danger' : ''}`}
                      onClick={() => toggleWrong(problem.id)}
                    >
                      错题
                    </button>
                    <button
                      type="button"
                      className={`competition-tag-btn ${getProblemStatus(problem.id).favorite ? 'active warn' : ''}`}
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
                      去 LeetCode ↗
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </motion.main>

        <aside className="competition-lesson-sidepanel">
          <div className="competition-side-card">
            <span className="competition-nav-label">关联题组</span>
            {module.focusGroups.map((groupKey) => {
              const group = getGroupByKey(groupKey)

              if (!group) return null

              return (
                <div key={group.key} className="competition-side-group">
                  <strong>{group.title}</strong>
                  <p>{group.focus}</p>
                  <span>{group.problems.length} 题</span>
                </div>
              )
            })}
          </div>

          <div className="competition-side-card">
            <span className="competition-nav-label">练习节奏</span>
            <ul className="competition-side-list">
              <li>先做本页 2 道代表题</li>
              <li>再做 4-6 道推荐题</li>
              <li>最后对比不同算法写法</li>
            </ul>
            <Link to="/competition/practice" className="competition-secondary-btn full">
              进入完整题单
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default CompetitionLesson
