import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { tools, type Tool } from '../types/tool'

export const useToolStore = defineStore('tool', () => {
  // 状态
  const toolList = ref<Tool[]>(tools)
  const currentToolId = ref<string>('env-manager')
  const sidebarCollapsed = ref(false)

  // 计算属性
  const currentTool = computed(() => {
    return toolList.value.find(t => t.id === currentToolId.value)
  })

  const availableTools = computed(() => {
    return toolList.value.filter(t => t.isAvailable !== false)
  })

  // 切换工具
  const switchTool = (toolId: string) => {
    const tool = toolList.value.find(t => t.id === toolId)
    if (tool && tool.isAvailable !== false) {
      currentToolId.value = toolId
    }
  }

  // 切换侧边栏折叠状态
  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  return {
    toolList,
    currentToolId,
    currentTool,
    availableTools,
    sidebarCollapsed,
    switchTool,
    toggleSidebar
  }
})
