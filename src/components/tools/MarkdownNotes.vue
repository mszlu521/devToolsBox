<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useMdStore } from '../../stores/mdStore'
import { useThemeStore } from '../../stores/themeStore'
import { useFileManager } from '../../composables/useFileManager'
import { generateWechatHtmlForPreview, generateWechatHtml, copyHtmlToClipboard } from '../../composables/useMarkdownRenderer'
import FileTree from '../markdown/FileTree.vue'
import TyporaEditorTipTap from '../markdown/TyporaEditorTipTap/index.vue'
import type { FileItem } from '../markdown/FileTree.vue'
import type { PreviewTheme } from '../markdown/MdEditor/types'
import {
  FolderOpened, CopyDocument, Folder, Plus, Refresh, FolderAdd, DocumentAdd
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const mdStore = useMdStore()
const themeStore = useThemeStore()
const { fileTree, isLoading, loadWorkspace, toggleFolder, readFile, saveFile: saveFileContent } = useFileManager()

// ==================== 状态 ====================

// 工作区路径 - 使用 store 的方法进行设置
const workspacePath = computed(() => mdStore.workspacePath)
const selectedFile = ref('')
const fileContent = ref('')
const fileInfo = ref<{ size: number; modifiedTime: number; lineCount: number } | null>(null)
const fileLoading = ref(false)  // 文件打开加载状态

// 编辑器设置 - 使用 store 中的值
const autoSave = computed({
  get: () => mdStore.autoSave,
  set: (val) => mdStore.setAutoSave(val)
})
const previewTheme = computed<PreviewTheme>({
  get: () => mdStore.previewTheme as PreviewTheme,
  set: (val) => mdStore.setPreviewTheme(val)
})

// 监听应用主题变化，自动同步编辑器主题到对应的基础主题
// 但只同步一次（初始加载时），之后用户可以手动选择
const syncThemeFromApp = () => {
  const appTheme = themeStore.theme
  // 根据应用主题选择对应的编辑器基础主题
  // 直接修改 store 的 ref，不触发保存
  if (appTheme === 'dark') {
    // 如果当前是明亮主题，切换到暗黑主题
    const lightThemes = ['default', 'github', 'notion', 'medium', 'wechat', 'paper']
    if (lightThemes.includes(mdStore.previewTheme)) {
      mdStore.previewTheme = 'dark'
    }
  } else {
    // 如果当前是暗黑主题，切换到明亮主题
    const darkThemes = ['dark', 'midnight', 'dracula']
    if (darkThemes.includes(mdStore.previewTheme)) {
      mdStore.previewTheme = 'default'
    }
  }
}

// 监听应用主题变化，实时同步（但只在数据加载完成后）
watch(() => themeStore.theme, () => {
  syncThemeFromApp()
})

// 编辑器引用
const editorRef = ref<InstanceType<typeof TyporaEditorTipTap>>()

// 公众号复制对话框
const showWechatDialog = ref(false)
const wechatContent = ref('')

// 新建文件/目录对话框
const showCreateDialog = ref(false)
const createType = ref<'file' | 'folder'>('file')
const createName = ref('')
const createTargetPath = ref('')

// 右键菜单
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuItem = ref<FileItem | null>(null)

// ==================== 自动保存 ====================
const isDirty = ref(false)  // 文件是否有未保存的修改
const autoSaveTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const AUTO_SAVE_DELAY = 2000  // 2秒自动保存
const lastSavedContent = ref('')  // 上次保存的内容

/**
 * 触发自动保存
 */
const triggerAutoSave = () => {
  if (!autoSave.value) return
  if (!selectedFile.value) return
  
  isDirty.value = true
  
  // 清除之前的定时器
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
  }
  
  // 设置新的定时器
  autoSaveTimer.value = setTimeout(() => {
    if (isDirty.value && fileContent.value !== lastSavedContent.value) {
      saveFile(false)
      lastSavedContent.value = fileContent.value
      isDirty.value = false
    }
  }, AUTO_SAVE_DELAY)
}

/**
 * 立即保存（用于切换文件或离开页面）
 */
const saveImmediately = async () => {
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
    autoSaveTimer.value = null
  }
  
  if (isDirty.value && selectedFile.value && fileContent.value !== lastSavedContent.value) {
    await saveFile(false)
    lastSavedContent.value = fileContent.value
    isDirty.value = false
  }
}

// 监听文件内容变化
watch(fileContent, () => {
  triggerAutoSave()
})

// ==================== 初始化 ====================

