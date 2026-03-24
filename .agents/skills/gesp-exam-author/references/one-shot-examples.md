# One-Shot Examples

This skill should be usable from a single prompt whenever possible.

## Full paper

### Example

`用 gesp-exam-author 生成一套 Python GESP2 试卷`

### Interpreted as

- language: Python
- level: GESP 2
- structure: default full paper
- output: final Markdown + short self-check

## Full paper with explicit counts

### Example

`用 gesp-exam-author 生成一套 C++ GESP4 试卷，12道单选、8道判断、4道程序完善题`

### Interpreted as

- language: C++
- level: GESP 4
- counts:
  - single-choice: 12
  - true/false: 8
  - code-completion: 4

## Mini-bank

### Example

`用 gesp-exam-author 生成 10 道 Python GESP3 单选题`

### Interpreted as

- language: Python
- level: GESP 3
- section only: single-choice
- count: 10

## Review mode

### Example

`用 gesp-exam-author 检查这份试卷 Markdown 是否符合当前项目导入格式，并直接修复`

### Interpreted as

- mode: review and repair
- output: findings + corrected Markdown + change summary

## When to ask a follow-up

Ask a follow-up only if one of these is missing:

- no language
- no GESP level
- request is between two different modes and cannot be inferred safely
- user wants a custom structure but gave conflicting counts
