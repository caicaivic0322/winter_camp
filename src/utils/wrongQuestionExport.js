function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildWrongQuestionsPrintHtml({
  examTitle,
  score,
  totalScore,
  wrongQuestions = [],
  exportedAt = new Date(),
}) {
  const cards = wrongQuestions.map((item, index) => `
    <section class="card">
      <div class="card-head">
        <div class="badge">错题 ${index + 1}</div>
        <div class="type">${escapeHtml(item.type === 'judge' ? '判断题' : item.type === 'single' ? '单选题' : '题目')}</div>
      </div>
      <h2>${escapeHtml(item.title)}</h2>
      <div class="meta">
        <div><span>你的答案</span><strong>${escapeHtml(item.yourAnswer || '未作答')}</strong></div>
        <div><span>正确答案</span><strong>${escapeHtml(item.correctAnswer || '未设置')}</strong></div>
      </div>
      <div class="analysis">
        <div class="label">错题分析</div>
        <p>${escapeHtml(item.analysis || '暂无解析')}</p>
      </div>
    </section>
  `).join('')

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>错题分析导出</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #172033;
        --muted: #5d6b82;
        --line: #d8dfeb;
        --brand: #ef8a44;
        --brand-soft: #fff1e7;
        --panel: #ffffff;
        --paper: #f5f7fb;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Noto Sans SC", "PingFang SC", sans-serif;
        background: var(--paper);
        color: var(--ink);
      }
      .page {
        width: 900px;
        margin: 0 auto;
        padding: 32px 28px 48px;
      }
      .hero {
        padding: 28px;
        border-radius: 24px;
        background: linear-gradient(135deg, #1a2335, #24324a);
        color: white;
        margin-bottom: 24px;
      }
      .hero small {
        display: inline-block;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(255,255,255,0.12);
        margin-bottom: 12px;
      }
      .hero h1 {
        margin: 0 0 10px;
        font-size: 30px;
      }
      .hero p {
        margin: 0;
        color: rgba(255,255,255,0.78);
      }
      .summary {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin: 18px 0 0;
      }
      .summary div {
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 18px;
        padding: 14px;
      }
      .summary span {
        display: block;
        font-size: 12px;
        color: rgba(255,255,255,0.72);
      }
      .summary strong {
        display: block;
        margin-top: 6px;
        font-size: 22px;
      }
      .card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 22px;
        padding: 22px;
        margin-bottom: 16px;
        break-inside: avoid;
      }
      .card-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }
      .badge, .type {
        display: inline-flex;
        align-items: center;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 12px;
      }
      .badge {
        background: var(--brand-soft);
        color: #8b4d1f;
      }
      .type {
        background: #eef3fb;
        color: var(--muted);
      }
      h2 {
        margin: 0 0 14px;
        font-size: 24px;
      }
      .meta {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      .meta div, .analysis {
        border-radius: 16px;
        border: 1px solid var(--line);
        background: #fbfcff;
        padding: 14px;
      }
      .meta span, .label {
        display: block;
        font-size: 12px;
        color: var(--muted);
        margin-bottom: 6px;
      }
      .meta strong {
        font-size: 18px;
      }
      .analysis {
        margin-top: 12px;
      }
      .analysis p {
        margin: 0;
        line-height: 1.75;
      }
      @media print {
        body { background: white; }
        .page { width: auto; padding: 0; }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <small>错题分析导出</small>
        <h1>${escapeHtml(examTitle || '考试结果')}</h1>
        <p>导出时间：${escapeHtml(exportedAt.toLocaleString('zh-CN'))}</p>
        <div class="summary">
          <div><span>本次得分</span><strong>${escapeHtml(score)} / ${escapeHtml(totalScore)}</strong></div>
          <div><span>错题数量</span><strong>${escapeHtml(wrongQuestions.length)}</strong></div>
          <div><span>建议</span><strong>先复盘，再二刷</strong></div>
        </div>
      </section>
      ${cards || '<p>本次没有错题，继续保持。</p>'}
    </main>
  </body>
</html>`
}
