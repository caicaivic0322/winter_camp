# 📘 第17课：unordered_map 详解

> **课程定位**：掌握 C++ 标准库哈希表，提升编码效率

---

## 一、学习目标

1. ✅ 掌握 unordered_map 的基本用法
2. ✅ 理解 unordered_map 与 map 的区别
3. ✅ 熟练使用 unordered_map 的常用方法
4. ✅ 能够在竞赛中灵活运用 unordered_map

---

## 二、unordered_map 概述

### 2.1 什么是 unordered_map？

`unordered_map` 是 C++ 标准模板库（STL）提供的哈希表实现，**无序**存储键值对，查找、插入、删除平均时间复杂度为 **O(1)**。

### 2.2 头文件与命名空间

```cpp
#include <unordered_map>
using namespace std;
```

---

## 三、基本操作

### 3.1 声明与初始化

```cpp
// 声明
unordered_map<string, int> mp;

// 初始化方式1：insert
mp.insert({"apple", 3});
mp.insert(make_pair("banana", 2));

// 初始化方式2：下标访问
mp["orange"] = 5;

// 初始化方式3：构造
unordered_map<string, int> mp2 = {
    {"red", 1},
    {"green", 2},
    {"blue", 3}
};
```

### 3.2 插入元素

```cpp
unordered_map<string, int> mp;

// 方法1：insert
mp.insert({"hello", 100});
mp.insert(make_pair("world", 200));

// 方法2：下标运算符（重点！）
mp["key1"] = 10;    // 如果 key 不存在，插入并返回引用
mp["key2"] = 20;

// 注意：下标访问会修改值，如果键不存在会插入默认值
cout << mp["new_key"];  // 插入默认值 0，并返回引用
```

### 3.3 查找元素

```cpp
unordered_map<string, int> mp = {
    {"apple", 3},
    {"banana", 2}
};

// 方法1：find（推荐）
auto it = mp.find("apple");
if (it != mp.end()) {
    cout << "找到: " << it->first << " = " << it->second << endl;
} else {
    cout << "未找到" << endl;
}

// 方法2：count（检查键是否存在）
if (mp.count("banana")) {
    cout << "存在" << endl;
}

// 方法3：下标访问（不推荐用于查找，会插入新元素）
cout << mp["apple"] << endl;  // 3
cout << mp["grape"] << endl;  // 0，并插入新元素！
```

### 3.4 修改元素

```cpp
unordered_map<string, int> mp = {{"a", 1}, {"b", 2}};

// 方法1：下标修改
mp["a"] = 100;  // 修改已存在的键

// 方法2：通过迭代器修改
auto it = mp.find("b");
if (it != mp.end()) {
    it->second = 200;
}
```

### 3.5 删除元素

```cpp
unordered_map<string, int> mp = {{"a", 1}, {"b", 2}, {"c", 3}};

// 方法1：按键删除
mp.erase("a");  // 返回删除的元素个数（0或1）

// 方法2：通过迭代器删除
auto it = mp.find("b");
if (it != mp.end()) {
    mp.erase(it);
}

// 方法3：清空所有元素
mp.clear();
```

### 3.6 遍历元素

```cpp
unordered_map<string, int> mp = {
    {"apple", 3},
    {"banana", 2},
    {"orange", 5}
};

// 方法1：范围for循环（最常用）
for (const auto& [key, value] : mp) {
    cout << key << " -> " << value << endl;
}

// 方法2：迭代器
for (auto it = mp.begin(); it != mp.end(); ++it) {
    cout << it->first << " -> " << it->second << endl;
}
```

---

## 四、常用方法汇总

### 4.1 容量相关

| 方法 | 说明 | 示例 |
|------|------|------|
| `empty()` | 是否为空 | `mp.empty()` |
| `size()` | 元素个数 | `mp.size()` |
| `max_size()` | 最大容量 | `mp.max_size()` |

```cpp
cout << mp.empty() << endl;  // false
cout << mp.size() << endl;   // 3
```

### 4.2 元素访问

| 方法 | 说明 | 示例 |
|------|------|------|
| `at(key)` | 访问键对应的值，键不存在抛出异常 | `mp.at("a")` |
| `operator[]` | 访问或插入 | `mp["a"]` |

