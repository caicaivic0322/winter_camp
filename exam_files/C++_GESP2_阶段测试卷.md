---
title: C++ GESP2 阶段测试卷
language: C++
duration: 60
---

# C++ GESP2 阶段测试卷

考试时间：60 分钟　　满分：100 分

## 一、单选题（每题 2 分，共 40 分）

**1.** 下列关于 C++ 变量的说法正确的是（　　）
A. 变量名可以以数字开头
B. `int` 类型变量可以直接保存小数且不丢失
C. 变量在使用前通常需要先定义
D. 变量名 `cout` 可以随意作为普通变量名使用

**2.** 已知 `int a = 17, b = 5;`，表达式 `a / b` 的值是（　　）
A. 3
B. 3.4
C. 2
D. 4

**3.** 已知 `int a = 17, b = 5;`，表达式 `a % b` 的值是（　　）
A. 5
B. 3
C. 2
D. 4

**4.** 表达式 `2 + 3 * 4` 的值是（　　）
A. 20
B. 14
C. 24
D. 10

**5.** 表达式 `(2 + 3) * 4` 的值是（　　）
A. 14
B. 20
C. 24
D. 10

**6.** 表达式 `!(x > 5 && y <= 10)` 与下列哪个表达式等价（　　）
A. `x <= 5 || y > 10`
B. `x > 5 || y <= 10`
C. `x <= 5 && y > 10`
D. `!x > 5 && !y <= 10`

**7.** 已知 `int x = 2;`，则表达式 `1 < x && x < 3` 的值是（　　）
A. 0
B. 1
C. 2
D. 3

**8.** 阅读下面代码，输出结果是（　　）

```cpp
#include <iostream>
using namespace std;

int main() {
  cout << 2 + 3 * 4;
  return 0;
}
```

A. 20
B. 14
C. 24
D. 10

**9.** 阅读下面代码，输出结果是（　　）

```cpp
#include <iostream>
using namespace std;

int main() {
  cout << (2 + 3) * 4;
  return 0;
}
```

A. 14
B. 20
C. 24
D. 10

**10.** 阅读下面代码，输出结果是（　　）

```cpp
#include <iostream>
using namespace std;

int main() {
  int x = 5;
  x += 2;
  x *= 3;
  cout << x;
  return 0;
}
```

A. 15
B. 17
C. 19
D. 21

**11.** 阅读下面代码，输出结果是（　　）

```cpp
#include <iostream>
using namespace std;

int main() {
  int s = 0;
  for (int i = 1; i <= 3; i++) {
    s += i;
  }
  cout << s;
  return 0;
}
```

A. 3
B. 5
C. 6
D. 7

**12.** 阅读下面代码，输出结果是（　　）

```cpp
#include <iostream>
using namespace std;

int main() {
  for (int i = 0; i < 3; i++) {
    cout << i << " ";
  }
  return 0;
}
```

A. `1 2 3`
B. `0 1 2`
C. `0 1 2 3`
D. `1 2`

**13.** 阅读下面代码，输出结果是（　　）

```cpp
#include <iostream>
using namespace std;

int main() {
  int i = 1;
  while (i <= 3) {
    cout << i;
    i++;
  }
  return 0;
}
```

A. `123`
B. `0123`
C. `321`
D. `111`

**14.** 阅读下面代码，若输入 `85`，输出结果是（　　）

```cpp
#include <iostream>
using namespace std;

int main() {
  int score;
  cin >> score;
  if (score >= 90) cout << "A";
  else if (score >= 60) cout << "B";
  else cout << "C";
  return 0;
}
```

A. A
B. B
C. C
D. 85

**15.** 关于 `if-else if-else` 结构，下列说法正确的是（　　）
A. 一个 `if` 后必须写 `else`
B. 多个分支可能同时执行
C. 当前面条件不满足时，可以继续判断 `else if`
D. `else` 后面必须带条件

**16.** 阅读下面代码，输出结果是（　　）

```cpp
#include <iostream>
using namespace std;

int main() {
  for (int i = 2; i < 8; i += 2) {
    cout << i << " ";
  }
  return 0;
}
```

A. `2 4 6`
B. `2 4 6 8`
C. `0 2 4 6`
D. `2 3 4 5 6 7`

**17.** 阅读下面代码，输出结果是（　　）

```cpp
#include <iostream>
using namespace std;

int main() {
  int cnt = 0;
  for (int i = 1; i <= 5; i++) {
    if (i % 2 == 0) cnt++;
  }
  cout << cnt;
  return 0;
}
```

A. 1
B. 2
C. 3
D. 5

**18.** 阅读下面代码，输出结果是（　　）

```cpp
#include <iostream>
using namespace std;

int main() {
  int x = 10;
  if (x % 3 == 1) cout << "A";
  else cout << "B";
  return 0;
}
```

A. A
B. B
C. 1
D. 0

**19.** 阅读下面代码，输出结果是（　　）

```cpp
#include <iostream>
using namespace std;

int main() {
  int s = 0;
  for (int i = 1; i <= 4; i++) {
    if (i == 3) continue;
    s += i;
  }
  cout << s;
  return 0;
}
```

A. 10
B. 8
C. 7
D. 6

**20.** 阅读下面代码，输出结果是（　　）

