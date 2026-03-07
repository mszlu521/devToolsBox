<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useMdStore } from '../../stores/mdStore'
import { useFileManager } from '../../composables/useFileManager'
import { renderMarkdown, generateWechatHtml, copyHtmlToClipboard, generateThemeStyles, themeConfigs } from '../../composables/useMarkdownRenderer'
import FileTree from '../markdown/FileTree.vue'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import {
  FolderOpened, DocumentChecked, Reading, CopyDocument,
  Document as SourceCodeIcon, Folder, Plus, Refresh, FolderAdd, DocumentAdd
} from '@element-plus/icons-vue'
import { ElMessage, ElDialog } from 'element-plus'
import type { FileItem } from '../markdown/FileTree.vue'

const mdStore = useMdStore()
const { fileTree, isLoading, loadWorkspace, toggleFolder, readFile, saveFile: saveFileContent } = useFileManager()

// 状态
const workspacePath = ref('')
const selectedFile = ref('')
const fileContent = ref('')
const fileInfo = ref<{ size: number; modifiedTime: number; lineCount: number } | null>(null)

// 编辑器设置
const autoSave = ref(true)
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
const editorMode = ref<'wysiwyg' | 'source'>('wysiwyg')

// 主题设置
type PreviewTheme = 'default' | 'github' | 'wechat' | 'medium' | 'notion' | 'juejin' |
  'chengxin' | 'chazi' | 'nenqing' | 'lvyi' | 'hongfei' | 'lanying' | 'lanqing' | 'shanchui' | 'jikehei'
const previewTheme = ref<PreviewTheme>('default')

// WYSIWYG 编辑器引用
const wysiwygEditorRef = ref<HTMLElement>()
const isComposing = ref(false)
const isUpdating = ref(false)

// 侧边栏折叠
const sidebarCollapsed = ref(false)
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

// 保存设置
const saveSettings = () => {
  localStorage.setItem('md-editor-settings', JSON.stringify({
    autoSave: autoSave.value,
    editorMode: editorMode.value,
    previewTheme: previewTheme.value
  }))
}

// 初始化
onMounted(() => {
  mdStore.loadData()
  workspacePath.value = mdStore.workspacePath
  if (workspacePath.value) {
    loadWorkspace(workspacePath.value)
  }

  const saved = localStorage.getItem('md-editor-settings')
  if (saved) {
    const s = JSON.parse(saved)
    autoSave.value = s.autoSave ?? true
    editorMode.value = s.editorMode ?? 'wysiwyg'
    previewTheme.value = s.previewTheme ?? 'default'
  }

  nextTick(() => {
    if (editorMode.value === 'wysiwyg') {
      updateWysiwygContent()
    }
  })
})

// 切换编辑模式
const toggleEditorMode = () => {
  editorMode.value = editorMode.value === 'wysiwyg' ? 'source' : 'wysiwyg'
  saveSettings()

  nextTick(() => {
    if (editorMode.value === 'wysiwyg') {
      updateWysiwygContent()
    }
  })
}

// 更新 WYSIWYG 内容
const updateWysiwygContent = () => {
  if (wysiwygEditorRef.value && !isUpdating.value) {
    const html = renderMarkdown(fileContent.value, selectedFile.value, previewTheme.value)
    wysiwygEditorRef.value.innerHTML = html
  }
}

// 监听主题变化，自动更新预览
watch(previewTheme, () => {
  if (editorMode.value === 'wysiwyg' && wysiwygEditorRef.value) {
    updateWysiwygContent()
  }
})

// 获取当前主题的 CSS 变量
const currentThemeStyle = computed(() => {
  const config = themeConfigs[previewTheme.value] || themeConfigs.default
  return {
    '--theme-bg': config.bg,
    '--theme-text': config.text,
    '--theme-primary': config.primary,
    '--theme-secondary': config.secondary,
    '--theme-accent': config.accent,
    '--theme-code-bg': config.codeBg,
    '--theme-blockquote-bg': config.blockquoteBg,
    '--theme-border': config.borderColor,
    '--theme-gradient': config.gradient,
    '--theme-shadow': config.shadow,
  }
})

// WYSIWYG 编辑器输入处理
const handleWysiwygInput = () => {
  if (isComposing.value || !wysiwygEditorRef.value) return

  isUpdating.value = true
  // 使用 htmlToMarkdown 将 HTML 转回 Markdown
  const html = wysiwygEditorRef.value.innerHTML
  const markdown = htmlToMarkdown(html)
  fileContent.value = markdown
  isUpdating.value = false

  if (autoSave.value && selectedFile.value) {
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    autoSaveTimer = setTimeout(saveFile, 2000)
  }
}