```cpp
cout << mp.at("apple") << endl;  // 3
// mp.at("grape");  // 抛出 out_of_range 异常
```

### 4.3 元素操作

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `find(key)` | 查找键 | 迭代器或 end() |
| `count(key)` | 键是否存在 | 0 或 1 |
| `insert(val)` | 插入键值对 | pair<iterator, bool> |
| `erase(key)` | 删除键 | 删除个数 |
| `clear()` | 清空所有 | void |

---

## 五、unordered_map vs map

### 5.1 区别对比

| 特性 | unordered_map | map |
|------|----------------|-----|
| 底层实现 | 哈希表 | 红黑树 |
| 查找复杂度 | O(1) 平均 | O(log n) |
| 是否有序 | **无序** | **有序**（按 key 排序） |
| 键要求 | 无特殊要求 | 需要可比较 |
| 迭代器顺序 | 不确定 | 按 key 升序 |
| 内存占用 | 较低 | 较高（需要存树结构） |

### 5.2 如何选择？

```cpp
// 使用 unordered_map 的场景：
// 1. 只关心查找速度，不需要有序
// 2. key 是基本类型或字符串
// 3. 数据量较大

// 使用 map 的场景：
// 1. 需要按 key 顺序遍历
// 2. 需要范围查找（如找 >= x 的所有元素）
// 3. key 是自定义类型且需要自定义比较函数
```

### 5.3 示例对比

```cpp
#include <iostream>
#include <unordered_map>
#include <map>
using namespace std;

int main() {
    unordered_map<int, string> umap;
    map<int, string> mp;
    
    // 插入相同数据
    umap[3] = "three";
    umap[1] = "one";
    umap[2] = "two";
    
    mp[3] = "three";
    mp[1] = "one";
    mp[2] = "two";
    
    cout << "unordered_map (无序):" << endl;
    for (auto& p : umap) {
        cout << p.first << " ";
    }
    cout << endl;
    
    cout << "map (有序):" << endl;
    for (auto& p : mp) {
        cout << p.first << " ";
    }
    cout << endl;
    
    return 0;
}
```

**输出**（顺序可能因编译器/平台不同而异）：
```
unordered_map (无序):
3 1 2
map (有序):
1 2 3
```

---

## 六、实用技巧

### 6.1 自定义类型作为 key

```cpp
#include <iostream>
#include <unordered_map>
#include <string>
using namespace std;

// 自定义结构体作为键
struct Point {
    int x, y;
    bool operator==(const Point& other) const {
        return x == other.x && y == other.y;
    }
};

// 哈希函数
struct PointHash {
    size_t operator()(const Point& p) const {
        return hash<int>()(p.x) ^ hash<int>()(p.y);
    }
};

int main() {
    unordered_map<Point, string, PointHash> mp;
    
    mp[{1, 2}] = "A";
    mp[{3, 4}] = "B";
    
    cout << mp[{1, 2}] << endl;  // A
    
    return 0;
}
```

### 6.2 统计出现次数

```cpp
#include <iostream>
#include <unordered_map>
#include <string>
using namespace std;

int main() {
    string s = "hello world";
    unordered_map<char, int> cnt;
    
    for (char c : s) {
        cnt[c]++;  // 统计每个字符出现次数
    }
    
    for (auto& p : cnt) {
        cout << p.first << ": " << p.second << endl;
    }
    
    return 0;
}
```

### 6.3 去重

```cpp
#include <iostream>
#include <unordered_map>
using namespace std;

int main() {
    int arr[] = {1, 2, 3, 2, 1, 4, 5, 3};
    unordered_map<int, bool> seen;
    
    for (int x : arr) {
        if (!seen.count(x)) {
            cout << x << " ";
            seen[x] = true;
        }
    }
    // 输出: 1 2 3 4 5
    
    return 0;
}
```

### 6.4 哈希表大小设置

```cpp
unordered_map<string, int> mp;

// 预留空间，减少扩容开销
mp.reserve(1000000);  // 预留能存100万个元素的空间
mp.max_load_factor(0.7);  // 设置最大负载因子（默认0.75）
```

### 6.5 使用 emplace 提高效率

```cpp
unordered_map<string, vector<int>> mp;

// emplace 直接构造，比 insert 更高效
mp.emplace("key", vector<int>{1, 2, 3});

// 相当于
mp.insert({"key", vector<int>{1, 2, 3}});
```

