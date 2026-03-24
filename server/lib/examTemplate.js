export function getExamMarkdownTemplate() {
  return `---
title: 示例考试模板
language: 通用
duration: 60
---

# 示例考试模板

考试时间：60 分钟　　满分：100 分

## 一、单选题（每题 2 分，共 4 分）

**1.** 关于 Python，下列说法正确的是（　　）
A. Python 只能编写网页前端代码
B. Python 是一种高级程序设计语言
C. Python 程序不能在解释器中运行
D. Python 变量使用前必须声明类型

**2.** 阅读下面代码，输出结果是（　　）

\`\`\`python
name = "Python"
print("Hello,", name)
\`\`\`

A. \`Hello,name\`
B. \`Hello, Python\`
C. \`"Hello, Python"\`
D. 程序报错

## 二、判断题（每题 2 分，共 4 分）

**1.** Python 中，\`name\` 和 \`Name\` 可以表示两个不同的变量。（　　）

**2.** 表达式 \`2 ** 3 ** 2\` 的值是 \`64\`。（　　）

## 三、程序完善题（每题 5 分，共 10 分）

### 第1题：读取整数并计算平方

**题目描述：** 输入一个整数，输出它的平方。

\`\`\`python
n = ______①
print(n ** 2)
\`\`\`

**① 的备选项：**
A. \`input()\`
B. \`int(input())\`
C. \`float\`
D. \`print(input())\`

---

### 第2题：补全幂运算表达式

**题目描述：** 下面程序要输出 \`2 ** (3 ** 2)\` 的值。

\`\`\`python
result = ______②
print(result)
\`\`\`

**② 的备选项：**
A. \`2 ** 3 ** 2\`
B. \`(2 ** 3) ** 2\`
C. \`2 * 3 ** 2\`
D. \`2 ** 3 * 2\`

## 参考答案汇总

**单选题：**
1.B　2.B

**判断题：**
1.√　2.×

**程序完善题：**
①B　②A
`
}