// 处理快捷键
const handleWysiwygKeydown = (e: KeyboardEvent) => {
  if (e.ctrlKey && e.key === 'b') {
    e.preventDefault()
    document.execCommand('bold')
    handleWysiwygInput()
  }
  if (e.ctrlKey && e.key === 'i') {
    e.preventDefault()
    document.execCommand('italic')
    handleWysiwygInput()
  }
  if (e.ctrlKey && e.key === 'k') {
    e.preventDefault()
    const url = prompt('请输入链接地址:', 'https://')
    if (url) {
      document.execCommand('createLink', false, url)
      handleWysiwygInput()
    }
  }
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault()
    saveFile()
  }
}

// 粘贴处理
const handleWysiwygPaste = (e: ClipboardEvent) => {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain') || ''
  document.execCommand('insertText', false, text)
  handleWysiwygInput()
}

// HTML 转 Markdown（简化版，用于编辑）
const htmlToMarkdown = (html: string): string => {
  const temp = document.createElement('div')
  temp.innerHTML = html

  let markdown = ''

  const convertNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || ''
    if (node.nodeType !== Node.ELEMENT_NODE) return ''

    const element = node as HTMLElement
    const tagName = element.tagName.toLowerCase()
    const children = Array.from(element.childNodes).map(convertNode).join('')

    switch (tagName) {
      case 'h1': return '# ' + children + '\n\n'
      case 'h2': return '## ' + children + '\n\n'
      case 'h3': return '### ' + children + '\n\n'
      case 'h4': return '#### ' + children + '\n\n'
      case 'h5': return '##### ' + children + '\n\n'
      case 'h6': return '###### ' + children + '\n\n'
      case 'p': return children + '\n\n'
      case 'br': return '\n'
      case 'strong':
      case 'b': return '**' + children + '**'
      case 'em':
      case 'i': return '*' + children + '*'
      case 'code': return '`' + children + '`'
      case 'pre':
        const codeBlock = element.querySelector('code')
        if (codeBlock) {
          const lang = codeBlock.className.match(/language-(\w+)/)?.[1] || ''
          return '```' + lang + '\n' + codeBlock.textContent + '\n```\n\n'
        }
        return '```\n' + children + '\n```\n\n'
      case 'blockquote':
        return '> ' + children.replace(/\n/g, '\n> ') + '\n\n'
      case 'a':
        const href = element.getAttribute('href') || ''
        return '[' + children + '](' + href + ')'
      case 'img':
        const src = element.getAttribute('src') || ''
        const alt = element.getAttribute('alt') || ''
        return '![' + alt + '](' + src + ')'
      case 'ul':
        return Array.from(element.children).map(li => '- ' + convertNode(li)).join('\n') + '\n\n'
      case 'ol':
        return Array.from(element.children).map((li, i) => (i + 1) + '. ' + convertNode(li)).join('\n') + '\n\n'
      case 'li':
        return children
      case 'div':
        return children
      default:
        return children
    }
  }

  markdown = Array.from(temp.childNodes).map(convertNode).join('')
  return markdown.replace(/\n{3,}/g, '\n\n').trim()
}

// 选择工作区
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

// 处理文件树项点击
const handleFileItemClick = async (item: FileItem) => {
  if (item.isDirectory) {
    await toggleFolder(item)
  } else {
    await openFile(item.path)
  }
}

// 打开文件
const openFile = async (filePath: string) => {
  const data = await readFile(filePath)
  if (!data) {
    return
  }

  fileContent.value = data.content
  fileInfo.value = {
    size: data.size,
    modifiedTime: data.modifiedTime,
    lineCount: data.lineCount
  }
  selectedFile.value = filePath

  nextTick(() => {
    if (editorMode.value === 'wysiwyg' && wysiwygEditorRef.value) {
      updateWysiwygContent()
    }
  })

  const fileName = filePath.split('\\').pop() || ''
  mdStore.addToRecent({ path: filePath, name: fileName, isDirectory: false, lastOpened: Date.now() })
}

// 刷新工作区
const refreshWorkspace = async () => {
  if (!workspacePath.value) return
  await loadWorkspace(workspacePath.value)
  ElMessage.success('目录已刷新')
}

// 显示创建菜单
const showCreateMenu = () => {
  if (!workspacePath.value) return
  createTargetPath.value = workspacePath.value
  showCreateDialog.value = true
}

// 打开创建对话框
const openCreateDialog = (type: 'file' | 'folder', targetPath?: string) => {
  createType.value = type
  createName.value = ''
  createTargetPath.value = targetPath || workspacePath.value
  showCreateDialog.value = true
}

