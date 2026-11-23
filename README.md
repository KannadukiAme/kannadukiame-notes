# 神無月雨's 魔導書 (`kannadukiame-notes`)

> 神無月雨的个人技术笔记站点，收录网络代理、虚拟化、Linux 系统与个人家庭服务器的折腾心得、架构笔记与排障实录。

## 项目简介

**神無月雨's 魔導書** 是一个基于 [Astro](https://astro.build/) 与 [Starlight](https://starlight.astro.build/) 构建的个人技术知识库与笔记站点。站点围绕家庭实验室（Homelab）与日常技术折腾展开，主要用于沉淀与归档以下领域的技术文档：

- **网络代理与路由**：OpenWrt / ImmortalWrt 软路由、透明代理、DNS 分流与精细化路由规则配置
- **虚拟化与容器**：Proxmox VE (PVE)、虚拟机与 Docker 容器化部署实践
- **Linux 与系统运维**：Linux 发行版配置、内核参数调优与日常排障记录
- **家庭服务器与自托管**：NAS 存储规划、家庭内网服务搭建与自托管应用维护

## 站点特性

- **自动化藏书统计（Archive Telemetry）**：首页通过 `NotesOverview` 组件自动扫描 `src/content/docs/` 下的所有正式笔记，实时统计收录篇数、活跃分类、中英文有效阅读字数以及最新修订日期。
- **Git 驱动的更新追踪**：自动读取 Git 提交历史（支持回退至 Frontmatter `lastUpdated` 或文件 `mtime`）生成最近更新笔记列表与修订时间戳。
- **语义化分类与色彩映射**：按顶级目录自动归类并匹配主题色调（绿 / 蓝 / 橙 / 紫），直观区分不同技术领域的笔记。
- **明暗双色视觉定制**：集成 `starlight-theme-rapide` 主题与 Tailwind CSS v4，配备亮色/暗色自适应的魔導書专属 Logo 与悬浮图腾 Hero 视觉设计。

## 技术栈

| 类别     | 技术 / 工具                                                                | 版本        |
| :------- | :------------------------------------------------------------------------- | :---------- |
| 框架     | [Astro](https://astro.build/)                                              | `^7.3.6`    |
| 文档引擎 | [@astrojs/starlight](https://starlight.astro.build/)                       | `^0.43.1`   |
| 主题插件 | [starlight-theme-rapide](https://github.com/HiDeoo/starlight-theme-rapide) | `^0.7.0`    |
| 样式方案 | [Tailwind CSS v4](https://tailwindcss.com/) (`@tailwindcss/vite`)          | `^4.3.5`    |
| 包管理器 | [pnpm](https://pnpm.io/)                                                   | Lockfile v9 |

## 目录结构

```text
kannadukiame-notes/
├── public/                        # 静态公共资源（favicon 等）
├── src/
│   ├── assets/                    # 站点 Logo 与首页 Hero 亮/暗色 SVG 矢量图
│   ├── components/
│   │   └── NotesOverview.astro    # 首页“魔導書藏书统计”与“最近更新笔记”组件
│   ├── content/
│   │   └── docs/                  # 笔记内容目录（支持 .md / .mdx）
│   │       ├── index.mdx          # 站点首页
│   │       └── network-proxy/     # 网络代理分类笔记（如 honk 透明代理部署指南）
│   ├── lib/
│   │   └── notes.ts               # 笔记集合解析、字数估算、Git 时间提取与分类汇总逻辑
│   ├── styles/
│   │   └── custom.css             # Tailwind CSS v4 主题变量与首页自定义样式
│   └── content.config.ts          # Astro Content Collections 配置
├── astro.config.mjs               # Astro 与 Starlight 站点核心配置
├── package.json                   # 项目依赖与脚本
└── tsconfig.json                  # TypeScript 配置
```

## 快速开始

### 环境要求

- **Node.js**：建议使用 Node.js 20+
- **pnpm**：项目使用 `pnpm` 管理依赖

### 本地开发

1. **安装依赖**

   ```bash
   pnpm install
   ```

2. **启动开发服务器**

   ```bash
   pnpm dev
   ```

   如需在后台运行开发服务器，可使用：

   ```bash
   pnpm astro dev --background
   ```

   并通过 `pnpm astro dev status`、`pnpm astro dev logs` 或 `pnpm astro dev stop` 管理后台进程。

3. **构建与预览生产版本**

   ```bash
   pnpm build
   pnpm preview
   ```

## 撰写与新增笔记

1. **新建笔记文件**：在 `src/content/docs/<分类目录>/` 下创建 `.md` 或 `.mdx` 文件，并在顶部包含基础 Frontmatter：

   ```markdown
   ---
   title: 笔记标题
   description: 简短概括本文记录的技术内容或排障背景。
   ---
   ```

2. **新增侧边栏分类**：若新增了顶级分类目录，可在 `astro.config.mjs` 的 `sidebar` 中注册自动生成规则：

   ```js
   sidebar: [
     {
       label: '网络代理',
       items: [{ autogenerate: { directory: 'network-proxy' } }],
     },
     // 在此添加新的分类目录...
   ]
   ```

3. **配置分类标签与色调（可选）**：可在 `src/lib/notes.ts` 的 `CATEGORY_MAP` 中为新目录配置中文名称与卡片色调（`green` / `blue` / `orange` / `purple`）；未显式配置的目录也会自动生成标签与配色，并自动纳入首页统计。