onMounted(async () => {
  // 从文件系统加载 store 数据
  await mdStore.loadData()

  // 如果 store 中有保存的工作区路径，自动加载
  if (mdStore.workspacePath) {
    await loadWorkspace(mdStore.workspacePath)
  }

  // 同步应用主题
  syncThemeFromApp()

  // 注册 Ctrl+S 快捷键
  document.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  // 组件卸载前保存
  saveImmediately()
  
  // 移除快捷键监听
  document.removeEventListener('keydown', handleKeyDown)
})

/**
 * 处理键盘快捷键
 */
const handleKeyDown = (e: KeyboardEvent) => {
  // Ctrl+S / Cmd+S 保存
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (selectedFile.value) {
      saveFile(true)  // 手动保存，显示提示
      lastSavedContent.value = fileContent.value
      isDirty.value = false
      if (autoSaveTimer.value) {
        clearTimeout(autoSaveTimer.value)
        autoSaveTimer.value = null
      }
    }
  }
}

// ==================== 方法 ====================

/**
 * 保存设置 - 现在通过 store 自动保存到文件系统
 */
const saveSettings = () => {
  // 不需要手动保存，computed setter 会自动调用 store.saveData()
}

// 主题选项 - 恢复所有原有主题
const themeOptions = [
  // 推荐主题
  { label: '极光蓝', value: 'default' },
  { label: '霓虹幻彩', value: 'neon' },
  { label: '落日余晖', value: 'sunset' },
  { label: '深海静谧', value: 'ocean' },
  { label: '浆果风暴', value: 'berry' },
  { label: '森林秘境', value: 'forest' },
  // 平台风格
  { label: 'GitHub Pro', value: 'github' },
  { label: 'Notion', value: 'notion' },
  { label: 'Medium', value: 'medium' },
  { label: '掘金', value: 'juejin' },
  { label: '微信公众号', value: 'wechat' },
  // 深色主题
  { label: '极夜黑', value: 'dark' },
  { label: '午夜蓝', value: 'midnight' },
  { label: 'Dracula', value: 'dracula' },
  // 特色主题
  { label: '纸张质感', value: 'paper' }
]

/**
 * 选择工作区
 */
const selectWorkspace = async () => {
  try {
    const result = await window.electronAPI.showOpenDialog({ properties: ['openDirectory'] })
    if (!result.canceled && result.filePaths.length > 0) {
      await mdStore.setWorkspace(result.filePaths[0])
      await loadWorkspace(workspacePath.value)
      ElMessage.success('工作区已打开')
    }
  } catch (error) {
    ElMessage.error('打开工作区失败')
  }
}

/**
 * 处理文件树项点击
 */
const handleFileItemClick = async (item: FileItem) => {
  if (item.isDirectory) {
    await toggleFolder(item)
  } else {
    await openFile(item.path)
  }
}

/**
 * 打开文件
 */
const openFile = async (filePath: string) => {
  if (fileLoading.value) return
  
  // 先保存当前文件（如果已修改）
  await saveImmediately()
  
  fileLoading.value = true

  try {
    const data = await readFile(filePath)
    if (!data) {
      fileLoading.value = false
      return
    }

    fileContent.value = data.content
    lastSavedContent.value = data.content  // 记录初始内容
    isDirty.value = false
    fileInfo.value = {
      size: data.size,
      modifiedTime: data.modifiedTime,
      lineCount: data.lineCount
    }
    selectedFile.value = filePath

    // 添加到最近打开
    const fileName = filePath.split('\\').pop() || ''
    await mdStore.addToRecent({
      path: filePath,
      name: fileName,
      isDirectory: false,
      lastOpened: Date.now()
    })
  } catch (error) {
    console.error('打开文件失败:', error)
  } finally {
    fileLoading.value = false
  }
}

/**
 * 刷新工作区
 */
const refreshWorkspace = async () => {
  if (!workspacePath.value) return
  await loadWorkspace(workspacePath.value)
  ElMessage.success('目录已刷新')
}

/**
 * 显示创建菜单
 */
const showCreateMenu = () => {
  if (!workspacePath.value) return
  createTargetPath.value = workspacePath.value
  showCreateDialog.value = true
}

/**
 * 打开创建对话框
 */
const openCreateDialog = (type: 'file' | 'folder', targetPath?: string) => {
  createType.value = type
  createName.value = ''
  createTargetPath.value = targetPath || workspacePath.value
  showCreateDialog.value = true
}

/**
 * 确认创建
 */
