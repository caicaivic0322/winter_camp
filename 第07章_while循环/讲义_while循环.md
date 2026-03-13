# 📘 第7章 while 循环

> 目标：掌握 while 与 do-while 的使用场景与差异，理解 i++ 与 ++i 的区别

---

## 7.1 迭代器（i++ 和 ++i）
```cpp
int i = 0;
cout << i++ << " " << i << endl; // 输出 0 1
i = 0;
cout << ++i << " " << i << endl; // 输出 1 1
```
- `i++`：使用旧值，再自增；`++i`：先自增，再使用

---

## 7.2 while 循环
```cpp
int n; cin >> n;
int sum = 0, i = 1;
while (i <= n) {
    sum += i;
    i++;
}
cout << sum << endl;
```
- 先判断再执行；适合“次数未知但条件明确”的循环

---

## 7.3 do-while 循环
```cpp
int x;
do {
    cin >> x;
} while (x <= 0); // 至少执行一次
```
- 先执行再判断；适合“至少执行一次”的场景

---

## 小练习
1) 输入一串正整数，读到 0 结束，输出它们的和
2) 求 n 的阶乘（n≤20），用 while 实现
