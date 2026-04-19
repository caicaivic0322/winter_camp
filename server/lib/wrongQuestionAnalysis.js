export function normalizeOptionText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function sanitizeQuestionText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildAiPromptItems(items = []) {
  return (Array.isArray(items) ? items : []).map(item => ({
    questionId: item.questionId,
    questionNumber: item.questionNumber,
    title: sanitizeQuestionText(item.title),
    codeSnippet: String(item.codeSnippet || '').trim(),
    type: item.type,
    options: (item.options || []).map(opt => ({
      label: opt.label,
      text: normalizeOptionText(opt.text),
    })),
    yourAnswer: item.yourAnswer || '未作答',
    correctAnswer: item.correctAnswer || '未设置',
  }))
}

export function mergeAiAnalyses(items = [], remoteAnalyses = [], buildFallbackAnalysis) {
  const normalizedItems = Array.isArray(items) ? items : []
  const analyses = Array.isArray(remoteAnalyses) ? remoteAnalyses : []

  const analysisMap = new Map(
    analyses
      .filter(item => item?.questionId && item?.analysis)
      .map(item => [item.questionId, String(item.analysis).trim()])
  )

  const matchedCount = normalizedItems.filter(item => analysisMap.has(item.questionId)).length
  const canFallbackByIndex = matchedCount === 0 && analyses.length === normalizedItems.length

  return normalizedItems.map((item, index) => {
    const direct = analysisMap.get(item.questionId)
    const ordered = canFallbackByIndex ? String(analyses[index]?.analysis || '').trim() : ''

    return {
      ...item,
      analysis: direct || ordered || buildFallbackAnalysis(item),
    }
  })
}
