---
name: gesp-exam-author
description: Create or review C++ and Python programming exams for GESP levels 1-6 using the repository's exact Markdown import format. Use when the user asks to generate a test paper,题库, 单选题, 判断题, 程序完善题, exam markdown, answer summary, or to check whether an imported exam file matches the parser's expected structure.
---

This skill is for producing exam content that matches this repository's import parser and the user's teaching standards.

Follow these five design principles while using the skill:

1. Provide enough context before generating.
2. State hard constraints explicitly.
3. Ask for missing high-impact inputs before finalizing.
4. Use a strict output structure with examples.
5. Self-check the result before returning it.

These principles are adapted from recent Google official guidance on agent/prompt design. For source notes, read `references/google-inspired-principles.md` if needed.

## When To Use

Use this skill when the user wants any of the following:

- A full GESP exam in Markdown
- A question bank for `C++` or `Python`
- Single-choice, true/false, or code-completion questions
- Difficulty aligned to `GESP 1-6`
- Existing exam Markdown reviewed or repaired
- Output that must import cleanly into this repository

## One-Shot First

Default to one-shot execution.

If the user's single prompt already provides enough information to infer:

- language
- GESP level
- paper type or goal

then do not ask follow-up questions. Generate the paper directly using defaults from `references/exam-structure.md`.

Only ask follow-up questions when a missing item would materially change the result:

- language is missing
- GESP level is missing
- the user wants a non-default paper structure but did not specify counts clearly
- the user wants a review/fix instead of generation and has not provided the source file or Markdown

If counts are missing, use defaults.
If output style is missing, return final Markdown plus a short self-check summary.

## Required Constraints

Do not generate outside these boundaries:

- Languages: only `C++` or `Python`
- Difficulty: only `GESP 1` through `GESP 6`
- Question styles: `单选题`, `判断题`, `程序完善题`
- Output format: must follow the repository Markdown import format exactly

Before generating, lock these parameters:

- Language
- Target GESP level
- Paper type: full paper or partial bank
- Question counts by section
- Whether the user wants final Markdown only, or Markdown plus rationale/review notes

If one of these is missing, ask only for the missing high-impact item. Keep questions short.

## Default Values

When the user does not specify these fields, use:

- paper type: full paper
- counts: from `references/exam-structure.md`
- output style: final Markdown + short self-check
- tone: standard teaching-style exam language
- difficulty spread: centered on the requested GESP level with a small amount of easier warm-up content

## Workflow

### 1. Clarify the exam target

Collect or infer:

- Language: `C++` or `Python`
- Level: `GESP 1-6`
- Goal: lesson quiz, unit test, mock exam, phase review, etc.
- Counts:
  - single-choice
  - true/false
  - code-completion
- Preferred knowledge scope or excluded topics

If the user does not specify counts, use the default structure in `references/exam-structure.md`.

### 1A. One-shot parse rules

When a single prompt includes compressed instructions such as:

- `Python GESP2 生成一套试卷`
- `C++ GESP4 阶段测试，默认结构`
- `生成 10 道 Python GESP3 单选题`

interpret them in this order:

1. detect language
2. detect GESP level
3. detect whether the user wants a full paper, one section, or a review
4. detect any explicit counts
5. fill the rest with defaults

Do not pause for confirmation unless the prompt is ambiguous in a way that changes the paper substantially.

### 2. Load only the relevant references

Always read:

- `references/exam-structure.md`
- `references/markdown-template.md`
- `references/review-checklist.md`

Then read exactly one level guide:

- `references/gesp-levels.md`

Use only the section relevant to the requested level and language.

### 3. Design the paper

Build the paper so that:

- Difficulty matches the chosen GESP level
- Distractors are plausible but unambiguous
- Every multiple-choice question has exactly one best answer
- Every true/false item is clearly decidable
- Every code-completion item has one best completion under Python/C++ syntax and beginner expectations

Avoid:

- Tricky wording with multiple valid interpretations
- Questions that depend on implementation-specific undefined behavior unless the paper explicitly teaches it
- Ambiguous “best practice” questions without a single deterministic answer
- Multi-blank completion problems unless the user explicitly asks for them

### 4. Output in repository-compatible Markdown

Use the exact section headings and answer-summary structure from `references/markdown-template.md`.

Requirements:

- Keep section order fixed
- Number single-choice and true/false questions with Arabic numerals
- Number code-completion blanks with circled numerals `①②③...`
- Put the final answers in `## 参考答案汇总`
- If a question contains code, place the fenced code block between the stem and options
- Preserve literal operators like `**`, `%`, `//`, `<=`
- Preserve quoted strings exactly, including nested quotes like `"Hello, Python"`

### 5. Self-review before returning

Run the checklist from `references/review-checklist.md`.

Do not return the final paper until all of these are true:

- Section headings are exact
- All question counts match the requested structure
- Every single-choice question has 4 options `A-D`
- Every true/false question has a definite `√/×` answer in the summary
- Every code-completion question has one circled blank and one option block
- Answer summary counts match the number of generated questions
- No answer is missing
- No parser-breaking shorthand is introduced

If the user asks to audit an existing file instead of generating from scratch:

1. Check the file against the checklist
2. Identify parser risks
3. Rewrite into compliant Markdown
4. Explain what was fixed

## Output Modes

### Mode A: Generate final exam

Default output:

1. Short heading line describing language + GESP level
2. Full Markdown exam
3. Short self-check summary

### Mode A1: One-shot generate

This is the preferred mode.

If the prompt is sufficient, return:

1. One short line confirming inferred settings
2. Full Markdown exam
3. Short self-check summary

### Mode B: Review existing exam Markdown

Output:

1. Findings
2. Corrected Markdown
3. What changed

### Mode C: Generate only a section or mini-bank

If the user asks for only one section, still use repository-safe numbering and provide a matching answer summary for that section.

## Style Rules

- Use clear Chinese teaching language unless the user asks for bilingual output
- Keep stems concise and exam-like
- Keep code examples runnable in the target language
- Prefer pedagogically clean examples over “clever” puzzles
- Match GESP expectations rather than olympiad-style trickiness unless requested

## Fast Prompt Examples

For compact user prompts, follow these patterns without asking unnecessary follow-ups:

- `用 gesp-exam-author 生成一套 Python GESP2 试卷`
- `用 gesp-exam-author 生成一套 C++ GESP4 阶段测试，默认结构`
- `用 gesp-exam-author 生成 10 道 Python GESP3 单选题`
- `用 gesp-exam-author 检查这份试卷 Markdown 并修复导入问题`

If helpful, read `references/one-shot-examples.md`.

## References

- Difficulty and scope: `references/gesp-levels.md`
- Default counts and paper composition: `references/exam-structure.md`
- Exact Markdown format: `references/markdown-template.md`
- Final self-check: `references/review-checklist.md`
- Source notes for the five design principles: `references/google-inspired-principles.md`
- One-shot prompt patterns: `references/one-shot-examples.md`
