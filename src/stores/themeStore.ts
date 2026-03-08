import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark'

// 更新 document 的 data-theme 属性，用于 CSS 选择器
const updateDocumentTheme = (newTheme: Theme) => {
  document.documentElement.setAttribute('data-theme', newTheme)
  // 同时更新 Element Plus 的暗黑模式
  if (newTheme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export const useThemeStore = defineStore('theme', () => {
  // 主题状态
  const theme = ref<Theme>('light')
  const isLoaded = ref(false)

  // 从文件系统加载主题设置
  const loadTheme = async () => {
    try {
      const result = await window.electronAPI.getAppSettings()
      if (result.success && result.data && result.data.theme) {
        theme.value = result.data.theme
      }
    } catch (e) {
      console.error('[themeStore] Failed to load theme:', e)
    } finally {
      isLoaded.value = true
    }
  }

  // 保存主题到文件系统
  const saveTheme = async () => {
    try {
      // 先读取现有配置，避免覆盖其他设置
      const result = await window.electronAPI.getAppSettings()
      const currentSettings = result.success && result.data ? result.data : {}
      
      // 更新主题设置
      const newSettings = {
        ...currentSettings,
        theme: theme.value
      }
      
      await window.electronAPI.saveAppSettings(newSettings)
    } catch (e) {
      console.error('[themeStore] Failed to save theme:', e)
    }
  }

  // 切换主题
  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  // 设置指定主题
  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme
  }

  // 监听主题变化，保存到文件系统并更新 document 属性
  watch(theme, (newTheme) => {
    updateDocumentTheme(newTheme)
    if (isLoaded.value) {
      saveTheme()
    }
  }, { immediate: true })

  return {
    theme,
    isLoaded,
    loadTheme,
    toggleTheme,
    setTheme
  }
})
