import test from 'node:test'
import assert from 'node:assert/strict'

import { buildAiPromptItems, mergeAiAnalyses } from '../lib/wrongQuestionAnalysis.js'

test('buildAiPromptItems includes code snippets and question numbers for AI context', () => {
  const items = buildAiPromptItems([
    {
      questionId: 'q-6',
      questionNumber: 6,
      title: '以下代码执行后的输出结果是（  ）',
      codeSnippet: 'print("12a".isdigit(), "１２".isdigit())',
      type: 'single',
      options: [
        { label: 'A', text: 'True False' },
        { label: 'B', text: 'False True' },
      ],
      yourAnswer: 'C',
      correctAnswer: 'B',
    },
  ])

  assert.equal(items.length, 1)
  assert.equal(items[0].questionNumber, 6)
  assert.match(items[0].codeSnippet, /isdigit/)
  assert.equal(items[0].options[1].text, 'False True')
})

test('mergeAiAnalyses falls back to response order when model returns wrong question ids', () => {
  const items = [
    { questionId: 'q-6', title: '第6题', yourAnswer: 'C', correctAnswer: 'B' },
    { questionId: 'q-9', title: '第9题', yourAnswer: 'A', correctAnswer: 'B' },
  ]

  const remoteAnalyses = [
    { questionId: 'hallucinated-1', analysis: '第6题对应的解析' },
    { questionId: 'hallucinated-2', analysis: '第9题对应的解析' },
  ]

  const merged = mergeAiAnalyses(items, remoteAnalyses, item => `fallback:${item.title}`)

  assert.equal(merged[0].analysis, '第6题对应的解析')
  assert.equal(merged[1].analysis, '第9题对应的解析')
})
