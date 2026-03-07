<script setup lang="ts">
import { computed } from 'vue'
import { useToolStore } from '../stores/toolStore'
import EnvManager from './tools/EnvManager.vue'
import HostManager from './tools/HostManager.vue'
import JsonFormatter from './tools/JsonFormatter.vue'
import NetworkDiagnostic from './tools/NetworkDiagnostic.vue'
import TodoList from './tools/TodoList.vue'
import MarkdownNotes from './tools/MarkdownNotes.vue'

const toolStore = useToolStore()

const currentComponent = computed(() => {
  switch (toolStore.currentToolId) {
    case 'env-manager':
      return EnvManager
    case 'host-manager':
      return HostManager
    case 'json-formatter':
      return JsonFormatter
    case 'network-diagnostic':
      return NetworkDiagnostic
    case 'todo-list':
      return TodoList
    case 'markdown-notes':
      return MarkdownNotes
    default:
      return null
  }
})
</script>

<template>
  <div class="tool-content">
    <div class="tool-header">
      <div class="tool-title">
        <h2>{{ toolStore.currentTool?.name }}</h2>
        <p class="tool-description">{{ toolStore.currentTool?.description }}</p>
      </div>
    </div>
    
    <div class="tool-body">
      <component :is="currentComponent" v-if="currentComponent" />
      <div v-else class="coming-soon">
        <el-empty description="工具开发中...">
          <template #image>
            <el-icon :size="80" color="var(--text-tertiary)"><Tools /></el-icon>
          </template>
        </el-empty>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  overflow: hidden;
  transition: background-color 0.3s ease;
}

.tool-header {
  height: 64px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  padding: 0 24px;
  display: flex;
  align-items: center;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.tool-title h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.tool-description {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-tertiary);
  transition: color 0.3s ease;
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
}
</style>
