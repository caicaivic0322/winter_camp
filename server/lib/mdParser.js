export function parseQuestions(markdown) {
  const sanitizeOptionText = (raw) =>
    String(raw || '')
      .replace(/`/g, '')
      .replace(/[_*]+$/g, '')
      .trim()

  const sanitizeQuestionTitle = (raw) =>
    String(raw || '')
      .replace(/\*\*/g, '')
      .replace(/\s*[（(]\s*[　 ]*[√×][　 ]*[）)]\s*$/g, '')
      .trim()

  const lines = markdown.split('\n')
  const questions = []
  let currentQ = null
  let metadata = {}
  let currentSection = 'single'
  let currentProgramTitle = ''
  let lastCodeSnippet = ''
  let inCodeBlock = false
  let codeBuffer = []
  let orderCounter = 0

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
      continue
    }
    if (line.includes('## 二、判断题')) {
      pushCurrent()
      currentSection = 'judge'
      continue
    }
    if (line.includes('## 三、完善程序题')) {
      pushCurrent()
      currentSection = 'code_completion'
      continue
    }

    const programTitleMatch = line.match(/^###\s+(.+)/)
    if (programTitleMatch) {
      pushCurrent()
      currentProgramTitle = sanitizeQuestionTitle(programTitleMatch[1])
      continue
    }

    // 匹配题目行，支持两种格式：
    // 1. **1. 题目内容** (内容在**内)
    // 2. **1.** 题目内容 (内容在**外)
    const qMatch = line.match(/^\*\*(\d+)\.\s*\*?\s*\*?\s*(.+?)(?:\*\*)?$/)
    if (qMatch && currentSection !== 'code_completion') {
      pushCurrent()
      const rawTitle = qMatch[2]
      let answer = ''
      if (currentSection === 'judge') {
        if (rawTitle.includes('（　√　）') || rawTitle.includes('(　√　)')) {
          answer = 'T'
        } else if (rawTitle.includes('（　×　）') || rawTitle.includes('(　×　)')) {
          answer = 'F'
        }
      }
      currentQ = {
        id: Date.now() + '_' + Math.random().toString(36).slice(2, 11),
        title: sanitizeQuestionTitle(rawTitle),
        options: [],
        type: currentSection === 'judge' ? 'judge' : 'single',
        section: currentSection,
        score: 2,
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
        options: [],
        type: 'single',
        section: 'code_completion',
        score: 5,
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

    if (currentQ.type === 'judge') {
      if (line.includes('（　√　）') || line.includes('(　√　)')) {
        currentQ.answer = 'T'
      } else if (line.includes('（　×　）') || line.includes('(　×　)')) {
        currentQ.answer = 'F'
      }
      continue
    }

    const optMatch = line.match(/^_?([A-D])\._?\s*(.+)$/)
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
  return { metadata, questions }
}
