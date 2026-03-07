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
  // 从 localStorage 读取保存的主题，如果没有则默认使用 light
  const savedTheme = localStorage.getItem('theme') as Theme | null
  const theme = ref<Theme>(savedTheme || 'light')

  // 切换主题
  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  // 设置指定主题
  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme
  }

  // 监听主题变化，保存到 localStorage 并更新 document 属性
  watch(theme, (newTheme) => {
    localStorage.setItem('theme', newTheme)
    updateDocumentTheme(newTheme)
  }, { immediate: true })

  return {
    theme,
    toggleTheme,
    setTheme
  }
})
