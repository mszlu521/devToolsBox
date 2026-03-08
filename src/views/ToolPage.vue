<script setup lang="ts">
import { computed, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'
import { useToolStore } from '../stores/toolStore'
import { useThemeStore } from '../stores/themeStore'
import EnvManager from '../components/tools/EnvManager.vue'
import JsonFormatter from '../components/tools/JsonFormatter.vue'
import HostManager from '../components/tools/HostManager.vue'
import NetworkDiagnostic from '../components/tools/NetworkDiagnostic.vue'
import TodoList from '../components/tools/TodoList.vue'
import MarkdownNotes from '../components/tools/MarkdownNotes.vue'
import { ArrowLeft, HomeFilled, Sunny, Moon } from '@element-plus/icons-vue'

const router = useRouter()
const toolStore = useToolStore()
const themeStore = useThemeStore()

// 捕获错误
onErrorCaptured((err, instance, info) => {
  console.error('ToolPage error:', err)
  console.error('Component:', instance)
  console.error('Info:', info)
  return false
})

const handleBack = () => {
  router.push('/')
}

const currentComponent = computed(() => {
  console.log('currentToolId:', toolStore.currentToolId)
  switch (toolStore.currentToolId) {
    case 'env-manager':
      return EnvManager
    case 'json-formatter':
      return JsonFormatter
    case 'host-manager':
      return HostManager
    case 'network-diagnostic':
      return NetworkDiagnostic
    case 'todo-list':
      return TodoList
    case 'markdown-notes':
      return MarkdownNotes
    default:
      console.warn('Unknown tool:', toolStore.currentToolId)
      return null
  }
})
</script>

<template>
  <div class="tool-page">
    <!-- 工具头部导航 -->
    <div class="tool-nav">
      <div class="nav-left">
        <el-button link :icon="ArrowLeft" @click="handleBack" class="back-btn">
          返回
        </el-button>
        <el-divider direction="vertical" />
        <div class="tool-info">
          <el-icon :size="20" color="#00d4aa">
            <component :is="toolStore.currentTool?.icon || 'Tools'" />
          </el-icon>
          <span class="tool-title">{{ toolStore.currentTool?.name }}</span>
        </div>
      </div>
      <div class="nav-right">
        <!-- 主题切换按钮 -->
        <el-button
          link
          class="theme-btn"
          @click="themeStore.toggleTheme"
          :title="themeStore.theme === 'light' ? '切换到暗黑模式' : '切换到明亮模式'"
        >
          <el-icon :size="18">
            <Sunny v-if="themeStore.theme === 'dark'" />
            <Moon v-else />
          </el-icon>
        </el-button>
        <el-button link :icon="HomeFilled" @click="handleBack" class="home-btn">
          主页
        </el-button>
      </div>
    </div>
    
    <!-- 工具内容区域 -->
    <div class="tool-body">
      <component :is="currentComponent" v-if="currentComponent" />
      <div v-else class="coming-soon">
        <el-empty description="工具开发中...">
          <template #image>
            <el-icon :size="80" color="#ccc"><Tools /></el-icon>
          </template>
          <el-button type="primary" @click="handleBack">返回主页</el-button>
        </el-empty>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  transition: background-color 0.3s ease;
}

.tool-nav {
  height: 56px;
  background: var(--bg-sidebar);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
  transition: background-color 0.3s ease;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.back-btn:hover {
  color: var(--primary-color);
}

.tool-info {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fff;
}

.tool-title {
  font-size: 16px;
  font-weight: 500;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.theme-btn {
  color: rgba(255, 255, 255, 0.8) !important;
}

.theme-btn:hover {
  color: var(--primary-color) !important;
}

.home-btn {
  color: rgba(255, 255, 255, 0.7);
}

.home-btn:hover {
  color: var(--primary-color);
}

.tool-body {
  flex: 1;
  overflow: auto;
  padding: 20px;
}

.coming-soon {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-bg);
  border-radius: 12px;
  transition: background-color 0.3s ease;
}
</style>
