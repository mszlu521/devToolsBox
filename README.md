<div align="center">

# 🔧 DevTools Box

一个基于 **Electron + Vue3 + TypeScript + Vite** 开发的跨平台开发者工具箱。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.x-4FC08D?logo=vue.js)](https://vuejs.org/)
[![Electron](https://img.shields.io/badge/Electron-40.x-47848F?logo=electron)](https://www.electronjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)

[English](README.en.md) | 简体中文

</div>

---

## ✨ 功能特性

### 📝 Markdown 笔记
- **所见即所得编辑器**：支持实时预览的 Markdown 编辑体验
- **文件树管理**：目录浏览、文件新建/重命名/删除
- **多主题预览**：支持 GitHub、微信、Medium、Notion、掘金等 15+ 种主题
- **微信排版**：一键生成微信公众号排版格式，支持复制到公众号
- **代码高亮**：集成 highlight.js，支持多种编程语言
- **自动保存**：实时自动保存编辑内容

### 🌍 环境变量管理
- **分组管理**：自定义分组，分类管理环境变量
- **快速搜索**：按名称和值搜索环境变量
- **系统同步**：自动同步 Windows 系统环境变量
- **完整 CRUD**：增删改查一站式管理
- **导入导出**：支持数据备份和恢复

### 🌐 Host 管理
- **多配置文件**：支持多个 Host 配置方案
- **一键切换**：快速切换不同的 Host 配置
- **系统集成**：直接修改系统 Hosts 文件

### 📋 待办清单
- **任务管理**：创建、编辑、完成任务
- **优先级**：支持设置任务优先级
- **数据持久化**：本地存储，重启不丢失

### 🛠️ 更多工具
- **JSON 格式化**：JSON 数据的美化、压缩、校验
- **网络诊断**：Ping、端口检测等网络工具

---

## 📦 技术栈

| 技术 | 说明 |
|------|------|
| [Electron](https://www.electronjs.org/) | 跨平台桌面应用框架 |
| [Vue 3](https://vuejs.org/) | 渐进式 JavaScript 框架 |
| [TypeScript](https://www.typescriptlang.org/) | 类型安全的 JavaScript 超集 |
| [Vite](https://vitejs.dev/) | 下一代前端构建工具 |
| [Element Plus](https://element-plus.org/) | Vue 3 组件库 |
| [Pinia](https://pinia.vuejs.org/) | Vue 状态管理 |
| [Vue Router](https://router.vuejs.org/) | Vue 路由管理 |
| [Markdown It](https://markdown-it.github.io/) | Markdown 解析器 |

---

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 8+ (推荐)

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

### 构建应用

```bash
# 构建所有平台
pnpm build

# 仅构建 Windows 版本
pnpm build:win
```

---

## 📁 项目结构

```
devToolsBox/
├── electron/                 # Electron 主进程代码
│   ├── main.ts              # 主进程入口
│   └── preload.ts           # 预加载脚本
├── src/
│   ├── components/          # Vue 组件
│   │   ├── markdown/        # Markdown 相关组件
│   │   └── tools/           # 工具组件
│   ├── composables/         # 组合式函数
│   ├── router/              # 路由配置
│   ├── stores/              # Pinia 状态管理
│   ├── types/               # TypeScript 类型定义
│   └── views/               # 页面视图
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🖥️ 系统支持

| 平台 | 支持状态 |
|------|----------|
| Windows 10/11 | ✅ 完全支持 |
| macOS | ⏳ 计划支持 |
| Linux | ⏳ 计划支持 |

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！如果您想为项目做出贡献，请：

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

---

## 📄 开源协议

本项目基于 [MIT](LICENSE) 协议开源。

---

## 🙏 鸣谢

- [Vue.js](https://vuejs.org/)
- [Electron](https://www.electronjs.org/)
- [Element Plus](https://element-plus.org/)
- [Vite](https://vitejs.dev/)
- [highlight.js](https://highlightjs.org/)

---

<div align="center">

**Star 🌟 这个项目，如果它对你有帮助！**

</div>
