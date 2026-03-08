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

export interface MdNotesSettings {
  workspacePath: string
  previewTheme: string
  autoSave: boolean
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

  // 编辑器设置
  const previewTheme = ref<string>('default')
  const autoSave = ref<boolean>(true)

  // 从文件系统加载数据
  const loadData = async () => {
    try {
      const result = await window.electronAPI.getMdNotesData()
      if (result.success && result.data) {
        workspacePath.value = result.data.workspacePath || ''
        previewTheme.value = result.data.previewTheme || 'default'
        autoSave.value = result.data.autoSave !== false
        recentFiles.value = result.data.recentFiles || []
        favorites.value = result.data.favorites || []
        pinnedTabs.value = result.data.pinnedTabs || []
      }
    } catch (e) {
      console.error('[mdStore] Failed to load data:', e)
    }
  }

  // 保存数据到文件系统
  const saveData = async () => {
    try {
      // 使用 JSON 序列化/反序列化转换为普通对象
      const data = JSON.parse(JSON.stringify({
        workspacePath: workspacePath.value,
        previewTheme: previewTheme.value,
        autoSave: autoSave.value,
        recentFiles: recentFiles.value,
        favorites: favorites.value,
        pinnedTabs: pinnedTabs.value
      }))
      await window.electronAPI.saveMdNotesData(data)
    } catch (e) {
      console.error('[mdStore] Failed to save data:', e)
    }
  }

  // 添加到最近文件
  const addToRecent = async (file: FileInfo) => {
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
    await saveData()
  }

  // 从最近文件中移除
  const removeFromRecent = async (path: string) => {
    recentFiles.value = recentFiles.value.filter(f => f.path !== path)
    await saveData()
  }

  // 清空最近文件
  const clearRecent = async () => {
    recentFiles.value = []
    await saveData()
  }

  // 添加收藏
  const addFavorite = async (file: { path: string; name: string }) => {
    if (!favorites.value.some(f => f.path === file.path)) {
      favorites.value.push({
        ...file,
        addedAt: Date.now()
      })
      await saveData()
    }
  }

  // 移除收藏
  const removeFavorite = async (path: string) => {
    favorites.value = favorites.value.filter(f => f.path !== path)
    await saveData()
  }

  // 切换收藏状态
  const toggleFavorite = async (file: { path: string; name: string }) => {
    if (favorites.value.some(f => f.path === file.path)) {
      await removeFavorite(file.path)
    } else {
      await addFavorite(file)
    }
  }

  // 检查是否已收藏
  const isFavorite = (path: string) => {
    return favorites.value.some(f => f.path === path)
  }

  // 设置工作区
  const setWorkspace = async (path: string) => {
    workspacePath.value = path
    await saveData()
  }

  // 设置主题
  const setPreviewTheme = async (theme: string) => {
    previewTheme.value = theme
    await saveData()
  }

  // 设置自动保存
  const setAutoSave = async (value: boolean) => {
    autoSave.value = value
    await saveData()
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

  // 切换标签固定状态
  const togglePinTab = async (path: string) => {
    if (pinnedTabs.value.includes(path)) {
      pinnedTabs.value = pinnedTabs.value.filter(p => p !== path)
    } else {
      pinnedTabs.value.push(path)
    }
    await saveData()
  }

  // 检查标签是否已固定
  const isPinned = (path: string) => {
    return pinnedTabs.value.includes(path)
  }

  // 排序后的标签页（固定的在前）
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
  const cleanupRecent = async (workspace: string) => {
    recentFiles.value = recentFiles.value.filter(f => f.path.startsWith(workspace))
    await saveData()
  }

  return {
    recentFiles,
    favorites,
    workspacePath,
    selectedFile,
    openTabs,
    pinnedTabs,
    previewTheme,
    autoSave,
    sortedTabs,
    loadData,
    saveData,
    addToRecent,
    removeFromRecent,
    clearRecent,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    setWorkspace,
    setPreviewTheme,
    setAutoSave,
    openTab,
    closeTab,
    togglePinTab,
    isPinned,
    cleanupRecent
  }
})
