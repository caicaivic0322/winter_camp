// 讲义内容加载器
// 新章节 placeholder 导入
import chapter01 from '../../第01章_初识C++/讲义_初识C++.md?raw'
import chapter03 from '../../第03章_数据类型/讲义_数据类型.md?raw'
import chapter04 from '../../第04章_程序结构与运算符/讲义_程序结构与运算符.md?raw'
import chapter05 from '../../第05章_条件分支/讲义_条件分支.md?raw'
import chapter06 from '../../第06章_离散分支/讲义_离散分支.md?raw'
import chapter07 from '../../第07章_while循环/讲义_while循环.md?raw'
import chapter08 from '../../第08章_for循环/讲义_for循环.md?raw'
import chapter09 from '../../第09章_初识数组/讲义_初识数组.md?raw'
import chapter10 from '../../第10章_嵌套循环/讲义_嵌套循环.md?raw'
import chapter11 from '../../第11章_二维数组/讲义_二维数组.md?raw'
import chapter12 from '../../第12章_字符串/讲义_字符串.md?raw'
import chapter13 from '../../第13章_动态数组/讲义_动态数组.md?raw'
import chapter15 from '../../第15章_指针/讲义_指针.md?raw'
import chapter16 from '../../第16章_文件操作/讲义_文件操作.md?raw'
import chapter19 from '../../第19章_栈和队列/讲义_栈和队列.md?raw'
import chapter20 from '../../第20章_union集合体/讲义_union集合体.md?raw'
import chapter22 from '../../第22章_图/讲义_图.md?raw'

// 映射到已有内容的导入
// Ch2 二进制与进制转换 ← 原第02课
import chapter02 from '../../第02课_二进制与位运算/讲义_二进制与位运算.md?raw'
// Ch14 函数 ← 原第01课
import chapter14 from '../../第01课_函数强化与传参机制/讲义_函数强化与传参机制.md?raw'
// Ch17 结构体和类 ← 原第03课
import chapter17 from '../../第03课_结构体与类的应用/讲义_结构体与类的应用.md?raw'
// Ch18 链表 ← 原第13课_链表基础
import chapter18 from '../../第13课_链表基础/讲义_链表基础.md?raw'
// Ch21 树 ← 原第09课
import chapter21 from '../../第09课_树与二叉树/讲义_树与二叉树.md?raw'

// Part 3 进阶算法 ← 映射到已有内容
// Ch23 插入排序 ← 原第07课
import chapter23 from '../../第07课_插入排序/讲义_插入排序.md?raw'
// Ch24 冒泡排序 ← 原第08课
import chapter24 from '../../第08课_冒泡排序/讲义_冒泡排序.md?raw'
// Ch25 分治与归并 ← 原第10课
import chapter25 from '../../第10课_分治与归并/讲义_分治与归并.md?raw'
// Ch26 快速排序与贪心 ← 原第11课
import chapter26 from '../../第11课_快速排序与贪心/讲义_快速排序与贪心.md?raw'
// Ch27 堆排序 ← 原第13课_堆与堆排序
import chapter27 from '../../第13课_堆与堆排序/讲义_堆与堆排序.md?raw'
// Ch28 高精度加法 ← 原第04课
import chapter28 from '../../第04课_高精度加法/讲义_高精度加法.md?raw'
// Ch29 高精度减法 ← 原第05课
import chapter29 from '../../第05课_高精度减法/讲义_高精度减法.md?raw'
// Ch30 高精度乘法 ← 原第06课
import chapter30 from '../../第06课_高精度乘法/讲义_高精度乘法.md?raw'
// Ch31 动态规划 ← 原第12课
import chapter31 from '../../第12课_动态规划/讲义_动态规划.md?raw'
// Ch32 搜索算法 ← 原第14课
import chapter32 from '../../第14课_搜索算法/讲义_搜索算法.md?raw'
// Ch33 哈希表基础 ← 原第16课
import chapter33 from '../../第16课_哈希表基础/讲义_哈希表基础.md?raw'
// Ch34 unordered_map ← 原第17课
import chapter34 from '../../第17课_unordered_map详解/讲义_unordered_map详解.md?raw'
// Ch35 综合训练 ← 原第15课
import chapter35 from '../../第15课_综合训练与测评/讲义_综合训练.md?raw'

// 所有课程讲义内容
export const lessonContents = {
  // Part 1: C++基础语法
  1: chapter01,
  2: chapter02,
  3: chapter03,
  4: chapter04,
  5: chapter05,
  6: chapter06,
  7: chapter07,
  8: chapter08,
  9: chapter09,
  10: chapter10,
  11: chapter11,
  12: chapter12,
  13: chapter13,
  14: chapter14,
  15: chapter15,
  16: chapter16,
  // Part 2: 数据结构
  17: chapter17,
  18: chapter18,
  19: chapter19,
  20: chapter20,
  21: chapter21,
  22: chapter22,
  // Part 3: 进阶算法
  23: chapter23,
  24: chapter24,
  25: chapter25,
  26: chapter26,
  27: chapter27,
  28: chapter28,
  29: chapter29,
  30: chapter30,
  31: chapter31,
  32: chapter32,
  33: chapter33,
  34: chapter34,
  35: chapter35,
}

// 获取课程内容
export function getLessonContent(lessonId) {
  return lessonContents[lessonId] || null
}
