<template>
  <router-view />
</template>

<script setup lang="ts">
import { useThemeStore } from './stores/themeStore'

// 初始化主题并加载保存的设置
const themeStore = useThemeStore()
themeStore.loadTheme()
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* CSS 变量定义 - 白天模式 (默认) */
:root {
  /* 主色调 */
  --primary-color: #00d4aa;
  --primary-color-dark: #00a884;
  
  /* 背景色 */
  --bg-primary: #ffffff;
  --bg-secondary: #f5f7fa;
  --bg-tertiary: #e4e7ed;
  --bg-sidebar: #1a1a2e;
  
  /* 文字颜色 */
  --text-primary: #303133;
  --text-secondary: #606266;
  --text-tertiary: #909399;
  --text-white: #ffffff;
  
  /* 边框颜色 */
  --border-color: #e4e7ed;
  --border-color-light: #ebeef5;
  
  /* 悬停和交互 */
  --hover-bg: rgba(0, 0, 0, 0.05);
  --active-bg: #00d4aa;
  
  /* 卡片和容器 */
  --card-bg: #ffffff;
  --card-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  
  /* 输入框 */
  --input-bg: #ffffff;
  --input-border: #dcdfe6;
  --input-text: #606266;
  
  /* 代码编辑器 */
  --code-bg: #1e1e1e;
  --code-text: #d4d4d4;
  --code-ip: #569cd6;
  --code-domain: #9cdcfe;
  --code-comment: #6a9955;
  
  /* 滚动条 */
  --scrollbar-thumb: #c0c4cc;
  --scrollbar-track: #f1f1f1;
}

/* 暗黑模式 */
:root[data-theme="dark"] {
  /* 背景色 */
  --bg-primary: #141414;
  --bg-secondary: #1d1d1d;
  --bg-tertiary: #2d2d2d;
  --bg-sidebar: #0d0d0d;
  
  /* 文字颜色 */
  --text-primary: #e0e0e0;
  --text-secondary: #b0b0b0;
  --text-tertiary: #808080;
  --text-white: #ffffff;
  
  /* 边框颜色 */
  --border-color: #434343;
  --border-color-light: #303030;
  
  /* 悬停和交互 */
  --hover-bg: rgba(255, 255, 255, 0.08);
  --active-bg: #00d4aa;
  
  /* 卡片和容器 */
  --card-bg: #1f1f1f;
  --card-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.3);
  
  /* 输入框 */
  --input-bg: #2a2a2a;
  --input-border: #434343;
  --input-text: #e0e0e0;
  
  /* 代码编辑器 */
  --code-bg: #0d0d0d;
  --code-text: #d4d4d4;
  --code-ip: #569cd6;
  --code-domain: #9cdcfe;
  --code-comment: #6a9955;
  
  /* 滚动条 */
  --scrollbar-thumb: #555555;
  --scrollbar-track: #2a2a2a;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  transition: background-color 0.3s ease, color 0.3s ease;
}

#app {
  height: 100vh;
}

/* Element Plus 暗黑模式适配 */
.dark .el-button {
  --el-button-bg-color: var(--card-bg);
  --el-button-text-color: var(--text-primary);
  --el-button-border-color: var(--border-color);
}

.dark .el-button--primary {
  --el-button-bg-color: var(--primary-color);
  --el-button-text-color: #ffffff;
  --el-button-border-color: var(--primary-color);
}

.dark .el-input {
  --el-input-bg-color: var(--input-bg);
  --el-input-text-color: var(--input-text);
  --el-input-border-color: var(--input-border);
}

.dark .el-dialog {
  --el-dialog-bg-color: var(--card-bg);
}

.dark .el-table {
  --el-table-bg-color: var(--card-bg);
  --el-table-tr-bg-color: var(--card-bg);
  --el-table-header-bg-color: var(--bg-secondary);
  --el-table-border-color: var(--border-color);
  --el-table-text-color: var(--text-primary);
}

.dark .el-select {
  --el-select-bg-color: var(--input-bg);
}

.dark .el-dropdown__popper {
  --el-dropdown-menuItem-hover-fill: var(--hover-bg);
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
}

::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}
</style>
