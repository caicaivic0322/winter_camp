export function getExamMarkdownTemplate() {
  return `---
title: 示例考试模板
language: C++
---

## 一、单选题

**1. 下列哪个关键字用于定义常量？**
A. let
_B. const_
C. static
D. int

**2. C++ 中用于标准输出的对象是？**
A. cin
_B. cout_
C. scanf
D. print

## 二、判断题

**3. vector 可以动态扩容。（　√　）**

**4. while 循环至少执行一次。（　×　）**

## 三、完善程序题

### 求两个数中的较大值

\`\`\`cpp
int maxValue(int a, int b) {
    if (a > b) {
        return a;
    }
    return ____;
}
\`\`\`

**① 的备选项：**
A. a
_B. b_
C. a + b
D. 0
`
}
