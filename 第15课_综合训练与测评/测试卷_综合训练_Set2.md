# 📝 C++ 程序设计综合测试卷（Set 2）

考试时间：60 分钟　　满分：100 分
**姓名**：**\*\*\*\***\_\_\_\_**\*\*\*\*** **得分**：**\*\*\*\***\_\_\_\_**\*\*\*\***

---

## 一、单选题（每题 2 分，共 50 分）

**1. 十进制数 100 转换成二进制数的结果是（　　）**
A. 1100100
B. 1101000
C. 1011010
D. 1100010

**2. 在 C++ 中，下列数据类型中占用内存最大的是（　　）**
A. `short`
B. `long long`
C. `char`
D. `long`

**3. 下列标志符中，不合法的是（　　）**
A. `name_123`
B. `_index`
C. `double`
D. `MyVariable`

**4. 设 `int a = 1, b = 2, c = 3;`，执行 `a += b *= c;` 后，`a` 的值是（　　）**
A. 6
B. 7
C. 9
D. 11

**5. 关于 C++ 中的 `switch` 语句，下列说法正确的是（　　）**
A. `case` 标签后面必须是常数表达式
B. 每个 `case` 自带 `break` 功能
C. `default` 必须放在所有 `case` 的前面
D. `switch` 控制表达式可以是任意浮点数

**6. 下面哪个是用于输入一整行字符串（包含空格）的正确语法？（　　）**
A. `cin >> s;`
B. `getline(cin, s);`
C. `cin.get(s);`
D. `scanf("%s", s);`

**7. 已知 `int a[10];`，则访问 `a[10]` 时程序通常会发生（　　）**
A. 编译错误
B. 语法纠偏
C. 越界访问（未定义行为）
D. 自动扩容

**8. 在 C++ 中，一维数组的长度必须（　　）**
A. 在编译时确定（常量表达式）
B. 在运行时通过 `cin` 输入确定
C. 始终为 100
D. 无法确定

**9. 下列哪种排序算法通常使用分治法实现？（　　）**
A. 插入排序
B. 选择排序
C. 归并排序
D. 冒泡排序

**10. 计算机系统中的 RAM 指的是（　　）**
A. 只读存储器
B. 随机存取存储器
C. 硬盘控制器
D. 高速缓冲存储器

**11. 以下代码的输出结果是（　　）**
`int x = 2; cout << (x << 3) << endl;`
A. 5
B. 8
C. 16
D. 6

**12. 设 `arr` 是一个 $4 \times 5$ 的二维数组，`arr[0][0]` 的地址为 $1000$，每个元素占 4 字节，则 `arr[2][3]` 的地址为（　　）**
A. 1032
B. 1052
C. 1048
D. 1040

**13. 下面哪个不是 C++ 的逻辑运算符？（　　）**
A. `&&`
B. `||`
C. `!`
D. `&`

**14. 在递归函数中，必须存在（　　）以防止无限循环。**
A. 多个 `return`
B. 终止条件（基准情形）
C. 至少一个循环
D. 全局变量

**15. 关于 C++ 中的结构体 `struct`，下列说法错误的是（　　）**
A. 结构体可以包含不同类型的成员
B. 结构体变量可以直接进行加法运算
C. 结构体指针可以使用 `->` 运算符访问成员
D. 结构体可以作为函数的参数

**16. ASCII 码中，小写字母 'a' 和大写字母 'A' 之间的数值关系是（　　）**
A. 'a' 是 'A' 的 2 倍
B. 'a' 比 'A' 大 32
C. 'a' 比 'A' 小 32
D. 两者相等，只是显示不同

**17. 一个文件名为 `test.cpp` 的源代码文件，经过编译后通常会产生后缀名为（　　）的目标文件。**
A. `.exe`
B. `.obj` 或 `.o`
C. `.h`
D. `.doc`

**18. 如果 `std::string s = "GESP Level 4";`，执行 `s.substr(0, 4)` 的结果是（　　）**
A. "GESP"
B. "Level"
C. "4"
D. "GESP "

**19. 满二叉树的第 $i$ 层（根为第 1 层）最多有多少个节点？（　　）**
A. $i$
B. $2i$
C. $2^{i-1}$
D. $2^i - 1$

