import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface FileInfo {
  path: string
  name: string
  isDirectory: boolean
  lastOpened: number
}

export interface FavoriteFile {
  path: string
  name: string
  addedAt: number
}

export const useMdStore = defineStore('md', () => {
  // 最近打开的文件历史（最多20个）
  const recentFiles = ref<FileInfo[]>([])
  
  // 收藏的文件
  const favorites = ref<FavoriteFile[]>([])
  
  // 当前工作区路径
  const workspacePath = ref<string>('')
  
  // 当前选中的文件
  const selectedFile = ref<string>('')
  
  // 多标签页打开的文件
  const openTabs = ref<string[]>([])
  
  // 固定的标签页
  const pinnedTabs = ref<string[]>([])
  
  // 加载数据
  const loadData = () => {
    try {
      const saved = localStorage.getItem('md-store')
      if (saved) {
        const data = JSON.parse(saved)
        recentFiles.value = data.recentFiles || []
        favorites.value = data.favorites || []
        workspacePath.value = data.workspacePath || ''
        pinnedTabs.value = data.pinnedTabs || []
      }
    } catch (e) {
      console.error('加载 Markdown 存储数据失败:', e)
    }
  }
  
  // 保存数据
  const saveData = () => {
    try {
      localStorage.setItem('md-store', JSON.stringify({
        recentFiles: recentFiles.value,
        favorites: favorites.value,
        workspacePath: workspacePath.value,
        pinnedTabs: pinnedTabs.value
      }))
    } catch (e) {
      console.error('保存 Markdown 存储数据失败:', e)
    }
  }
  
  // 添加到最近文件
  const addToRecent = (file: FileInfo) => {
    // 移除已存在的相同文件
    recentFiles.value = recentFiles.value.filter(f => f.path !== file.path)
    // 添加到开头
    recentFiles.value.unshift({
      ...file,
      lastOpened: Date.now()
    })
    // 只保留最近20个
    if (recentFiles.value.length > 20) {
      recentFiles.value = recentFiles.value.slice(0, 20)
    }
    saveData()
  }
  
  // 从最近文件中移除
  const removeFromRecent = (path: string) => {
    recentFiles.value = recentFiles.value.filter(f => f.path !== path)
    saveData()
  }
  
  // 清空最近文件
  const clearRecent = () => {
    recentFiles.value = []
    saveData()
  }
  
  // 添加收藏
  const addFavorite = (file: { path: string; name: string }) => {
    if (!favorites.value.some(f => f.path === file.path)) {
      favorites.value.push({
        ...file,
        addedAt: Date.now()
      })
      saveData()
    }
  }
  
  // 移除收藏
  const removeFavorite = (path: string) => {
    favorites.value = favorites.value.filter(f => f.path !== path)
    saveData()
  }
  
  // 切换收藏状态
  const toggleFavorite = (file: { path: string; name: string }) => {
    if (favorites.value.some(f => f.path === file.path)) {
      removeFavorite(file.path)
    } else {
      addFavorite(file)
    }
  }
  
  // 检查是否已收藏
  const isFavorite = (path: string) => {
    return favorites.value.some(f => f.path === path)
  }
  
  // 设置工作区
  const setWorkspace = (path: string) => {
    workspacePath.value = path
    saveData()
  }
  
  // 打开标签页
  const openTab = (path: string) => {
    if (!openTabs.value.includes(path)) {
      openTabs.value.push(path)
    }
    selectedFile.value = path
  }
  
  // 关闭标签页
  const closeTab = (path: string) => {
    const index = openTabs.value.indexOf(path)
    openTabs.value = openTabs.value.filter(p => p !== path)
    
    // 如果关闭的是当前选中的文件，切换到相邻的标签
    if (selectedFile.value === path && openTabs.value.length > 0) {
      const newIndex = Math.min(index, openTabs.value.length - 1)
      selectedFile.value = openTabs.value[newIndex]
    } else if (openTabs.value.length === 0) {
      selectedFile.value = ''
    }
  }
  
  // 固定/取消固定标签页
  const togglePinTab = (path: string) => {
    if (pinnedTabs.value.includes(path)) {
      pinnedTabs.value = pinnedTabs.value.filter(p => p !== path)
    } else {
      pinnedTabs.value.push(path)
    }
    saveData()
  }
  
  // 检查是否已固定
  const isPinned = (path: string) => {
    return pinnedTabs.value.includes(path)
  }
  
  // 按固定状态排序的标签页
  const sortedTabs = computed(() => {
    return [...openTabs.value].sort((a, b) => {
      const aPinned = pinnedTabs.value.includes(a)
      const bPinned = pinnedTabs.value.includes(b)
      if (aPinned && !bPinned) return -1
      if (!aPinned && bPinned) return 1
      return 0
    })
  })
  
  // 清除不在工作区的最近文件
  const cleanupRecent = (workspace: string) => {
    recentFiles.value = recentFiles.value.filter(f => f.path.startsWith(workspace))
    saveData()
  }
  
  return {
    recentFiles,
    favorites,
    workspacePath,
    selectedFile,
    openTabs,
    pinnedTabs,
    sortedTabs,
    loadData,
    addToRecent,
    removeFromRecent,
    clearRecent,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    setWorkspace,
    openTab,
    closeTab,
    togglePinTab,
    isPinned,
    cleanupRecent
  }
})
