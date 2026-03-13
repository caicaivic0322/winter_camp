# 📘 第1章 初识C++

> 目标：完成开发环境搭建，掌握 C++ 程序基本结构、输入输出与变量定义

---

## 1.1 C++的历史与发展
- 由 Bjarne Stroustrup 在 C 语言基础上发展而来，支持过程式与面向对象、泛型编程
- 现代 C++（C++11/14/17/20）引入智能指针、auto、范围 for、lambda 等特性

---

## 1.2 搭建开发环境
- 安装编译器：Windows 可用 MinGW-w64/MSYS2，macOS 自带 clang 或安装 Xcode Command Line Tools，Linux 使用 g++
- 常用编辑器：VS Code + C/C++ 扩展；或 CLion、Visual Studio
- 命令行编译运行：
```bash
g++ -std=c++17 hello.cpp -o hello
./hello
```

---

## 1.3 C++的基本框架和代码结构
```cpp
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, C++!" << endl;
    return 0;
}
```
- 头文件：`#include <iostream>`
- 命名空间：`using namespace std;`
- 入口：`int main()` 返回 0 表示程序正常结束

---

## 1.4 输入输出操作
```cpp
#include <iostream>
using namespace std;

int main() {
    int a; double b; string s;
    cin >> a >> b >> s;      // 输入：以空白分隔
    cout << a << " " << b << " " << s << endl; // 输出并换行
    cout << "sum=" << (a + (int)b) << endl;
    return 0;
}
```
- `cin` 读取，`cout` 输出；`endl` 刷新缓冲并换行

---

## 1.5 C风格格式化输出
```cpp
#include <cstdio>
int main() {
    int x = 42; double y = 3.14159;
    printf("x=%d y=%.2f\n", x, y);   // 保留两位小数
    return 0;
}
```
- `printf` 常用占位：`%d` 整数，`%lld` 长整型，`%f` 浮点，`%s` 字符串，`%c` 字符

---

## 1.6 变量的定义与使用
```cpp
#include <iostream>
using namespace std;

int main() {
    int n = 10;            // 整型
    long long big = 1e12;  // 长整型
    double pi = 3.14159;   // 浮点
    char ch = 'A';         // 字符
    bool ok = true;        // 布尔
    cout << n << " " << big << " " << pi << " " << ch << " " << ok << endl;
    return 0;
}
```
- 命名建议：小写加下划线/驼峰；避免与关键字冲突；初始化防未定义行为

---

## 随堂练习
1) 读入两个整数 `a,b`，输出它们的和、差、积
2) 读入一个半径 `r`（double），输出圆的面积（保留两位小数，`area = πr^2`，取 `π=3.14159`）
3) 编写程序读入姓名与年龄，输出 `Hello, NAME, age=AGE`