// 确认创建
const confirmCreate = async () => {
  if (!createName.value.trim() || !createTargetPath.value) return

  const fullPath = `${createTargetPath.value}\\${createName.value.trim()}`

  try {
    if (createType.value === 'file') {
      await window.electronAPI.mdCreateFile(fullPath)
      ElMessage.success('文件创建成功')
      // 打开新创建的文件
      await openFile(fullPath)
    } else {
      await window.electronAPI.mdCreateDirectory(fullPath)
      ElMessage.success('目录创建成功')
    }
    // 刷新目录
    await refreshWorkspace()
    showCreateDialog.value = false
  } catch (error) {
    ElMessage.error(createType.value === 'file' ? '创建文件失败' : '创建目录失败')
  }
}

// 处理文件树右键点击
const handleFileTreeContextMenu = (e: MouseEvent, item: FileItem) => {
  e.preventDefault()
  contextMenuItem.value = item
  contextMenuX.value = e.clientX
  contextMenuY.value = e.clientY
  contextMenuVisible.value = true
}

// 隐藏右键菜单
const hideContextMenu = () => {
  contextMenuVisible.value = false
  contextMenuItem.value = null
}

// 保存文件
const saveFile = async () => {
  if (!selectedFile.value) return
  const success = await saveFileContent(selectedFile.value, fileContent.value)
  if (success) {
    ElMessage.success({ message: '已保存', duration: 1000 })
  }
}

// 生成公众号内容 - 使用当前主题样式
const generateWechatContent = () => {
  const html = generateWechatHtml(fileContent.value, selectedFile.value, previewTheme.value)
  wechatContent.value = html
  showWechatDialog.value = true
}

// 复制公众号内容
const copyWechatContent = async () => {
  const success = await copyHtmlToClipboard(wechatContent.value)
  if (success) {
    ElMessage.success('已复制到剪贴板，可直接粘贴到公众号编辑器')
  } else {
    ElMessage.error('复制失败')
  }
}

