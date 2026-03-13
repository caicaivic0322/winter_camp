# 📝 第17课 测试卷：unordered_map 详解

**姓名**：____________________          **得分**：____________________

---

## 一、选择题（每题5分，共30分）

**1. unordered_map 的底层实现是（　　）**
A. 数组　B. 链表　C. 哈希表　D. 红黑树

**2. unordered_map 与 map 的主要区别是（　　）**
A. unordered_map 可以存储更多数据
B. unordered_map 查找更快，但元素无序
C. map 查找更快
D. 两者没有区别

**3. 下列哪个方法用于检查键是否存在？（　　）**
A. `exist()`　B. `find()` 或 `count()`　C. `contains()`　D. `search()`

**4. 使用下标访问 unordered_map 中不存在的键时，会（　　）**
A. 抛出异常　B. 返回 nullptr　C. 插入默认值并返回引用　D. 编译错误

**5. 遍历 unordered_map 的正确方式是（　　）**
A. `for (int i = 0; i < mp.size(); i++)`
B. `for (auto p : mp)`
C. `while (!mp.empty())`
D. 以上都可以

**6. 想要按 key 的升序遍历元素，应该使用（　　）**
A. unordered_map　B. map　C. set　D. vector

---

## 二、判断题（每题5分，共20分）

**1. unordered_map 的插入、查找、删除操作时间复杂度都是 O(1) 平均。（　　）**

**2. `mp.erase("key")` 返回的是被删除元素的值。（　　）**

**3. `mp.find("key")` 返回的是指向键值对的迭代器。（　　）**

**4. 负载因子过大会导致哈希表性能下降。（　　）**

---

## 三、填空题（每题5分，共25分）

**1. 使用 unordered_map 前需要包含头文件________。**

**2. 统计字符串 s 中每个字符出现次数的代码是：**
```cpp
for (char c : s) {
    ________;
}
```

**3. 清空 unordered_map 所有元素的方法是________。**

**4. unordered_map 中存储键值对的类型是________。**

**5. 使用________方法可以在插入前判断键是否已存在。**

---

## 四、程序完善题（每题25分，共25分）

### 两数之和（使用 unordered_map）

```cpp
#include <iostream>
#include <unordered_map>
#include <vector>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        ________①________;  // 哈希表：值 -> 索引
        
        for (int i = 0; i < nums.size(); i++) {
            int complement = target - nums[i];
            
            if (mp.________②________(complement)) {  // 查找互补的数
                return {mp[complement], i};
            }
            
            mp.________③________ = i;  // 存入当前数和索引
        }
        
        return {};
    }
};
```

---
