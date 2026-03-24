# Markdown Template

Use this exact structure when generating repository-compatible exam Markdown.

````md
---
title: 试卷标题
language: Python
duration: 60
---

# 试卷标题

考试时间：60 分钟　　满分：100 分

## 一、单选题（每题 2 分，共 40 分）

**1.** 题目内容（　　）
A. 选项 A
B. 选项 B
C. 选项 C
D. 选项 D

**2.** 阅读下面代码，输出结果是（　　）

```python
name = "Python"
print("Hello,", name)
```

A. `Hello,name`
B. `Hello, Python`
C. `"Hello, Python"`
D. 程序报错

## 二、判断题（每题 2 分，共 20 分）

**1.** 表达式 `2 ** 3 ** 2` 的值是 `64`。（　　）

**2.** Python 中，`name` 和 `Name` 可以表示两个不同的变量。（　　）

## 三、程序完善题（每题 5 分，共 40 分）

### 第1题：题目标题

**题目描述：** 题目描述文字。

```python
n = ______①
print(n ** 2)
```

**① 的备选项：**
A. `input()`
B. `int(input())`
C. `float`
D. `print(input())`

---

### 第2题：题目标题

**题目描述：** 题目描述文字。

```python
result = ______②
print(result)
```

**② 的备选项：**
A. `2 ** 3 ** 2`
B. `(2 ** 3) ** 2`
C. `2 * 3 ** 2`
D. `2 ** 3 * 2`

## 参考答案汇总

**单选题：**
1.B　2.B

**判断题：**
1.×　2.√

**程序完善题：**
①B　②A
````

## Must-follow rules

- Keep the exact section headings
- Put single-choice answers in the final summary, not inline
- Put true/false answers in the final summary using `√` and `×`
- Put code-completion answers in the final summary using circled numerals
- If a code block exists, place it before the options
- Preserve quoted strings exactly
- Preserve operators like `**`, `%`, `//`, `<=`, `>=`
- Use only one blank per code-completion question unless the user explicitly requests a different parser format