const confirmCreate = async () => {
  if (!createName.value.trim() || !createTargetPath.value) return

  const fullPath = `${createTargetPath.value}\\${createName.value.trim()}`

  try {
    if (createType.value === 'file') {
      await window.electronAPI.mdCreateFile(fullPath)
      ElMessage.success('文件创建成功')
      await openFile(fullPath)
    } else {
      await window.electronAPI.mdCreateDirectory(fullPath)
      ElMessage.success('目录创建成功')
    }
    await refreshWorkspace()
    showCreateDialog.value = false
  } catch (error) {
    ElMessage.error(createType.value === 'file' ? '创建文件失败' : '创建目录失败')
  }
}

/**
 * 处理文件树右键点击
 */
const handleFileTreeContextMenu = (e: MouseEvent, item: FileItem) => {
  e.preventDefault()
  contextMenuItem.value = item
  contextMenuX.value = e.clientX
  contextMenuY.value = e.clientY
  contextMenuVisible.value = true
}

/**
 * 隐藏右键菜单
 */
const hideContextMenu = () => {
  contextMenuVisible.value = false
  contextMenuItem.value = null
}

/**
 * 保存文件
 * @param isManual 是否手动保存（true=显示提示，false=自动保存不显示）
 */
const saveFile = async (isManual = true) => {
  if (!selectedFile.value) return
  const success = await saveFileContent(selectedFile.value, fileContent.value)
  if (success && isManual) {
    ElMessage.success({ message: '已保存', duration: 1000 })
  }
}

/**
 * 生成公众号内容（预览使用 CSS 类样式）
 */
const generateWechatContent = () => {
  const html = generateWechatHtmlForPreview(fileContent.value, selectedFile.value, previewTheme.value)
  wechatContent.value = html
  showWechatDialog.value = true
}

/**
 * 复制公众号内容（复制时使用内联样式）
 */
const copyWechatContent = async () => {
  // 生成带内联样式的 HTML 用于复制
  const inlineHtml = generateWechatHtml(fileContent.value, selectedFile.value, previewTheme.value)
  const success = await copyHtmlToClipboard(inlineHtml)
  if (success) {
    ElMessage.success('已复制到剪贴板，可直接粘贴到公众号编辑器')
  } else {
    ElMessage.error('复制失败')
  }
}
</script>

<template>
  <div class="markdown-notes">
    <!-- 文件侧边栏 -->
    <div class="file-sidebar">
      <div class="sidebar-header">
        <div class="workspace-info">
          <el-icon :size="18"><Folder /></el-icon>
          <span class="workspace-title" :title="workspacePath">
            {{ workspacePath ? workspacePath.split('\\').pop() : '未选择工作区' }}
          </span>
        </div>
        <div class="sidebar-actions">
          <el-button
            v-if="workspacePath"
            type="success"
            :icon="Plus"
            size="small"
            circle
            @click="showCreateMenu"
            title="新建文件/目录"
          />
          <el-button
            v-if="workspacePath"
            type="warning"
            :icon="Refresh"
            size="small"
            circle
            @click="refreshWorkspace"
            title="刷新目录"
          />
          <el-button
            type="primary"
            :icon="FolderOpened"
            size="small"
            circle
            @click="selectWorkspace"
            title="选择工作区"
          />
        </div>
      </div>

      <!-- 文件列表 -->
      <div
        class="file-list"
        v-loading="isLoading"
        @contextmenu.prevent="handleFileTreeContextMenu($event, { name: '', path: workspacePath, isDirectory: true, size: 0, modifiedTime: 0 })"
      >
        <FileTree
          :items="fileTree"
          @item-click="handleFileItemClick"
          @context-menu="handleFileTreeContextMenu"
        />
        <el-empty v-if="!isLoading && fileTree.length === 0" description="暂无文件" :image-size="60" />
      </div>
    </div>

    <!-- 编辑器区域 -->
    <div class="editor-area">
      <!-- 自定义工具栏扩展 -->
      <div class="editor-toolbar-extension">
        <div class="toolbar-right">
          <el-select
            v-model="previewTheme"
            size="small"
            style="width: 100px"
            @change="saveSettings"
            title="预览主题"
          >
            <el-option
              v-for="option in themeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <el-button
            type="warning"
            size="small"
            @click="generateWechatContent"
            :disabled="!fileContent"
            title="生成公众号格式"
            class="wechat-btn"
          >
            <img src="@/assets/wx.png" alt="公众号" class="wechat-icon" />
          </el-button>
        </div>
      </div>

      <!-- Markdown 编辑器 -->
      <div class="editor-container" v-loading="fileLoading" element-loading-text="正在加载文件...">
        <TyporaEditorTipTap
          ref="editorRef"
          v-model="fileContent"
          :theme="previewTheme"
          :file-path="selectedFile"
          :placeholder="selectedFile ? '开始编写 Markdown...' : '请选择或创建一个文件'"
          @change="saveSettings"
        />
      </div>
    </div>

    <!-- 公众号复制对话框 -->
    <el-dialog
      v-model="showWechatDialog"
      title="微信公众号格式"
      width="800px"
      destroy-on-close
    >
      <div class="wechat-preview">
        <div class="wechat-tips">
          <el-alert
            type="info"
            :closable="false"
            title="点击下方按钮复制，然后粘贴到公众号编辑器中"
          />
        </div>
        <div class="wechat-content" v-html="wechatContent"></div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showWechatDialog = false">关闭</el-button>
          <el-button type="primary" @click="copyWechatContent">
            <el-icon><CopyDocument /></el-icon>
            复制内容
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 新建文件/目录对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="createType === 'file' ? '新建文件' : '新建目录'"
      width="400px"
      destroy-on-close
    >
      <div class="create-dialog-content">
        <el-input
          v-model="createName"
          :placeholder="createType === 'file' ? '请输入文件名 (如: README.md)' : '请输入目录名'"
          @keyup.enter="confirmCreate"
          clearable
        >
          <template #prefix>
            <el-icon><DocumentAdd v-if="createType === 'file'" /><FolderAdd v-else /></el-icon>
          </template>
        </el-input>
        <div class="create-hint">
          将在 <span class="path">{{ createTargetPath }}</span> 下创建
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showCreateDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmCreate" :disabled="!createName.trim()">
            创建
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 右键菜单 -->
    <teleport to="body">
      <div
        v-if="contextMenuVisible"
        class="context-menu"
        :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }"
        v-click-outside="hideContextMenu"
      >
        <div class="context-menu-item" @click="openCreateDialog('file', contextMenuItem?.path)">
          <el-icon><DocumentAdd /></el-icon>
          <span>新建文件</span>
        </div>
        <div class="context-menu-item" @click="openCreateDialog('folder', contextMenuItem?.path)">
          <el-icon><FolderAdd /></el-icon>
          <span>新建目录</span>
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" @click="refreshWorkspace">
          <el-icon><Refresh /></el-icon>
          <span>刷新目录</span>
        </div>
      </div>
    </teleport>
  </div>
