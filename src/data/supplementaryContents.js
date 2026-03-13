// 测试卷和答案内容加载器
// 仅导入已有内容的章节，其他章节将使用自动生成的简化版模板
import { courses } from './courses'

function buildTestAndAnswer(lessonId, course) {
  const title = course ? course.title : `第${lessonId}章`
  const group = lessonId <= 4 ? 'syntax' : (lessonId <= 10 ? 'control' : 'advanced')
  
  let mc = []
  let fill = []
  let code = []
  
  if (group === 'syntax') {
    mc = [
      { q: '下列哪一个是 C++ 标准输出流？', opts: ['printf', 'cout', 'echo', 'print'], ans: 'B' },
      { q: '表示 64 位有符号整数的常用类型是？', opts: ['int', 'size_t', 'long long', 'short'], ans: 'C' },
      { q: '表达式优先级相关描述正确的是？', opts: ['赋值高于乘法', '逻辑与高于比较', '前置++的副作用先发生', '逗号运算符优先级最高'], ans: 'C' },
      { q: '判断相等应使用？', opts: ['=', '==', '===', ':='], ans: 'B' },
      { q: '读取两个整数更稳妥的写法是？', opts: ['cin >> a, b', 'scanf("%d %d",&a,&b)', 'cin >> a >> b', 'gets()'], ans: 'C' },
      { q: '在头文件引入 i/o 功能应使用？', opts: ['#include <stdio.h>', '#include <iostream>', '#include <fstream.h>', '#include <bits/stdio.h>'], ans: 'B' },
    ]
    fill = [
      { q: '输出换行但不过度冲刷缓冲区的常见写法是 ______。', ans: "cout << '\\n'" },
      { q: 'C++ 源文件的程序入口函数名是 ______。', ans: 'main' },
      { q: '使用命名空间简化 std 前缀的声明是 ______。', ans: 'using namespace std;' },
    ]
    code = [
      { t: '读入两个整数，输出它们的和与差（以空格分隔）。' },
      { t: '读入一个双精度半径 r，输出圆面积，保留两位小数。' },
    ]
  } else if (group === 'control') {
    mc = [
      { q: '至少执行一次循环的结构是？', opts: ['for', 'while', 'do-while', 'range-for'], ans: 'C' },
      { q: 'switch 语句中避免贯穿通常使用？', opts: ['continue', 'break', 'return', 'goto'], ans: 'B' },
      { q: '跳过当前循环并继续下一次迭代应使用？', opts: ['break', 'return', 'continue', 'exit'], ans: 'C' },
      { q: '数组下标从几开始？', opts: ['-1', '0', '1', '不确定'], ans: 'B' },
      { q: '查找 1..n 的最大值的时间复杂度是？', opts: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], ans: 'C' },
      { q: '嵌套双循环一般时间复杂度约为？', opts: ['O(n)', 'O(log n)', 'O(n^2)', 'O(1)'], ans: 'C' },
    ]
    fill = [
      { q: 'for(初始化; 条件; 更新) 中，条件为假时循环 ______。', ans: '终止' },
      { q: '判断闰年的规则：能被 400 整除，或能被 4 整除且不能被 ______ 整除。', ans: '100' },
      { q: '访问二维数组 a[i][j] 时，i 通常表示 ______ 下标。', ans: '行' },
    ]
    code = [
      { t: '打印 1..n 中的所有质数（试除法）。' },
      { t: '打印 n×m 的矩形图案（由 * 组成）。' },
    ]
  } else {
    mc = [
      { q: 'C++ 动态数组容器是？', opts: ['array', 'vector', 'list', 'deque'], ans: 'B' },
      { q: '读取整行文本更合适的函数是？', opts: ['cin', 'getline', 'scanf', 'puts'], ans: 'B' },
      { q: '传参需要修改调用者变量值时的更安全方式是？', opts: ['值传递', '指针传递', '引用传递', '返回值'], ans: 'C' },
      { q: '访问字符串长度的接口是？', opts: ['len()', 'length()', 'size()', '二者等价'], ans: 'D' },
      { q: 'ifstream 用于？', opts: ['标准输入', '文件输入', '网络输入', '内存输入'], ans: 'B' },
      { q: '指针 p 指向数组首元素 a[0]，*(p+2) 等价于？', opts: ['a[1]', 'a[2]', 'a[3]', 'a[0]'], ans: 'B' },
    ]
    fill = [
      { q: 'C 风格字符串以 ______ 作为结尾标志。', ans: '\\0' },
      { q: 'vector 的尾插函数名是 ______。', ans: 'push_back' },
      { q: '引用声明形如 ______ x = y;（将 x 绑定到 y）。', ans: 'int&' },
    ]
    code = [
      { t: '读入 n 个整数，删除所有等于 x 的元素并输出剩余序列。' },
      { t: '读取 input.txt 的若干行，每行求和，输出到 output.txt。' },
    ]
  }
  
  const mcLines = mc.map((item, idx) => {
    const letters = ['A','B','C','D']
    const opts = letters.map((L, i) => `- ${L}. ${item.opts[i]}`).join('\n')
    return `**${idx+1}. ${item.q}**\n${opts}`
  }).join('\n\n')
  
  const fillLines = fill.map((item, idx) => `${idx+1}) ${item.q}`).join('\n')
  const codeLines = code.map((item, idx) => `### 第${idx+1}题\n${item.t}`).join('\n\n')
  
  const test = [
    `# 📝 第${lessonId}章 测试卷：${title}`,
    '',
    '## 一、选择题（每题2分，共12分）',
    mcLines,
    '',
    '## 二、填空题（每题2分，共6分）',
    fillLines,
    '',
    '## 三、编程题（共 32 分）',
    codeLines,
  ].join('\n')
  
  const ansTable = mc.map((item, idx) => `| ${idx+1} | ${item.ans} |`).join('\n')
  const fillAns = fill.map((item, idx) => `${idx+1}) ${item.ans}`).join('\n')
  const codeRef = [
    '### 参考思路（节选）',
    '- 关注边界、复杂度与 IO 格式；实现可用 C++ 标准库并保持风格一致。'
  ].join('\n')
  
  const answer = [
    `# ✅ 第${lessonId}章 参考答案：${title}`,
    '',
    '## 一、选择题',
    '| 题号 | 答案 |',
    '|:---:|:---:|',
    ansTable,
    '',
    '## 二、填空题',
    fillAns,
    '',
    '## 三、编程题要点',
    codeRef,
  ].join('\n')
  
  return { test, answer }
}

