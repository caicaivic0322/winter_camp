# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

C++ 寒假集训营在线教学网站（优你教育），15天系统学习 C++ 编程与信息学竞赛的 React SPA。课程内容以 Markdown 编写，存放在 `第XX课_*/` 目录，同时提供 Python 脚本将 Markdown 转换为 PDF。

## Commands

- `npm run dev` — 启动 Vite 开发服务器 (localhost:5173)
- `npm run build` — 构建生产版本到 `dist/`
- `npm run preview` — 预览构建结果
- `python3 generate_pdfs.py` — 将所有课程 Markdown 生成 PDF 到 `pdf_output/`（需 `pip install reportlab`）

## Architecture

### Frontend (React 19 + Vite 5)

- **Entry**: `index.html` → `src/main.jsx` → `src/App.jsx`
- **Routing**: React Router 7, routes defined in `App.jsx`
- **Contexts**:
  - `AuthContext.jsx` — 用户认证 + 课程时间锁逻辑（`COURSE_CONFIG` 控制开放时间表）
  - `ThemeContext.jsx` — 暗色/亮色主题切换
- **Pages**: `Home.jsx`（课程列表）、`Lesson.jsx`（课程详情，渲染 Markdown）、`Login.jsx`（登录注册）、`Visualizer.jsx`（排序算法动画）
- **Data**: `courses.js`（课程元数据）、`lessonContents.js`（课程内容引用）、`supplementaryContents.js`（补充内容）
- **Styles**: CSS Variables 主题系统定义在 `src/styles/index.css`，暗色主色橙色 `#ff7b54`，亮色主色翠绿 `#10b981`

### Markdown Loader

`vite.config.js` 包含自定义 Vite 插件 `markdownPlugin()`，将 `.md` 文件作为字符串导入。课程 Markdown 通过 `react-markdown` + `remark-gfm` 渲染。

### PDF Generator (`generate_pdfs.py`)

Python 脚本使用 ReportLab 将 `第XX课_*/讲义_*.md` 和 `测试卷_*.md` 转换为带封面、代码高亮、中文字体支持的 PDF。输出到 `pdf_output/`。

### Course Content Structure

每节课为一个目录 `第XX课_主题名/`，包含：
- `讲义_主题名.md` — 教学讲义
- `测试卷_主题名.md` — 测试试卷
- 部分课程可能有 `.html` 交互式演示文件

### Deployment

- Render.com: `render.yaml` 配置静态站点部署
- Netlify: `.netlify/` 目录
- 也支持 Vercel

## Key Configuration

课程时间锁在 `src/contexts/AuthContext.jsx` 的 `COURSE_CONFIG` 对象中配置，控制课程按日期解锁和网站关闭时间。
