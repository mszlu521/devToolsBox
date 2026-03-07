<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useMdStore } from '../../stores/mdStore'
import { useFileManager } from '../../composables/useFileManager'
import { generateWechatHtml, copyHtmlToClipboard } from '../../composables/useMarkdownRenderer'
import FileTree from '../markdown/FileTree.vue'
import MdEditor from '../markdown/MdEditor/index.vue'
import type { OutlineItem, EditorMode, PreviewTheme } from '../markdown/MdEditor/types'
import type { FileItem } from '../markdown/FileTree.vue'
import {
  FolderOpened, CopyDocument, Folder, Plus, Refresh, FolderAdd, DocumentAdd
} from '@element-plus/icons-vue'
import { ElMessage, ElDialog } from 'element-plus'

const mdStore = useMdStore()
const { fileTree, isLoading, loadWorkspace, toggleFolder, readFile, saveFile: saveFileContent } = useFileManager()

// ==================== 状态 ====================

const workspacePath = ref('')
const selectedFile = ref('')
const fileContent = ref('')
const fileInfo = ref<{ size: number; modifiedTime: number; lineCount: number } | null>(null)
const fileLoading = ref(false)  // 文件打开加载状态

// 编辑器设置
const autoSave = ref(true)
const editorMode = ref<EditorMode>('wysiwyg')
const previewTheme = ref<PreviewTheme>('default')
const showOutline = ref(true)

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

// 编辑器引用
const mdEditorRef = ref<InstanceType<typeof MdEditor>>()

// ==================== 初始化 ====================

onMounted(() => {
  mdStore.loadData()
  workspacePath.value = mdStore.workspacePath
  if (workspacePath.value) {
    loadWorkspace(workspacePath.value)
  }

  // 加载设置
  const saved = localStorage.getItem('md-editor-settings')
  if (saved) {
    const s = JSON.parse(saved)
    autoSave.value = s.autoSave ?? true
    editorMode.value = s.editorMode ?? 'wysiwyg'
    previewTheme.value = s.previewTheme ?? 'default'
  }
})

// ==================== 方法 ====================

/**
 * 保存设置到本地存储
 */
const saveSettings = () => {
  localStorage.setItem('md-editor-settings', JSON.stringify({
    autoSave: autoSave.value,
    editorMode: editorMode.value,
    previewTheme: previewTheme.value
  }))
}

/**
 * 选择工作区
 */
const selectWorkspace = async () => {
  try {
    const result = await window.electronAPI.showOpenDialog({ properties: ['openDirectory'] })
    if (!result.canceled && result.filePaths.length > 0) {
      workspacePath.value = result.filePaths[0]
      mdStore.setWorkspace(workspacePath.value)
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
  fileLoading.value = true

  try {
    const data = await readFile(filePath)
    if (!data) {
      fileLoading.value = false
      return
    }

    fileContent.value = data.content
    fileInfo.value = {
      size: data.size,
      modifiedTime: data.modifiedTime,
      lineCount: data.lineCount
    }
    selectedFile.value = filePath

    // 添加到最近打开
    const fileName = filePath.split('\\').pop() || ''
    mdStore.addToRecent({
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
 */
const saveFile = async () => {
  if (!selectedFile.value) return
  const success = await saveFileContent(selectedFile.value, fileContent.value)
  if (success) {
    ElMessage.success({ message: '已保存', duration: 1000 })
  }
}

/**
 * 生成公众号内容
 */
const generateWechatContent = () => {
  const html = generateWechatHtml(fileContent.value, selectedFile.value, previewTheme.value)
  wechatContent.value = html
  showWechatDialog.value = true
}

/**
 * 复制公众号内容
 */
const copyWechatContent = async () => {
  const success = await copyHtmlToClipboard(wechatContent.value)
  if (success) {
    ElMessage.success('已复制到剪贴板，可直接粘贴到公众号编辑器')
  } else {
    ElMessage.error('复制失败')
  }
}

/**
 * 处理大纲项点击
 */
const handleOutlineClick = (item: OutlineItem) => {
  mdEditorRef.value?.scrollToLine(item.line)
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
        <el-button
          type="warning"
          size="small"
          :icon="CopyDocument"
          @click="generateWechatContent"
          :disabled="!fileContent"
          title="生成公众号格式"
        >
          复制公众号
        </el-button>
      </div>

      <!-- Markdown 编辑器 -->
      <div class="editor-container" v-loading="fileLoading" element-loading-text="正在加载文件...">
        <MdEditor
          ref="mdEditorRef"
          v-model="fileContent"
          v-model:mode="editorMode"
          v-model:theme="previewTheme"
          :file-path="selectedFile"
          :auto-save="autoSave"
          :show-outline="showOutline"
          :disabled="!selectedFile"
          @save="saveFile"
          @change="saveSettings"
          @scroll-to-heading="handleOutlineClick"
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
  top: 8px;
  right: 220px;
  z-index: 10;
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
.editor-container :deep(.md-editor) {
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
  background: #f9f9f9;
  border-radius: 4px;
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