// 大纲
const outline = computed(() => {
  const items: { level: number; text: string; line: number; id: string }[] = []
  const lines = fileContent.value.replace(/\r\n/g, '\n').split('\n')
  let inCodeBlock = false
  lines.forEach((line, index) => {
    if (/^```|^~~~/.test(line)) {
      inCodeBlock = !inCodeBlock
      return
    }
    if (!inCodeBlock) {
      const match = line.match(/^(#{1,6})\s+(.+)$/)
      if (match) {
        // 生成锚点ID
        const id = 'heading-' + items.length
        items.push({
          level: match[1].length,
          text: match[2].trim(),
          line: index + 1,
          id
        })
      }
    }
  })
  return items
})

// 点击大纲项跳转到对应标题
const scrollToHeading = (item: { level: number; text: string; line: number; id: string }) => {
  scrollToLine(item.line)
}

// 跳转到指定行（用于大纲跳转）
const scrollToLine = (lineNumber: number) => {
  if (editorMode.value === 'wysiwyg' && wysiwygEditorRef.value) {
    // 在WYSIWYG模式下，找到对应的标题元素
    const headings = Array.from(wysiwygEditorRef.value.querySelectorAll('h1, h2, h3, h4, h5, h6')) as HTMLElement[]

    // 找到对应的大纲项
    const outlineItem = outline.value.find(item => item.line === lineNumber)
    if (outlineItem) {
      // 根据文本内容匹配
      const targetHeading = headings.find(h => h.textContent?.trim() === outlineItem.text)
      if (targetHeading) {
        targetHeading.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // 添加临时高亮
        targetHeading.style.transition = 'background-color 0.3s'
        const originalBg = targetHeading.style.backgroundColor
        targetHeading.style.backgroundColor = 'var(--theme-primary, rgba(67, 97, 238, 0.15))'
        setTimeout(() => {
          targetHeading.style.backgroundColor = originalBg
        }, 1500)
      }
    }
  } else {
    // 源码模式下滚动到对应行
    const sourceEditor = document.querySelector('.source-editor') as HTMLTextAreaElement
    if (sourceEditor) {
      const lines = fileContent.value.substring(0, fileContent.value.split('\n').slice(0, lineNumber - 1).join('\n').length).split('\n').length
      const lineHeight = 22.4 // 14px * 1.6 line-height
      sourceEditor.scrollTop = (lineNumber - 1) * lineHeight - sourceEditor.clientHeight / 2
      // 设置光标位置
      const pos = fileContent.value.split('\n').slice(0, lineNumber - 1).join('\n').length + (lineNumber > 1 ? 1 : 0)
      sourceEditor.setSelectionRange(pos, pos)
      sourceEditor.focus()
    }
  }
}
</script>

<template>
  <div class="markdown-notes">
    <!-- 文件侧边栏 -->
    <div class="file-sidebar" :class="{ collapsed: sidebarCollapsed }">
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
      <div class="file-list" v-loading="isLoading" @contextmenu.prevent="handleFileTreeContextMenu($event, { name: '', path: workspacePath, isDirectory: true, size: 0, modifiedTime: 0 })">
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
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button-group>
            <el-button
              :type="editorMode === 'wysiwyg' ? 'primary' : ''"
              size="small"
              @click="editorMode = 'wysiwyg'; saveSettings(); updateWysiwygContent()"
            >
              <el-icon><Reading /></el-icon>
              所见即所得
            </el-button>
            <el-button
              :type="editorMode === 'source' ? 'primary' : ''"
              size="small"
              @click="editorMode = 'source'; saveSettings()"
            >
              <el-icon><SourceCodeIcon /></el-icon>
              源码
            </el-button>
          </el-button-group>

          <el-divider direction="vertical" />

          <el-button
            type="success"
            size="small"
            :icon="DocumentChecked"
            @click="saveFile"
            :disabled="!selectedFile"
          >
            保存
          </el-button>

          <el-divider direction="vertical" />

          <el-select v-model="previewTheme" size="small" style="width: 140px" @change="saveSettings">
            <el-option label="默认主题" value="default" />
            <el-option label="GitHub" value="github" />
            <el-option label="微信公众号" value="wechat" />
            <el-option label="Medium" value="medium" />
            <el-option label="Notion" value="notion" />
            <el-option label="掘金" value="juejin" />
            <el-option label="橙心" value="chengxin" />
            <el-option label="姹紫" value="chazi" />
            <el-option label="嫩青" value="nenqing" />
            <el-option label="绿意" value="lvyi" />
            <el-option label="红绯" value="hongfei" />
            <el-option label="蓝莹" value="lanying" />
            <el-option label="兰青" value="lanqing" />
            <el-option label="山吹" value="shanchui" />
            <el-option label="极客黑" value="jikehei" />
          </el-select>

          <el-divider direction="vertical" />

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

        <div class="toolbar-right" v-if="selectedFile">
          <span class="file-info-text">{{ selectedFile.split('\\').pop() }}</span>
        </div>
      </div>

      <!-- 编辑器主体 -->
      <div class="editor-body">
        <!-- WYSIWYG 模式 -->
        <div
          v-show="editorMode === 'wysiwyg'"
          ref="wysiwygEditorRef"
          class="wysiwyg-editor"
          :class="'theme-' + previewTheme"
          contenteditable="true"
          @input="handleWysiwygInput"
          @keydown="handleWysiwygKeydown"
          @paste="handleWysiwygPaste"
          @compositionstart="isComposing = true"
          @compositionend="isComposing = false; handleWysiwygInput()"
        />

        <!-- 源码模式 -->
        <textarea
          v-show="editorMode === 'source'"
          v-model="fileContent"
          class="source-editor"
          placeholder="开始编写 Markdown..."
        />
      </div>
    </div>

    <!-- 大纲侧边栏 -->
    <div class="outline-sidebar" :class="{ collapsed: !showOutline }">
      <div class="outline-header">
        <span>大纲</span>
      </div>
      <div class="outline-content">
        <div
          v-for="item in outline"
          :key="item.line"
          class="outline-item"
          :class="'level-' + item.level"
          @click="scrollToLine(item.line)"
          :title="item.text"
        >
          {{ item.text }}
        </div>
        <el-empty v-if="outline.length === 0" description="无大纲" :image-size="40" />
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

.file-sidebar.collapsed {
  width: 0;
  overflow: hidden;
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
}

.toolbar {
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-primary);
  flex-wrap: wrap;
  gap: 8px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-right {
  display: flex;
  align-items: center;
}

.file-info-text {
  font-size: 13px;
  color: var(--text-secondary);
}

.editor-body {
  flex: 1;
  overflow: auto;
  padding: 20px;
}

/* WYSIWYG 编辑器 - 现代化设计 */
.wysiwyg-editor {
  min-height: 100%;
  padding: 2rem;
  background: var(--theme-bg, var(--bg-primary));
  border-radius: 16px;
  outline: none;
  font-size: 16px;
  line-height: 1.8;
  color: var(--theme-text, var(--text-primary));
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

/* 标题样式 */
.wysiwyg-editor :deep(h1) {
  font-size: 2.25rem;
  font-weight: 800;
  margin: 2.5rem 0 1.5rem;
  padding-bottom: 0.75rem;
  background: var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
  line-height: 1.2;
  position: relative;
}

.wysiwyg-editor :deep(h1)::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 60px;
  height: 4px;
  background: var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%));
  border-radius: 2px;
}

.wysiwyg-editor :deep(h2) {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 2rem 0 1rem;
  color: var(--theme-text, var(--text-primary));
  padding-left: 1rem;
  border-left: 4px solid var(--theme-primary, var(--primary-color));
  letter-spacing: -0.01em;
}

.wysiwyg-editor :deep(h3) {
  font-size: 1.375rem;
  font-weight: 600;
  margin: 1.75rem 0 0.75rem;
  color: var(--theme-primary, var(--primary-color));
}

.wysiwyg-editor :deep(h4),
.wysiwyg-editor :deep(h5),
.wysiwyg-editor :deep(h6) {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 1.5rem 0 0.75rem;
  color: var(--theme-secondary, var(--text-primary));
}

.wysiwyg-editor :deep(p) {
  margin: 1rem 0;
  line-height: 1.8;
  color: var(--theme-text, var(--text-primary));
}

/* 图片样式 */
.wysiwyg-editor :deep(img) {
  max-width: 100%;
  border-radius: 12px;
  display: block;
  margin: 1.5rem auto;
  box-shadow: var(--theme-shadow, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.wysiwyg-editor :deep(img:hover) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

/* 表格样式 */
.wysiwyg-editor :deep(table) {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin: 1.5rem 0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--theme-shadow, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
  border: 1px solid var(--theme-border, var(--border-color));
}

.wysiwyg-editor :deep(th) {
  background: var(--theme-primary, var(--primary-color));
  color: white;
  padding: 0.875rem 1rem;
  font-weight: 600;
  text-align: left;
}

.wysiwyg-editor :deep(td) {
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--theme-border, var(--border-color));
  border-right: 1px solid var(--theme-border, var(--border-color));
  color: var(--theme-text, var(--text-primary));
}

.wysiwyg-editor :deep(tr:last-child td) {
  border-bottom: none;
}

.wysiwyg-editor :deep(tr:nth-child(even)) {
  background: var(--theme-code-bg, var(--bg-hover));
}

/* 代码块样式 */
.wysiwyg-editor :deep(pre) {
  background: #1e1e2e;
  border-radius: 12px;
  padding: 1.25rem;
  overflow-x: auto;
  margin: 1.25rem 0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
}

.wysiwyg-editor :deep(code) {
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  font-size: 0.875rem;
}

.wysiwyg-editor :deep(:not(pre) > code) {
  background: var(--theme-code-bg, var(--bg-hover));
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  color: var(--theme-primary, var(--primary-color));
  border: 1px solid var(--theme-border, var(--border-color));
  font-size: 0.875em;
}

/* 引用块样式 */
.wysiwyg-editor :deep(blockquote) {
  border-left: 4px solid var(--theme-primary, var(--primary-color));
  background: var(--theme-blockquote-bg, var(--bg-hover));
  padding: 1rem 1.25rem;
  margin: 1.25rem 0;
  border-radius: 0 12px 12px 0;
  box-shadow: var(--theme-shadow, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
  font-style: italic;
}

.wysiwyg-editor :deep(blockquote p) {
  margin: 0.5rem 0;
}

/* 链接样式 */
.wysiwyg-editor :deep(a) {
  color: var(--theme-primary, var(--primary-color));
  text-decoration: none;
  border-bottom: 2px solid transparent;
  transition: border-color 0.2s, color 0.2s;
  font-weight: 500;
}

.wysiwyg-editor :deep(a:hover) {
  border-bottom-color: var(--theme-primary, var(--primary-color));
}

/* 列表样式 */
.wysiwyg-editor :deep(ul),
.wysiwyg-editor :deep(ol) {
  padding-left: 1.75rem;
  margin: 1rem 0;
}

.wysiwyg-editor :deep(li) {
  margin: 0.5rem 0;
  line-height: 1.7;
  color: var(--theme-text, var(--text-primary));
}

.wysiwyg-editor :deep(li::marker) {
  color: var(--theme-primary, var(--primary-color));
}

/* 分割线样式 */
.wysiwyg-editor :deep(hr) {
  border: none;
  height: 2px;
  background: var(--theme-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%));
  margin: 2rem 0;
  border-radius: 1px;
}

/* 任务列表样式 */
.wysiwyg-editor :deep(.task-list-item) {
  list-style: none;
  margin-left: -1.5rem;
}

.wysiwyg-editor :deep(.task-list-item input[type="checkbox"]) {
  accent-color: var(--theme-primary, var(--primary-color));
  width: 1.1rem;
  height: 1.1rem;
  margin-right: 0.5rem;
  vertical-align: middle;
}

/* 源码编辑器 */
.source-editor {
  width: 100%;
  height: 100%;
  padding: 20px;
  border: none;
  outline: none;
  resize: none;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.6;
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 8px;
}

/* 大纲侧边栏 */
.outline-sidebar {
  width: 200px;
  background: var(--bg-primary);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.outline-sidebar.collapsed {
  width: 0;
  overflow: hidden;
}

.outline-header {
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
  font-weight: 600;
  font-size: 14px;
}

.outline-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.outline-item {
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.outline-item {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: all 0.2s ease;
  margin: 2px 8px;
  border-left: 3px solid transparent;
}

.outline-item:hover {
  background: var(--bg-hover);
  color: var(--primary-color);
  border-left-color: var(--primary-color);
  transform: translateX(4px);
}

.outline-item.level-1 {
  font-weight: 600;
  color: var(--text-primary);
}
.outline-item.level-2 {
  padding-left: 20px;
  font-size: 12px;
}
.outline-item.level-3 {
  padding-left: 28px;
  font-size: 12px;
  opacity: 0.9;
}
.outline-item.level-4 {
  padding-left: 36px;
  font-size: 11px;
  opacity: 0.85;
}
.outline-item.level-5, .outline-item.level-6 {
  padding-left: 44px;
  font-size: 11px;
  opacity: 0.8;
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
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-family: -apple-system-font, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', Arial, sans-serif;
  font-size: 16px;
  line-height: 1.75;
  color: #333;
}

.wechat-content :deep(img) {
  max-width: 100%;
  display: block;
  margin: 12px 0;
}

.wechat-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}

.wechat-content :deep(th),
.wechat-content :deep(td) {
  padding: 8px;
  border: 1px solid #ddd;
}

.wechat-content :deep(th) {
  background: #f5f5f5;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* ========== 预览主题样式 ========== */

/* 橙心 - 温暖橙色主题 */
.wysiwyg-editor.theme-chengxin {
  background: #fff8f0;
  color: #5d4037;
}
.wysiwyg-editor.theme-chengxin :deep(h1),
.wysiwyg-editor.theme-chengxin :deep(h2) {
  color: #e65100;
  border-bottom-color: #ffcc80;
}
.wysiwyg-editor.theme-chengxin :deep(h3),
.wysiwyg-editor.theme-chengxin :deep(h4),
.wysiwyg-editor.theme-chengxin :deep(h5),
.wysiwyg-editor.theme-chengxin :deep(h6) {
  color: #ef6c00;
}
.wysiwyg-editor.theme-chengxin :deep(a) {
  color: #ff6d00;
}
.wysiwyg-editor.theme-chengxin :deep(:not(pre) > code) {
  background: #ffe0b2;
  color: #e65100;
}
.wysiwyg-editor.theme-chengxin :deep(blockquote) {
  border-left-color: #ff9800;
  background: #fff3e0;
  padding: 12px 16px;
  border-radius: 0 8px 8px 0;
}
.wysiwyg-editor.theme-chengxin :deep(th) {
  background: #ffcc80;
}

/* 姹紫 - 优雅紫色主题 */
.wysiwyg-editor.theme-chazi {
  background: #faf5ff;
  color: #4a148c;
}
.wysiwyg-editor.theme-chazi :deep(h1),
.wysiwyg-editor.theme-chazi :deep(h2) {
  color: #7b1fa2;
  border-bottom-color: #e1bee7;
}
.wysiwyg-editor.theme-chazi :deep(h3),
.wysiwyg-editor.theme-chazi :deep(h4),
.wysiwyg-editor.theme-chazi :deep(h5),
.wysiwyg-editor.theme-chazi :deep(h6) {
  color: #8e24aa;
}
.wysiwyg-editor.theme-chazi :deep(a) {
  color: #9c27b0;
}
.wysiwyg-editor.theme-chazi :deep(:not(pre) > code) {
  background: #f3e5f5;
  color: #7b1fa2;
}
.wysiwyg-editor.theme-chazi :deep(blockquote) {
  border-left-color: #ce93d8;
  background: #f3e5f5;
  padding: 12px 16px;
  border-radius: 0 8px 8px 0;
}
.wysiwyg-editor.theme-chazi :deep(th) {
  background: #e1bee7;
}

/* 嫩青 - 清新薄荷主题 */
.wysiwyg-editor.theme-nenqing {
  background: #f0fff4;
  color: #1b5e20;
}
.wysiwyg-editor.theme-nenqing :deep(h1),
.wysiwyg-editor.theme-nenqing :deep(h2) {
  color: #2e7d32;
  border-bottom-color: #a5d6a7;
}
.wysiwyg-editor.theme-nenqing :deep(h3),
.wysiwyg-editor.theme-nenqing :deep(h4),
.wysiwyg-editor.theme-nenqing :deep(h5),
.wysiwyg-editor.theme-nenqing :deep(h6) {
  color: #388e3c;
}
.wysiwyg-editor.theme-nenqing :deep(a) {
  color: #43a047;
}
.wysiwyg-editor.theme-nenqing :deep(:not(pre) > code) {
  background: #c8e6c9;
  color: #1b5e20;
}
.wysiwyg-editor.theme-nenqing :deep(blockquote) {
  border-left-color: #81c784;
  background: #e8f5e9;
  padding: 12px 16px;
  border-radius: 0 8px 8px 0;
}
.wysiwyg-editor.theme-nenqing :deep(th) {
  background: #a5d6a7;
}

/* 绿意 - 森林绿色主题 */
.wysiwyg-editor.theme-lvyi {
  background: #f1f8e9;
  color: #33691e;
}
.wysiwyg-editor.theme-lvyi :deep(h1),
.wysiwyg-editor.theme-lvyi :deep(h2) {
  color: #558b2f;
  border-bottom-color: #c5e1a5;
}
.wysiwyg-editor.theme-lvyi :deep(h3),
.wysiwyg-editor.theme-lvyi :deep(h4),
.wysiwyg-editor.theme-lvyi :deep(h5),
.wysiwyg-editor.theme-lvyi :deep(h6) {
  color: #689f38;
}
.wysiwyg-editor.theme-lvyi :deep(a) {
  color: #7cb342;
}
.wysiwyg-editor.theme-lvyi :deep(:not(pre) > code) {
  background: #dcedc8;
  color: #33691e;
}
.wysiwyg-editor.theme-lvyi :deep(blockquote) {
  border-left-color: #aed581;
  background: #f1f8e9;
  padding: 12px 16px;
  border-radius: 0 8px 8px 0;
}
.wysiwyg-editor.theme-lvyi :deep(th) {
  background: #c5e1a5;
}

/* 红绯 - 热情红色主题 */
.wysiwyg-editor.theme-hongfei {
  background: #fff5f5;
  color: #b71c1c;
}
.wysiwyg-editor.theme-hongfei :deep(h1),
.wysiwyg-editor.theme-hongfei :deep(h2) {
  color: #c62828;
  border-bottom-color: #ef9a9a;
}
.wysiwyg-editor.theme-hongfei :deep(h3),
.wysiwyg-editor.theme-hongfei :deep(h4),
.wysiwyg-editor.theme-hongfei :deep(h5),
.wysiwyg-editor.theme-hongfei :deep(h6) {
  color: #d32f2f;
}
.wysiwyg-editor.theme-hongfei :deep(a) {
  color: #e53935;
}
.wysiwyg-editor.theme-hongfei :deep(:not(pre) > code) {
  background: #ffcdd2;
  color: #b71c1c;
}
.wysiwyg-editor.theme-hongfei :deep(blockquote) {
  border-left-color: #ef5350;
  background: #ffebee;
  padding: 12px 16px;
  border-radius: 0 8px 8px 0;
}
.wysiwyg-editor.theme-hongfei :deep(th) {
  background: #ef9a9a;
}

/* 蓝莹 - 晶莹蓝色主题 */
.wysiwyg-editor.theme-lanying {
  background: #f0f8ff;
  color: #01579b;
}
.wysiwyg-editor.theme-lanying :deep(h1),
.wysiwyg-editor.theme-lanying :deep(h2) {
  color: #0277bd;
  border-bottom-color: #81d4fa;
}
.wysiwyg-editor.theme-lanying :deep(h3),
.wysiwyg-editor.theme-lanying :deep(h4),
.wysiwyg-editor.theme-lanying :deep(h5),
.wysiwyg-editor.theme-lanying :deep(h6) {
  color: #0288d1;
}
.wysiwyg-editor.theme-lanying :deep(a) {
  color: #29b6f6;
}
.wysiwyg-editor.theme-lanying :deep(:not(pre) > code) {
  background: #b3e5fc;
  color: #01579b;
}
.wysiwyg-editor.theme-lanying :deep(blockquote) {
  border-left-color: #4fc3f7;
  background: #e1f5fe;
  padding: 12px 16px;
  border-radius: 0 8px 8px 0;
}
.wysiwyg-editor.theme-lanying :deep(th) {
  background: #81d4fa;
}

/* 兰青 - 淡雅青色主题 */
.wysiwyg-editor.theme-lanqing {
  background: #e0f7fa;
  color: #006064;
}
.wysiwyg-editor.theme-lanqing :deep(h1),
.wysiwyg-editor.theme-lanqing :deep(h2) {
  color: #00838f;
  border-bottom-color: #80deea;
}
.wysiwyg-editor.theme-lanqing :deep(h3),
.wysiwyg-editor.theme-lanqing :deep(h4),
.wysiwyg-editor.theme-lanqing :deep(h5),
.wysiwyg-editor.theme-lanqing :deep(h6) {
  color: #0097a7;
}
.wysiwyg-editor.theme-lanqing :deep(a) {
  color: #00acc1;
}
.wysiwyg-editor.theme-lanqing :deep(:not(pre) > code) {
  background: #b2ebf2;
  color: #006064;
}
.wysiwyg-editor.theme-lanqing :deep(blockquote) {
  border-left-color: #4dd0e1;
  background: #e0f7fa;
  padding: 12px 16px;
  border-radius: 0 8px 8px 0;
}
.wysiwyg-editor.theme-lanqing :deep(th) {
  background: #80deea;
}

/* 山吹 - 温暖黄色主题 */
.wysiwyg-editor.theme-shanchui {
  background: #fffde7;
  color: #f57f17;
}
.wysiwyg-editor.theme-shanchui :deep(h1),
.wysiwyg-editor.theme-shanchui :deep(h2) {
  color: #fbc02d;
  border-bottom-color: #fff176;
}
.wysiwyg-editor.theme-shanchui :deep(h3),
.wysiwyg-editor.theme-shanchui :deep(h4),
.wysiwyg-editor.theme-shanchui :deep(h5),
.wysiwyg-editor.theme-shanchui :deep(h6) {
  color: #fdd835;
}
.wysiwyg-editor.theme-shanchui :deep(a) {
  color: #ffee58;
}
.wysiwyg-editor.theme-shanchui :deep(:not(pre) > code) {
  background: #fff9c4;
  color: #f57f17;
}
.wysiwyg-editor.theme-shanchui :deep(blockquote) {
  border-left-color: #fff176;
  background: #fffde7;
  padding: 12px 16px;
  border-radius: 0 8px 8px 0;
}
.wysiwyg-editor.theme-shanchui :deep(th) {
  background: #fff176;
}

/* 极客黑 - 深色代码主题 */
.wysiwyg-editor.theme-jikehei {
  background: #1e1e2e;
  color: #cdd6f4;
}
.wysiwyg-editor.theme-jikehei :deep(h1),
.wysiwyg-editor.theme-jikehei :deep(h2) {
  color: #f38ba8;
  border-bottom-color: #45475a;
}
.wysiwyg-editor.theme-jikehei :deep(h3),
.wysiwyg-editor.theme-jikehei :deep(h4),
.wysiwyg-editor.theme-jikehei :deep(h5),
.wysiwyg-editor.theme-jikehei :deep(h6) {
  color: #fab387;
}
.wysiwyg-editor.theme-jikehei :deep(a) {
  color: #89b4fa;
}
.wysiwyg-editor.theme-jikehei :deep(:not(pre) > code) {
  background: #313244;
  color: #f38ba8;
}
.wysiwyg-editor.theme-jikehei :deep(blockquote) {
  border-left-color: #89b4fa;
  background: #313244;
  padding: 12px 16px;
  border-radius: 0 8px 8px 0;
}
.wysiwyg-editor.theme-jikehei :deep(th) {
  background: #45475a;
}
.wysiwyg-editor.theme-jikehei :deep(td) {
  border-color: #45475a;
}

/* 侧边栏操作按钮 */
.sidebar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 新建对话框 */
.create-dialog-content {
  padding: 10px 0;
}

.create-hint {
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.create-hint .path {
  color: var(--primary-color);
  font-family: 'Fira Code', monospace;
  background: var(--bg-hover);
  padding: 2px 6px;
  border-radius: 4px;
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 6px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  min-width: 160px;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  color: var(--text-primary);
}

.context-menu-item:hover {
  background: var(--bg-hover);
  color: var(--primary-color);
}

.context-menu-item .el-icon {
  font-size: 16px;
}

.context-menu-divider {
  height: 1px;
  background: var(--border-color);
  margin: 6px 0;
}
</style>
