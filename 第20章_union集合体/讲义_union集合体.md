# 📘 第20章 union 集合体

> 目标：理解 `union` 的存储特性与使用注意事项，区分与 `struct` 的差异

---

## 20.1 基本概念
- `union` 内所有成员**共享同一段内存**，大小为最大成员的大小
```cpp
union U {
    int i;
    float f;
    char c;
};
```

---

## 20.2 使用场景
- 同一段数据以不同视角解读（需谨慎，可能与严格别名规则相关）
- 与标签配合实现“变体类型”的简易表达
```cpp
struct Node {
    int tag; // 0:int 1:double
    union { int i; double d; } val;
};
```

---

## 20.3 与 struct 的区别
- `struct`：每个成员各占自己的内存
- `union`：多个成员共用同一内存，仅能同时有效使用一个成员

---

## 小练习
1) 定义一个包含 `int`/`double` 的联合体与标签，读入多组数据并按类型输出