---

## 七、完整示例：两数之和

### 7.1 题目

给定一个整数数组 nums 和一个整数 target，返回数组中两数之和为目标值的两个索引。

### 7.2 代码

```cpp
#include <iostream>
#include <unordered_map>
#include <vector>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> mp;  // 值 -> 索引
        
        for (int i = 0; i < nums.size(); i++) {
            int complement = target - nums[i];
            
            // 查找是否存在互补的数
            if (mp.count(complement)) {
                return {mp[complement], i};
            }
            
            // 存入当前数和索引
            mp[nums[i]] = i;
        }
        
        return {};  // 未找到
    }
};

int main() {
    Solution s;
    vector<int> nums = {2, 7, 11, 15};
    int target = 9;
    
    vector<int> result = s.twoSum(nums, target);
    
    if (!result.empty()) {
        cout << "[" << result[0] << ", " << result[1] << "]" << endl;
    }
    
    return 0;
}
```

**运行结果**：
```
[0, 1]
```

**时间复杂度**：O(n)，只需遍历一次数组
**空间复杂度**：O(n)，哈希表存储元素

---

## 八、竞赛常用模式

### 8.1 频率统计

```cpp
// 统计每个数出现次数
unordered_map<int, int> freq;
for (int x : arr) {
    freq[x]++;
}
```

### 8.2 标记数组（替代 bool 数组）

```cpp
// 当数组下标范围很大时，用 unordered_set 代替 bool 数组
unordered_set<int> visited;
visited.insert(1000000000);  // 大整数下标也可以
```

### 8.3 邻接表（字符串图）

```cpp
unordered_map<string, vector<string>> graph;
graph["北京"].push_back("上海");
graph["北京"].push_back("广州");
```

### 8.4 动态规划缓存

```cpp
unordered_map<long long, int> memo;

int fib(long long n) {
    if (n == 0 || n == 1) return n;
    if (memo.count(n)) return memo[n];
    
    memo[n] = fib(n-1) + fib(n-2);
    return memo[n];
}
```

---

## 九、注意事项

### 9.1 哈希冲突与安全

```cpp
// 某些极端输入可能导致哈希冲突，性能退化
// 竞赛中通常不用担心，但工程中需注意

// 可以使用自定义哈希函数避免
struct custom_hash {
    static uint64_t splitmix64(uint64_t x) {
        // 防止哈希攻击的哈希函数
        x += 0x9e3779b97f4a7c15;
        x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9;
        x = (x ^ (x >> 27)) * 0x94d049bb133111eb;
        return x ^ (x >> 31);
    }
    size_t operator()(uint64_t x) const {
        static const uint64_t FIXED_RANDOM = chrono::steady_clock::now().time_since_epoch().count();
        return splitmix64(x + FIXED_RANDOM);
    }
};

unordered_map<long long, int, custom_hash> mp;
```

### 9.2 不能用下标访问查找

```cpp
unordered_map<string, int> mp;
// 错误用法！
if (mp["key"] == 0) {  // 这会插入一个新元素！
    // ...
}

// 正确用法
if (mp.find("key") != mp.end() && mp["key"] == 0) {
    // ...
}

// 或者
if (mp.count("key") && mp["key"] == 0) {
    // ...
}
```

---

## 十、总结

| 操作 | 方法 | 时间复杂度 |
|------|------|-----------|
| 插入 | `mp[key] = value` 或 `insert` | O(1) 平均 |
| 查找 | `find` 或 `count` | O(1) 平均 |
| 删除 | `erase` | O(1) 平均 |
| 遍历 | `for (auto& p : mp)` | O(n) |

**选择建议**：
- 追求查找速度 → `unordered_map`
- 需要有序遍历 → `map`

---

## 十一、课后练习

1. **统计字符串中每个字符出现的频率**
2. **使用 unordered_map 实现 LRU 缓存**
3. **实现一个简单的电话号码簿（姓名 → 电话）**

---

**恭喜完成哈希表专题学习！** 现在你已掌握：
- ✅ 哈希表的原理与实现
- ✅ C++ unordered_map 的使用方法
- ✅ 竞赛中的高频应用场景

**下节课预告**：综合训练与测评，检验学习成果！