```cpp
#include <iostream>
using namespace std;

int main() {
  int s = 0;
  for (int i = 1; i <= 5; i++) {
    if (i == 4) break;
    s += i;
  }
  cout << s;
  return 0;
}
```

A. 10
B. 6
C. 15
D. 3

## 二、判断题（每题 2 分，共 20 分）

**1.** 在 C++ 中，变量必须先定义后使用。（　　）

**2.** 表达式 `17 / 5` 的结果是 `3.4`。（　　）

**3.** 表达式 `17 % 5` 的结果是 `2`。（　　）

**4.** 表达式 `2 + 3 * 4` 的值是 `20`。（　　）

**5.** 表达式 `(2 + 3) * 4` 的值是 `20`。（　　）

**6.** 在 `if-else if-else` 结构中，只会执行其中一个分支。（　　）

**7.** `for (int i = 0; i < 3; i++)` 会让 `i` 依次取 `0、1、2`。（　　）

**8.** `while` 循环至少会执行一次。（　　）

**9.** `continue` 会结束整个循环。（　　）

**10.** `break` 可以提前结束当前循环。（　　）

## 三、程序完善题（每题 5 分，共 40 分）

### 第1题：读取两个整数并输出较大值

**题目描述：** 输入两个整数 `a` 和 `b`，输出较大的那个数。

```cpp
#include <iostream>
using namespace std;

int main() {
  int a, b;
  cin >> a >> b;
  if (a > b) cout << a;
  else cout << ______①;
  return 0;
}
```

**① 的备选项：**
A. `a`
B. `b`
C. `a + b`
D. `0`

---

### 第2题：判断奇偶性

**题目描述：** 输入一个整数 `n`，如果它是偶数输出 `even`，否则输出 `odd`。

```cpp
#include <iostream>
using namespace std;

int main() {
  int n;
  cin >> n;
  if (n % 2 == 0) cout << "even";
  else cout << ______②;
  return 0;
}
```

**② 的备选项：**
A. `"even"`
B. `"odd"`
C. `odd`
D. `n`

---

### 第3题：计算 1 到 n 的和

**题目描述：** 输入一个正整数 `n`，计算 `1 + 2 + ... + n`。

```cpp
#include <iostream>
using namespace std;

int main() {
  int n, s = 0;
  cin >> n;
  for (int i = 1; i <= n; i++) {
    s += ______③;
  }
  cout << s;
  return 0;
}
```

**③ 的备选项：**
A. `n`
B. `i`
C. `s`
D. `1`

---

### 第4题：统计偶数个数

**题目描述：** 输入一个正整数 `n`，统计 `1` 到 `n` 中偶数的个数。

```cpp
#include <iostream>
using namespace std;

int main() {
  int n, cnt = 0;
  cin >> n;
  for (int i = 1; i <= n; i++) {
    if (______④) cnt++;
  }
  cout << cnt;
  return 0;
}
```

**④ 的备选项：**
A. `i / 2 == 0`
B. `i % 2 == 0`
C. `n % 2 == 0`
D. `i == 2`

---

### 第5题：分数分级

**题目描述：** 输入一个分数 `score`，若大于等于 90 输出 `A`，若大于等于 60 输出 `B`，否则输出 `C`。

```cpp
#include <iostream>
using namespace std;

int main() {
  int score;
  cin >> score;
  if (score >= 90) cout << "A";
  else if (______⑤) cout << "B";
  else cout << "C";
  return 0;
}
```

**⑤ 的备选项：**
A. `score > 60`
B. `score >= 60`
C. `score <= 60`
D. `score == 60 || 90`

---

### 第6题：输出 0 到 4

**题目描述：** 用 `for` 循环输出 `0 1 2 3 4`。

```cpp
#include <iostream>
using namespace std;

int main() {
  for (int i = 0; i ______⑥; i++) {
    cout << i << " ";
  }
  return 0;
}
```

**⑥ 的备选项：**
A. `<= 4`
B. `< 4`
C. `< 5`
D. `<= 5`

---

### 第7题：使用 while 循环累加

**题目描述：** 用 `while` 循环计算 `1 + 2 + 3 + 4`。

```cpp
#include <iostream>
using namespace std;

int main() {
  int i = 1, s = 0;
  while (i <= 4) {
    s += i;
    ______⑦;
  }
  cout << s;
  return 0;
}
```

**⑦ 的备选项：**
A. `i--`
B. `i += 2`
C. `i++`
D. `s++`

---

### 第8题：跳过数字 3

**题目描述：** 用循环输出 `1 2 4 5`，跳过 `3`。

```cpp
#include <iostream>
using namespace std;

int main() {
  for (int i = 1; i <= 5; i++) {
    if (i == 3) ______⑧;
    cout << i << " ";
  }
  return 0;
}
```

**⑧ 的备选项：**
A. `break`
B. `continue`
C. `return`
D. `cout`

## 参考答案汇总

**单选题：**
1.C　2.A　3.C　4.B　5.B　6.A　7.B　8.B　9.B　10.C
11.C　12.B　13.A　14.B　15.C　16.A　17.B　18.A　19.C　20.B

**判断题：**
1.√　2.×　3.√　4.×　5.√　6.√　7.√　8.×　9.×　10.√

**程序完善题：**
①B　②B　③B　④B　⑤B　⑥C　⑦C　⑧B
