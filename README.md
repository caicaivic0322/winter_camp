# 🚀 延安科创训练营

<div align="center">

![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-Private-red?style=for-the-badge)

**35章节系统学习 C++ 编程与信息学的在线教学平台**

[🌐 在线预览](#部署) · [📖 课程内容](#课程内容) · [🛠 技术栈](#技术栈) · [📦 快速开始](#快速开始)

</div>

---

## 📋 项目简介

这是一个为 **延安科创训练营** 打造的现代化在线教学网站，包含 35 节精心编排的课程，涵盖从基础语法强化到高级数据结构与算法的完整学习路线。

### ✨ 核心特性

| 功能              | 说明                                      |
| ----------------- | ----------------------------------------- |
| 🔐 **用户认证**   | 完整的注册/登录系统，用户数据本地持久化   |
| ⏰ **课程时间锁** | 按日期自动解锁课程（每天8:00开放2节新课） |
| 🎨 **主题切换**   | 支持暗色/亮色主题，亮色采用清新翠绿配色   |
| 📱 **响应式设计** | 完美适配桌面端和移动端设备                |
| 🎬 **算法动画**   | 5种排序算法的交互式可视化演示             |
| 📄 **PDF导出**    | 一键生成精美排版的讲义和测试卷PDF         |

---

## 📚 课程内容

### 第一阶段：基础强化（Day 1-3）

| 课程   | 主题                  | 核心内容                   |
| ------ | --------------------- | -------------------------- |
| Day 01 | 🔧 函数强化与传参机制 | 值传递、引用传递、指针传递 |
| Day 02 | 💡 二进制与位运算     | 六种位运算符、位操作技巧   |
| Day 03 | 📦 结构体与类的应用   | 面向对象编程基础           |

### 第二阶段：高精度运算（Day 4-6）

| 课程   | 主题          | 核心内容           |
| ------ | ------------- | ------------------ |
| Day 04 | ➕ 高精度加法 | 大数存储、进位处理 |
| Day 05 | ➖ 高精度减法 | 借位处理、符号判断 |
| Day 06 | ✖️ 高精度乘法 | 乘法公式、阶乘应用 |

### 第三阶段：排序算法（Day 7-12）

| 课程   | 主题          | 复杂度     | 动画演示 |
| ------ | ------------- | ---------- | -------- |
| Day 07 | 🃏 插入排序   | O(n²)      | ✅       |
| Day 08 | 🫧 冒泡排序   | O(n²)      | ✅       |
| Day 09 | 🌳 树与二叉树 | -          | -        |
| Day 10 | 🔀 归并排序   | O(n log n) | ✅       |
| Day 11 | ⚡ 快速排序   | O(n log n) | ✅       |
| Day 12 | 🏔️ 堆与堆排序 | O(n log n) | ✅       |

### 第四阶段：数据结构（Day 13-15）

| 课程   | 主题              | 核心内容           |
| ------ | ----------------- | ------------------ |
| Day 13 | 🔗 链表基础       | 节点定义、基本操作 |
| Day 14 | ⛓️ 链表应用       | 反转、合并、环检测 |
| Day 15 | 🏆 综合训练与测评 | 模拟竞赛环境       |

---

## 🛠 技术栈

### 前端框架

- **React 19** - 最新版 React 框架
- **Vite 5** - 下一代前端构建工具
- **React Router 7** - 客户端路由
- **Framer Motion** - 流畅动画效果

### 样式方案

- **CSS Variables** - 主题变量系统
- **CSS Modules** - 模块化样式
- **Google Fonts** - Sora + Noto Sans SC 字体

### 工具库

- **React Markdown** - Markdown 渲染
- **Remark GFM** - GitHub 风格 Markdown 支持
- **ReportLab** - PDF 生成（Python）

---

## 📦 快速开始

### 环境要求

- Node.js 18+
- npm 或 pnpm
- Python 3.8+（用于 PDF 生成）

### 安装依赖

```bash
# 克隆仓库
git clone https://github.com/caicaivic0322/winter_camp.git
cd winter_camp

# 安装前端依赖
npm install

# 安装 PDF 生成依赖（可选）
pip install reportlab
```

### 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:5173](http://localhost:5173) 查看网站。

### 构建生产版本

```bash
npm run build
npm run preview
```

---

## 📁 项目结构

```
winter_camp/
├── src/
│   ├── components/          # 可复用组件
│   │   ├── Navbar.jsx       # 导航栏（含主题切换）
│   │   └── Sidebar.jsx      # 侧边栏
│   ├── contexts/            # React Context
│   │   ├── AuthContext.jsx  # 用户认证 + 课程时间锁
│   │   └── ThemeContext.jsx # 主题管理
│   ├── pages/               # 页面组件
│   │   ├── Home.jsx         # 首页（课程列表）
│   │   ├── Lesson.jsx       # 课程详情
│   │   ├── Login.jsx        # 登录/注册
│   │   └── Visualizer.jsx   # 算法可视化
│   ├── data/                # 静态数据
│   │   ├── courses.js       # 课程配置
│   │   └── lessonContents.js # 课程内容
│   ├── styles/              # 样式文件
│   │   ├── index.css        # 全局样式 + 主题变量
│   │   ├── App.css          # 组件样式
│   │   └── Auth.css         # 认证页面样式
│   ├── App.jsx              # 根组件
│   └── main.jsx             # 入口文件
├── 第XX课_*/                 # Markdown 课程源文件
│   ├── 讲义_*.md
│   └── 测试卷_*.md
├── pdf_output/              # 生成的 PDF 文件
├── generate_pdfs.py         # PDF 生成脚本
├── index.html               # HTML 入口
├── package.json             # 项目配置
└── vite.config.js           # Vite 配置
```

---

## 🔐 访问控制逻辑

### 课程解锁时间表

| 日期             | 开放课程             |
| ---------------- | -------------------- |
| 2026-01-23 08:00 | 第 1-2 课            |
| 2026-01-24 08:00 | 第 3-4 课            |
| 2026-01-25 08:00 | 第 5-6 课            |
| 2026-01-26 08:00 | 第 7-8 课            |
| 2026-01-27 08:00 | 第 9-10 课           |
| 2026-01-28 08:00 | 第 11-12 课          |
| 2026-01-29 08:00 | 第 13-14 课          |
| 2026-01-30 08:00 | 第 15 课（全部完成） |
| 2026-03-31 后    | 网站关闭浏览         |

### 时间配置修改

如需调整课程开放时间，请编辑 `src/contexts/AuthContext.jsx`：

```javascript
const COURSE_CONFIG = {
  startDate: new Date("2026-01-23T08:00:00+08:00"),
  endDate: new Date("2026-03-31T23:59:59+08:00"),
  coursesPerDay: 2,
  totalCourses: 15,
};
```

---

## 🎨 主题配置

### 暗色主题（默认）

- 背景：深灰 `#0d1117`
- 主色：橙色 `#ff7b54`

### 亮色主题

- 背景：浅白 `#f8fafc`
- 主色：翠绿 `#10b981`

主题变量定义在 `src/styles/index.css` 中，可自行扩展。

---

## 📄 PDF 生成

项目包含 Python 脚本用于将 Markdown 课程内容转换为精美 PDF：

```bash
# 生成所有课程 PDF
python3 generate_pdfs.py
```

生成的 PDF 保存在 `pdf_output/` 目录，包含：

- 📘 15份讲义 PDF
- 📝 15份测试卷 PDF

PDF 特性：

- 封面页设计
- 代码块语法高亮
- 中文字体支持（华文黑体）
- 自动分页处理

---

## 🚀 部署

### Vercel（推荐）

```bash
npm install -g vercel
vercel
```

### Netlify

```bash
npm run build
# 上传 dist/ 目录
```

### 传统服务器

```bash
npm run build
# 将 dist/ 目录内容上传至服务器
```

---

## 📝 许可证

本项目为 **优你教育** 内部教学资源，仅供授权学员使用。

---

## 👨‍💻 贡献者

- **优你教育** - 课程内容与教学设计

---

<div align="center">

**Made with ❤️ for C++ learners**

© 2026 优你教育 - C++ 寒假集训营

</div>
