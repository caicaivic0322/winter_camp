# 📘 第8章 for 循环

> 目标：掌握 for 循环结构、continue/break、典型例题（质数、斐波那契）

---

## 8.1 for 循环的基本结构
```cpp
int sum = 0;
for (int i = 1; i <= 100; i++) {
    sum += i;
}
cout << sum << endl;
```
- 初始化 → 条件 → 每轮末尾更新；计数循环首选 for

---

## 8.2 continue 和 break
```cpp
for (int i = 1; i <= 10; i++) {
    if (i % 2 == 0) continue; // 跳过偶数
    if (i > 7) break;         // 提前结束
    cout << i << " ";
}
```

---

## 8.3 求质数（试除法）
```cpp
bool isPrime(int n) {
    if (n < 2) return false;
    for (int i = 2; i * i <= n; i++) {
        if (n % i == 0) return false;
    }
    return true;
}
```

---

## 8.4 斐波那契数列（迭代版）
```cpp
long long fib(int n) {
    if (n <= 2) return 1;
    long long a = 1, b = 1;
    for (int i = 3; i <= n; i++) {
        long long c = a + b;
        a = b; b = c;
    }
    return b;
}
```

---

## 小练习
1) 打印 1..n 中所有质数
2) 打印前 n 项斐波那契数列（n≤50）