// === 映射到已有测试卷 ===
// Ch2 ← 原第02课
import test02 from '../../第02课_二进制与位运算/测试卷_简化版_二进制与位运算.md?raw'
import answer02 from '../../第02课_二进制与位运算/答案_简化版_二进制与位运算.md?raw'
// Ch14 ← 原第01课
import test14 from '../../第01课_函数强化与传参机制/测试卷_简化版_函数强化与传参机制.md?raw'
import answer14 from '../../第01课_函数强化与传参机制/答案_简化版_函数强化与传参机制.md?raw'
// Ch17 ← 原第03课
import test17 from '../../第03课_结构体与类的应用/测试卷_简化版_结构体与类的应用.md?raw'
import answer17 from '../../第03课_结构体与类的应用/答案_简化版_结构体与类的应用.md?raw'
// Ch18 ← 原第13课_链表基础
import test18 from '../../第13课_链表基础/测试卷_简化版_链表基础.md?raw'
import answer18 from '../../第13课_链表基础/答案_简化版_链表基础.md?raw'
// Ch21 ← 原第09课
import test21 from '../../第09课_树与二叉树/测试卷_简化版_树与二叉树.md?raw'
import answer21 from '../../第09课_树与二叉树/答案_简化版_树与二叉树.md?raw'

