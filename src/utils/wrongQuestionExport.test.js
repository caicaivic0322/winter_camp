import test from 'node:test'
import assert from 'node:assert/strict'
import { buildWrongQuestionsPrintHtml } from './wrongQuestionExport.js'

test('buildWrongQuestionsPrintHtml includes exam title and analysis content', () => {
  const html = buildWrongQuestionsPrintHtml({
    examTitle: '三月模拟卷',
    score: 82,
    totalScore: 100,
    wrongQuestions: [
      {
        questionId: 'q1',
        title: '两数之和',
        type: 'single',
        yourAnswer: 'A',
        correctAnswer: 'B',
        analysis: '先用哈希表记录已经出现过的数字。',
      },
    ],
  })

  assert.match(html, /三月模拟卷/)
  assert.match(html, /82 \/ 100/)
  assert.match(html, /两数之和/)
  assert.match(html, /先用哈希表记录已经出现过的数字/)
  assert.match(html, /错题分析导出/)
})

test('buildWrongQuestionsPrintHtml escapes html-sensitive characters', () => {
  const html = buildWrongQuestionsPrintHtml({
    examTitle: '<script>alert(1)<\/script>',
    score: 0,
    totalScore: 10,
    wrongQuestions: [
      {
        questionId: 'q1',
        title: '<b>危险标题</b>',
        type: 'judge',
        yourAnswer: '<A>',
        correctAnswer: '<B>',
        analysis: '<img src=x onerror=alert(1)>',
      },
    ],
  })

  assert.doesNotMatch(html, /<script>/)
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  assert.match(html, /&lt;b&gt;危险标题&lt;\/b&gt;/)
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/)
})
