import { ref } from 'vue'
import { ElMessage } from 'element-plus'

export interface FileItem {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modifiedTime: number
  children?: FileItem[]
  isExpanded?: boolean
}

export function useFileManager() {
  const fileTree = ref<FileItem[]>([])
  const isLoading = ref(false)

  // 构建文件树
  const buildFileTree = (items: any[]): FileItem[] => {
    const folders = items.filter((i: any) => i.isDirectory).sort((a: any, b: any) => a.name.localeCompare(b.name))
    const files = items.filter((i: any) => !i.isDirectory).sort((a: any, b: any) => a.name.localeCompare(b.name))

    return [
      ...folders.map((f: any) => ({
        name: f.name,
        path: f.path,
        isDirectory: true,
        size: 0,
        modifiedTime: f.modifiedTime,
        children: [] as FileItem[],
        isExpanded: false
      })),
      ...files.map((f: any) => ({
        name: f.name,
        path: f.path,
        isDirectory: false,
        size: f.size,
        modifiedTime: f.modifiedTime
      }))
    ]
  }

  // 加载目录内容
  const loadDirectory = async (dirPath: string): Promise<FileItem[]> => {
    try {
      const result = await window.electronAPI.mdReadDirectory(dirPath)
      if (!result.success) {
        throw new Error(result.error || '加载目录失败')
      }
      return buildFileTree(result.data || [])
    } catch (error: any) {
      ElMessage.error(`加载目录失败: ${error.message}`)
      return []
    }
  }

  // 加载工作区文件树
  const loadWorkspace = async (workspacePath: string) => {
    if (!workspacePath) return
    isLoading.value = true
    try {
      fileTree.value = await loadDirectory(workspacePath)
    } finally {
      isLoading.value = false
    }
  }

  // 在文件树中查找并更新文件夹
  const updateFolderInTree = (items: FileItem[], targetPath: string, updates: Partial<FileItem>): boolean => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.path === targetPath) {
        items[i] = { ...item, ...updates }
        return true
      }
      if (item.children && item.children.length > 0) {
        if (updateFolderInTree(item.children, targetPath, updates)) {
          return true
        }
      }
    }
    return false
  }

  // 加载文件夹内容
  const loadFolderContents = async (folderPath: string): Promise<FileItem[]> => {
    try {
      const children = await loadDirectory(folderPath)
      return children
    } catch (error) {
      ElMessage.error('加载文件夹内容失败')
      return []
    }
  }

  // 切换文件夹展开状态
  const toggleFolder = async (item: FileItem) => {
    if (!item.isDirectory) return

    const newExpanded = !item.isExpanded

    // 如果展开且没有子项，先加载子目录内容
    if (newExpanded && (!item.children || item.children.length === 0)) {
      const children = await loadFolderContents(item.path)
      // 更新文件树中的文件夹状态和内容
      updateFolderInTree(fileTree.value, item.path, {
        isExpanded: newExpanded,
        children: children
      })
    } else {
      // 只切换展开状态
      updateFolderInTree(fileTree.value, item.path, {
        isExpanded: newExpanded
      })
    }
  }

  // 读取文件
  const readFile = async (filePath: string): Promise<{ content: string; size: number; modifiedTime: number; lineCount: number } | null> => {
    try {
      const result = await window.electronAPI.mdReadFile(filePath)
      if (!result.success || !result.data) {
        throw new Error(result.error || '读取文件失败')
      }
      return result.data
    } catch (error: any) {
      ElMessage.error(`读取文件失败: ${error.message}`)
      return null
    }
  }

  // 保存文件
  const saveFile = async (filePath: string, content: string): Promise<boolean> => {
    try {
      await window.electronAPI.mdWriteFile(filePath, content)
      return true
    } catch (error: any) {
      ElMessage.error(`保存文件失败: ${error.message}`)
      return false
    }
  }

  // 刷新文件树
  const refresh = async (workspacePath: string) => {
    await loadWorkspace(workspacePath)
  }

  return {
    fileTree,
    isLoading,
    loadWorkspace,
    loadDirectory,
    toggleFolder,
    readFile,
    saveFile,
    refresh
  }
}