**20. 快速排序最理想的时间复杂度是（　　）**
A. $O(n)$
B. $O(n^2)$
C. $O(n \log n)$
D. $O(\log n)$

**21. 关于 C++ 中的 `break` 和 `continue`，下列说法正确的是（　　）**
A. `break` 结束本次循环，继续下一次
B. `continue` 直接跳出整个循环
C. `break` 只能用于 `for` 循环
D. `continue` 只对当前所在的循环层起作用

**22. 在 32 位操作系统中，`int` 类型通常占用（　　）字节。**
A. 2
B. 4
C. 8
D. 1

**23. 十六进制数 $F$ 对应的二进制数是（　　）**
A. 1111
B. 1010
C. 1100
D. 0111

**24. 若有 `int a = 10; int &b = a;`，则修改 `b = 20;` 后，`a` 的值变为（　　）**
A. 10
B. 20
C. 不确定
D. 报错

**25. 万维网（World Wide Web）的简称是（　　）**
A. LAN
B. WWW
C. URL
D. HTTP

---

## 二、判断题（每题 2 分，共 10 分）

**1.** 逻辑表达式 `(A || B)` 中，只要 `A` 为真，整个表达式的结果即为真。（　　）

**2.** 数组名在 C++ 中可以作为常量指针，指向数组的首地址。（　　）

**3.** 如果不使用 `using namespace std;`，则必须在 `cout` 前加上 `std::` 前缀。（　　）

**4.** C++ 中定义的局部变量如果不初始化，其值默认为 0。（　　）

**5.** 位运算 `~` 是按位取反，它是一个单目运算符。（　　）

---

## 三、完善程序题（每空 5 分，共 40 分）

### 第1题：二分查找实现

**题目描述**：在有序数组 `a` 中查找目标值 `target`。如果找到返回其下标，否则返回 -1。

```cpp
int binarySearch(int a[], int n, int target) {
    int left = 0, right = ______①;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (a[mid] == target) {
            return ______②;
        } else if (a[mid] < target) {
            left = mid + 1;
        } else {
            right = ______③;
        }
    }
    return -1;
}
```

**① 的备选项：**
A. `n`
B. `n - 1`
C. `n + 1`
D. `0`

**② 的备选项：**
A. `target`
B. `mid`
C. `a[mid]`
D. `-1`

**③ 的备选项：**
A. `mid + 1`
B. `mid - 1`
C. `mid`
D. `left`

### 第2题：求两个正整数的最大公约数（递归法）

**题目描述**：利用辗转相除法（欧几里得算法）的递归实现。

```cpp
int gcd(int a, int b) {
    if (b == 0) {
        return ______④;
    }
    return gcd(b, ______⑤);
}
```

**④ 的备选项：**
A. `a`
B. `b`
C. `0`
D. `1`

**⑤ 的备选项：**
A. `a`
B. `a / b`
C. `a % b`
D. `a - b`

### 第3题：结构体数组排序（按分降序）

**题目描述**：给定一个学生结构体数组，按照成绩从高到低排序（使用简单的选择排序逻辑）。

```cpp
struct Student {
    string name;
    int score;
};

void sortByScore(Student stu[], int n) {
    for (int i = 0; i < n - 1; i++) {
        int maxIdx = i;
        for (int j = i + 1; j < n; j++) {
            if (stu[j].score > ______⑥) {
                maxIdx = j;
            }
        }
        // 交换 stu[i] 和 stu[maxIdx]
        Student temp = stu[i];
        stu[i] = stu[maxIdx];
        stu[______⑦] = temp;
    }
}
```

**⑥ 的备选项：**
A. `stu[i].score`
B. `maxIdx`
C. `stu[maxIdx].score`
D. `stu[j-1].score`

**⑦ 的备选项：**
A. `i`
B. `j`
C. `maxIdx`
D. `0`

### 第4题：计算数组平均值（保留两位小数）

**题目描述**：完善程序，计算 `n` 个元素的平均值。

```cpp
#include <iomanip>
// ... 其他代码 ...
void printAverage(int a[], int n) {
    double sum = 0;
    for (int i = 0; i < n; i++) {
        sum += a[i];
    }
    double avg = ______⑧ / n;
    cout << fixed << setprecision(2) << avg << endl;
}
```

**⑧ 的备选项：**
A. `sum`
B. `(double)sum`
C. `a[i]`
D. `count`
