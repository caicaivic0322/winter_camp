# Review Checklist

Before returning a generated exam or a repaired Markdown file, verify every item below.

## Structure

- `## 一、单选题` exists
- `## 二、判断题` exists
- `## 三、程序完善题` exists when requested
- `## 参考答案汇总` exists

## Single-choice questions

- Every question has a stem
- Every question has exactly 4 options `A-D`
- There is exactly one best answer
- The answer appears in the final summary

## True/false questions

- Every statement is clear enough to judge
- Every item has a final summary answer using `√` or `×`
- No statement depends on unstated assumptions

## Code-completion questions

- Each question has a `### 第n题：...` title
- Each question has a fenced code block
- Each question has one circled blank `①②③...`
- Each blank has one `**① 的备选项：**` block
- Each option block has `A-D`
- The final summary includes each circled blank answer

## Parser safety

- No section title is rewritten into a different phrase
- Quoted strings are preserved
- Operators like `**` are preserved
- Code appears between stem and options
- The number of answers matches the number of questions

## Teaching quality

- Difficulty matches the requested GESP level
- Distractors are plausible
- No two options are equally correct
- The paper is pedagogically clean, not trick-heavy unless explicitly requested