// Part 3 进阶算法
// Ch23 ← 原第07课
import test23 from '../../第07课_插入排序/测试卷_简化版_插入排序.md?raw'
import answer23 from '../../第07课_插入排序/答案_简化版_插入排序.md?raw'
// Ch24 ← 原第08课
import test24 from '../../第08课_冒泡排序/测试卷_简化版_冒泡排序.md?raw'
import answer24 from '../../第08课_冒泡排序/答案_简化版_冒泡排序.md?raw'
// Ch25 ← 原第10课
import test25 from '../../第10课_分治与归并/测试卷_简化版_分治与归并.md?raw'
import answer25 from '../../第10课_分治与归并/答案_简化版_分治与归并.md?raw'
// Ch26 ← 原第11课
import test26 from '../../第11课_快速排序与贪心/测试卷_简化版_快速排序与贪心.md?raw'
import answer26 from '../../第11课_快速排序与贪心/答案_简化版_快速排序与贪心.md?raw'
// Ch27 ← 原第13课_堆与堆排序
import test27 from '../../第13课_堆与堆排序/测试卷_简化版_堆与堆排序.md?raw'
import answer27 from '../../第13课_堆与堆排序/答案_简化版_堆与堆排序.md?raw'
// Ch28 ← 原第04课
import test28 from '../../第04课_高精度加法/测试卷_简化版_高精度加法.md?raw'
import answer28 from '../../第04课_高精度加法/答案_简化版_高精度加法.md?raw'
// Ch29 ← 原第05课
import test29 from '../../第05课_高精度减法/测试卷_简化版_高精度减法.md?raw'
import answer29 from '../../第05课_高精度减法/答案_简化版_高精度减法.md?raw'
// Ch30 ← 原第06课
import test30 from '../../第06课_高精度乘法/测试卷_简化版_高精度乘法.md?raw'
import answer30 from '../../第06课_高精度乘法/答案_简化版_高精度乘法.md?raw'
// Ch31 ← 原第12课
import test31 from '../../第12课_动态规划/测试卷_简化版_动态规划.md?raw'
import answer31 from '../../第12课_动态规划/答案_简化版_动态规划.md?raw'
// Ch32 ← 原第14课
import test32 from '../../第14课_搜索算法/测试卷_简化版_搜索算法.md?raw'
import answer32 from '../../第14课_搜索算法/答案_简化版_搜索算法.md?raw'
// Ch33 ← 原第16课
import test33 from '../../第16课_哈希表基础/测试卷_简化版_哈希表基础.md?raw'
import answer33 from '../../第16课_哈希表基础/答案_简化版_哈希表基础.md?raw'
// Ch34 ← 原第17课
import test34 from '../../第17课_unordered_map详解/测试卷_简化版_unordered_map详解.md?raw'
import answer34 from '../../第17课_unordered_map详解/答案_简化版_unordered_map详解.md?raw'
// Ch35 ← 原第15课
import test35 from '../../第15课_综合训练与测评/测试卷_简化版_综合训练.md?raw'
import answer35 from '../../第15课_综合训练与测评/答案_简化版_综合训练.md?raw'

// 所有测试卷内容（仅已有内容的章节）
const testContents = {
  2: test02,
  14: test14,
  17: test17,
  18: test18,
  21: test21,
  23: test23,
  24: test24,
  25: test25,
  26: test26,
  27: test27,
  28: test28,
  29: test29,
  30: test30,
  31: test31,
  32: test32,
  33: test33,
  34: test34,
  35: test35,
}

// 所有答案内容
const answerContents = {
  2: answer02,
  14: answer14,
  17: answer17,
  18: answer18,
  21: answer21,
  23: answer23,
  24: answer24,
  25: answer25,
  26: answer26,
  27: answer27,
  28: answer28,
  29: answer29,
  30: answer30,
  31: answer31,
  32: answer32,
  33: answer33,
  34: answer34,
  35: answer35,
}

// 获取测试卷内容
export function getTestContent(lessonId) {
  if (testContents[lessonId]) return testContents[lessonId]
  const course = courses.find(c => c.id === lessonId)
  const { test } = buildTestAndAnswer(lessonId, course)
  return test
}

// 获取答案内容
export function getAnswerContent(lessonId) {
  if (answerContents[lessonId]) return answerContents[lessonId]
  const course = courses.find(c => c.id === lessonId)
  const { answer } = buildTestAndAnswer(lessonId, course)
  return answer
}
