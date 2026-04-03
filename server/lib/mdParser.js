export function parseQuestions(markdown) {
  const parsePositiveInt = (value) => {
    const num = Number.parseInt(String(value || '').trim(), 10)
    return Number.isFinite(num) && num > 0 ? num : 0
  }

  const stripMarkdownWrapper = (raw) =>
    String(raw || '')
      .replace(/^\*\*/, '')
      .replace(/\*\*$/, '')
      .trim()

  const sanitizeOptionText = (raw) =>
    String(raw || '')
      .replace(/`/g, '')
      .replace(/[_*]+$/g, '')
      .trim()

  const sanitizeQuestionTitle = (raw) =>
    stripMarkdownWrapper(raw)
      .replace(/\s*[（(]\s*[　 ]*[√×对错TF][　 ]*[）)]\s*$/giu, '')
      .trim()

  const appendQuestionTitle = (question, raw) => {
    const extra = sanitizeQuestionTitle(raw)
    if (!question || !extra) return
    if (question.title.includes(extra)) return
    question.title = `${question.title} ${extra}`.trim()
  }

  const circledNumbers = '①②③④⑤⑥⑦⑧⑨⑩'
  const sectionScoreDefaults = {
    single: 2,
    judge: 2,
    code_completion: 5,
  }

  const normalizeJudgeAnswer = (raw) => {
    const token = String(raw || '').trim().toUpperCase()
    if (!token) return ''
    if (['√', '对', 'T', 'TRUE', 'Y', 'YES'].includes(token)) return 'T'
    if (['×', '错', 'F', 'FALSE', 'N', 'NO'].includes(token)) return 'F'
    return ''
  }

  const extractSectionScore = (line, fallback) => {
    const match = String(line || '').match(/每题\s*(\d+)\s*分/)
    return parsePositiveInt(match?.[1]) || fallback
  }

  const applyAnswerSummary = (summaryText, questions) => {
    if (!summaryText) return

    const sectionQuestions = {
      single: questions.filter(item => item.section === 'single'),
      judge: questions.filter(item => item.section === 'judge'),
      code_completion: questions.filter(item => item.section === 'code_completion'),
    }

    const resolveSectionQuestion = (section, rawNo) => {
      const number = Number(rawNo)
      if (!Number.isInteger(number) || number <= 0) return null
      return sectionQuestions[section][number - 1]
        || sectionQuestions[section].find(item => item.order === number)
        || null
    }

    const singleMatch = summaryText.match(/\*\*单选题：\*\*([\s\S]*?)(?=\n\s*\*\*判断题：\*\*|$)/)
    if (singleMatch) {
      const pairs = Array.from(singleMatch[1].matchAll(/(\d+)\.([A-D])/g))
      pairs.forEach(([, rawNo, answer]) => {
        const question = resolveSectionQuestion('single', rawNo)
        if (question) {
          question.answer = answer
        }
      })
    }

    const judgeMatch = summaryText.match(/\*\*判断题：\*\*([\s\S]*?)(?=\n\s*\*\*程序完善题：\*\*|$)/)
    if (judgeMatch) {
      const pairs = Array.from(judgeMatch[1].matchAll(/(\d+)\.([√×对错TF])/giu))
      pairs.forEach(([, rawNo, symbol]) => {
        const question = resolveSectionQuestion('judge', rawNo)
        if (question) {
          question.answer = normalizeJudgeAnswer(symbol)
        }
      })
    }

    const codeMatch = summaryText.match(/\*\*程序完善题：\*\*([\s\S]*?)$/)
    if (codeMatch) {
      const pairs = Array.from(codeMatch[1].matchAll(/([①②③④⑤⑥⑦⑧⑨⑩])([A-D])/g))
      pairs.forEach(([, circled, answer]) => {
        const index = circledNumbers.indexOf(circled)
        if (index >= 0 && sectionQuestions.code_completion[index]) {
          sectionQuestions.code_completion[index].answer = answer
        }
      })
    }
  }

  const lines = markdown.split('\n')
  const questions = []
  let currentQ = null
  let metadata = {}
  let currentSection = 'single'
  let currentProgramTitle = ''
  let currentProgramDescription = ''
  let lastCodeSnippet = ''
  let inCodeBlock = false
  let codeBuffer = []
  let orderCounter = 0
  let currentSectionScore = sectionScoreDefaults.single

  const pushCurrent = () => {
    if (!currentQ) return
    if (currentQ.type === 'judge' || (currentQ.options && currentQ.options.length > 0)) {
      orderCounter += 1
      currentQ.order = orderCounter
      questions.push(currentQ)
    }
    currentQ = null
  }

  let fmStart = -1
  let fmEnd = -1
  if (lines[0]?.trim() === '---') {
    fmStart = 0
    for (let i = 1; i < lines.length; i++) {
      if (lines[i]?.trim() === '---') {
        fmEnd = i
        break
      }
    }
  }
  if (fmStart !== -1 && fmEnd !== -1) {
    const fmLines = lines.slice(fmStart + 1, fmEnd)
    fmLines.forEach(line => {
      const [k, ...v] = line.split(':')
      if (k && v) metadata[k.trim()] = v.join(':').trim()
    })
  }

  const contentStart = fmEnd !== -1 ? fmEnd + 1 : 0

  for (let i = contentStart; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw.trim()
    if (!line) continue

    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true
        codeBuffer = []
      } else {
        inCodeBlock = false
        lastCodeSnippet = codeBuffer.join('\n').trim()
        if (currentQ && currentSection !== 'code_completion' && !currentQ.codeSnippet && lastCodeSnippet) {
          currentQ.codeSnippet = lastCodeSnippet
        }
      }
      continue
    }
    if (inCodeBlock) {
      codeBuffer.push(raw)
      continue
    }

    if (line.includes('## 一、单选题')) {
      pushCurrent()
      currentSection = 'single'
      currentSectionScore = extractSectionScore(line, sectionScoreDefaults.single)
      continue
    }
    if (line.includes('## 二、判断题')) {
      pushCurrent()
      currentSection = 'judge'
      currentSectionScore = extractSectionScore(line, sectionScoreDefaults.judge)
      continue
    }
    if (line.includes('## 三、完善程序题') || line.includes('## 三、程序完善题')) {
      pushCurrent()
      currentSection = 'code_completion'
      currentSectionScore = extractSectionScore(line, sectionScoreDefaults.code_completion)
      continue
    }

    if (line.includes('## 参考答案汇总')) {
      pushCurrent()
      break
    }

    const programTitleMatch = line.match(/^###\s+(.+)/)
    if (programTitleMatch) {
      pushCurrent()
      currentProgramTitle = sanitizeQuestionTitle(programTitleMatch[1])
      currentProgramDescription = ''
      continue
    }

    const programDescriptionMatch = line.match(/^\*\*题目描述：\*\*\s*(.+)$/)
    if (programDescriptionMatch && currentSection === 'code_completion') {
      currentProgramDescription = sanitizeQuestionTitle(programDescriptionMatch[1])
      continue
    }

    // 匹配题目行，支持两种格式：
    // 1. **1. 题目内容** (内容在**内)
    // 2. **1.** 题目内容 (内容在**外)
    const qMatch = line.match(/^\*\*(\d+)\.\s*\*?\s*\*?\s*(.+?)(?:\*\*)?$/)
    if (qMatch && currentSection !== 'code_completion') {
      pushCurrent()
      const rawTitle = qMatch[2]
      const judgeMarkerMatch = currentSection === 'judge'
        ? rawTitle.match(/[（(]\s*[　 ]*([√×对错TF])[　 ]*[）)]/iu)
        : null
      const answer = currentSection === 'judge'
        ? normalizeJudgeAnswer(judgeMarkerMatch?.[1] || '')
        : ''
      currentQ = {
        id: Date.now() + '_' + Math.random().toString(36).slice(2, 11),
        title: sanitizeQuestionTitle(rawTitle),
        options: [],
        type: currentSection === 'judge' ? 'judge' : 'single',
        section: currentSection,
        score: currentSectionScore,
        answer,
      }
      continue
    }

    const subMatch = line.match(/^\*\*([①-⑩]) 的备选项：\*\*/)
    if (subMatch && currentSection === 'code_completion') {
      pushCurrent()
      const blankNo = subMatch[1]
      currentQ = {
        id: Date.now() + '_' + Math.random().toString(36).slice(2, 11),
        title: `${currentProgramTitle || '完善程序题'} - 填空 ${blankNo}`,
        description: currentProgramDescription,
        options: [],
        type: 'single',
        section: 'code_completion',
        score: currentSectionScore,
        answer: '',
        codeSnippet: lastCodeSnippet || '',
      }
      continue
    }

    if (!currentQ) continue

    if (currentSection !== 'code_completion' && !currentQ.codeSnippet) {
      const inlineCodeLine = line.match(/^`(.+)`$/)
      if (inlineCodeLine) {
        currentQ.codeSnippet = inlineCodeLine[1].trim()
        continue
      }
    }

    const optMatch = line.match(/^_?([A-D])\._?\s*(.+)$/)
    if (currentSection !== 'code_completion' && !optMatch) {
      appendQuestionTitle(currentQ, line)
    }

    if (currentQ.type === 'judge') {
      const judgeInlineMatch = line.match(/[（(]\s*[　 ]*([√×对错TF])[　 ]*[）)]/iu)
      if (judgeInlineMatch) {
        currentQ.answer = normalizeJudgeAnswer(judgeInlineMatch[1])
      }
      continue
    }
    if (optMatch) {
      const label = optMatch[1]
      const text = sanitizeOptionText(optMatch[2])
      const exists = currentQ.options.some(opt => opt.label === label)
      if (!exists) {
        currentQ.options.push({ label, text })
      }
      const isAnswer = /^_([A-D])\._/.test(line)
      if (isAnswer) {
        currentQ.answer = label
      }
    }
  }

  pushCurrent()
  if (!metadata.title) {
    const titleLine = lines.slice(contentStart).find(item => item.trim().startsWith('# '))
    if (titleLine) metadata.title = titleLine.trim().replace(/^#\s+/, '').trim()
  }
  if (!metadata.duration) {
    const durationMatch = markdown.match(/考试时间[：:]\s*(\d+)\s*分钟?/)
    if (durationMatch) metadata.duration = durationMatch[1]
  }
  if (!metadata.totalScore) {
    const totalScoreMatch = markdown.match(/满分[：:]\s*(\d+)\s*分/)
    if (totalScoreMatch) metadata.totalScore = totalScoreMatch[1]
  }
  applyAnswerSummary(markdown.split(/##\s+参考答案汇总/)[1] || '', questions)
  return { metadata, questions }
}