</template>

<style scoped>
.markdown-notes {
  display: flex;
  height: 100%;
  background: var(--bg-secondary);
}

/* 文件侧边栏 */
.file-sidebar {
  width: 260px;
  background: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.workspace-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.workspace-info .el-icon {
  color: var(--primary-color);
  flex-shrink: 0;
}

.workspace-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-actions {
  display: flex;
  gap: 4px;
}

.file-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}

/* 编辑器区域 */
.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
}

/* 编辑器工具栏扩展 */
.editor-toolbar-extension {
  position: absolute;
  top: 0px;
  right: 0px;
  z-index: 10;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.wechat-btn {
  padding: 6px !important;
}

.wechat-icon {
  width: 16px;
  height: 16px;
}

/* 编辑器容器 - 支持 Loading */
.editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

/* 确保编辑器填充容器 */
.editor-container :deep(.typora-tiptap-editor) {
  height: 100%;
}

/* Loading 遮罩样式优化 */
.editor-container :deep(.el-loading-mask) {
  background: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(4px);
  z-index: 100;
}

.editor-container :deep(.el-loading-spinner) {
  top: 40%;
}

.editor-container :deep(.el-loading-text) {
  color: var(--primary-color, #4f46e5);
  font-size: 14px;
  margin-top: 12px;
  font-weight: 500;
}

.editor-container :deep(.circular) {
  width: 42px;
  height: 42px;
}

/* 公众号预览 */
.wechat-preview {
  max-height: 500px;
  overflow-y: auto;
}

.wechat-tips {
  margin-bottom: 16px;
}

.wechat-content {
  padding: 20px;
  background: var(--theme-bg, #f9f9f9);
  border-radius: 4px;
  color: var(--theme-text, #333);
  font-family: var(--theme-font, -apple-system, BlinkMacSystemFont, sans-serif);
}

/* 新建对话框 */
.create-dialog-content {
  padding: 20px 0;
}

.create-hint {
  margin-top: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.create-hint .path {
  color: var(--primary-color);
  font-weight: 500;
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  min-width: 160px;
  padding: 4px;
}

.context-menu-item {
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-primary);
  transition: background-color 0.2s;
}

.context-menu-item:hover {
  background: var(--bg-hover);
}

.context-menu-divider {
  height: 1px;
  background: var(--border-color);
  margin: 4px 0;
}
</style>
