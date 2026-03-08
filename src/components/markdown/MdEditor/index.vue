<script setup lang="ts">
import { ref, computed, nextTick, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Reading, DocumentChecked,
  Document as SourceCodeIcon
} from '@element-plus/icons-vue'
import { useMdEditor } from './useMdEditor'
import type { EditorMode, PreviewTheme, OutlineItem, MdEditorProps } from './types'

// ==================== Props & Emits ====================

const props = withDefaults(defineProps<MdEditorProps>(), {
  modelValue: '',
  filePath: '',
  mode: 'wysiwyg',
  theme: 'default',
  autoSave: true,
  showOutline: true,
  disabled: false,
  placeholder: '开始编写 Markdown...'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'update:mode', mode: EditorMode): void
  (e: 'update:theme', theme: PreviewTheme): void
  (e: 'save', isManual?: boolean): void
  (e: 'change', value: string): void
  (e: 'scrollToHeading', item: OutlineItem): void
}>()

// ==================== 响应式数据 ====================

const content = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const editorMode = computed({
  get: () => props.mode,
  set: (val) => emit('update:mode', val)
})

const previewTheme = computed({
  get: () => props.theme,
  set: (val) => emit('update:theme', val)
})

const filePathRef = computed(() => props.filePath)
const autoSaveRef = computed(() => props.autoSave)

// ==================== 使用 Composable ====================

const {
  wysiwygEditorRef,
  state,
  currentThemeStyle,
  outline,
  updateWysiwygContent,
  highlightCodeBlocks,
  handleWysiwygInput,
  handleWysiwygKeydown,
  handleWysiwygPaste,
  triggerSave,
  scrollToLine
} = useMdEditor({
  content,
  filePath: filePathRef,
  mode: editorMode,
  theme: previewTheme,
  autoSave: autoSaveRef,
  onSave: () => emit('save'),
  onChange: (val) => emit('change', val)
})

// ==================== 方法 ====================

const handleModeChange = (mode: EditorMode) => {
  editorMode.value = mode
  if (mode === 'wysiwyg') {
    nextTick(() => {
      updateWysiwygContent()
    })
  }
}

const handleSave = () => {
  triggerSave()
  emit('save', true)
}

const handleOutlineClick = (item: OutlineItem) => {
  emit('scrollToHeading', item)
  scrollToLine(item.line)
}

// ==================== 暴露给父组件的方法 ====================

defineExpose({
  focus: () => {
    nextTick(() => {
      if (editorMode.value === 'wysiwyg' && wysiwygEditorRef.value) {
        wysiwygEditorRef.value.focus()
      }
    })
  },
  insertContent: (text: string) => {
    if (editorMode.value === 'wysiwyg' && wysiwygEditorRef.value) {
      document.execCommand('insertText', false, text)
      handleWysiwygInput()
    }
  },
  getSelectedText: (): string => {
    if (editorMode.value === 'wysiwyg' && wysiwygEditorRef.value) {
      const selection = window.getSelection()
      return selection?.toString() || ''
    }
    return ''
  },
  scrollToLine
})

// ==================== 监听 ====================

watch(() => props.modelValue, (newVal, oldVal) => {
  if (!state.isUpdating && editorMode.value === 'wysiwyg' && newVal !== oldVal) {
    nextTick(() => {
      updateWysiwygContent()
    })
  }
}, { immediate: true })

watch(() => props.filePath, (newPath) => {
  if (newPath && editorMode.value === 'wysiwyg') {
    nextTick(() => {
      updateWysiwygContent()
    })
  }
})

onUnmounted(() => {
  triggerSave()
})
</script>

<template>
  <div class="md-editor">
    <!-- 工具栏 -->
    <div class="md-editor-toolbar">
      <div class="toolbar-left">
        <el-button-group>
          <el-button
            :type="editorMode === 'wysiwyg' ? 'primary' : ''"
            size="small"
            @click="handleModeChange('wysiwyg')"
          >
            <el-icon><Reading /></el-icon>
            所见即所得
          </el-button>
          <el-button
            :type="editorMode === 'source' ? 'primary' : ''"
            size="small"
            @click="handleModeChange('source')"
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
          @click="handleSave"
          :disabled="disabled"
        >
          保存
        </el-button>

        <el-divider direction="vertical" />

        <el-select v-model="previewTheme" size="small" style="width: 160px">
          <el-option-group label="推荐主题">
            <el-option label="极光蓝" value="default" />
            <el-option label="霓虹幻彩" value="neon" />
            <el-option label="落日余晖" value="sunset" />
            <el-option label="深海静谧" value="ocean" />
            <el-option label="浆果风暴" value="berry" />
            <el-option label="森林秘境" value="forest" />
          </el-option-group>
          <el-option-group label="平台风格">
            <el-option label="GitHub Pro" value="github" />
            <el-option label="Notion" value="notion" />
            <el-option label="Medium" value="medium" />
            <el-option label="掘金" value="juejin" />
            <el-option label="微信公众号" value="wechat" />
          </el-option-group>
          <el-option-group label="深色主题">
            <el-option label="极夜黑" value="dark" />
            <el-option label="午夜蓝" value="midnight" />
            <el-option label="Dracula" value="dracula" />
          </el-option-group>
          <el-option-group label="特色主题">
            <el-option label="纸张质感" value="paper" />
          </el-option-group>
        </el-select>
      </div>

      <div class="toolbar-right" v-if="filePath">
        <span class="file-name">{{ filePath.split('\\').pop() }}</span>
      </div>
    </div>

    <!-- 编辑器主体 -->
    <div class="md-editor-body">
      <div class="editor-wrapper">
        <!-- WYSIWYG 模式 -->
        <div
          v-show="editorMode === 'wysiwyg'"
          ref="wysiwygEditorRef"
          class="wysiwyg-editor"
          :style="currentThemeStyle"
          :contenteditable="!disabled"
          @input="handleWysiwygInput"
          @keydown="handleWysiwygKeydown"
          @paste="handleWysiwygPaste"
          @compositionstart="state.isComposing = true"
          @compositionend="state.isComposing = false; handleWysiwygInput()"
        />

        <!-- 源码模式 -->
        <textarea
          v-show="editorMode === 'source'"
          v-model="content"
          class="source-editor"
          :placeholder="placeholder"
          :disabled="disabled"
        />
      </div>

      <!-- 大纲侧边栏 -->
      <div v-if="showOutline" class="outline-sidebar">
        <div class="outline-header">
          <span>大纲</span>
        </div>
        <div class="outline-content">
          <div
            v-for="item in outline"
            :key="item.line"
            class="outline-item"
            :class="'level-' + item.level"
            @click="handleOutlineClick(item)"
            :title="item.text"
          >
            {{ item.text }}
          </div>
          <el-empty v-if="outline.length === 0" description="无大纲" :image-size="40" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.md-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-secondary);
}

/* 工具栏 */
.md-editor-toolbar {
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
  gap: 8px;
}

.file-name {
  font-size: 13px;
  color: var(--text-secondary);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 编辑器主体 */
.md-editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.editor-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* WYSIWYG 编辑器 */
.wysiwyg-editor {
  width: 100%;
  height: 100%;
  padding: 32px 40px;
  overflow-y: auto;
  background: var(--theme-bg, var(--bg-primary));
  color: var(--theme-text, var(--text-primary));
  font-family: var(--theme-font, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
  font-size: 16px;
  line-height: 1.8;
  outline: none;
  max-width: 900px;
  margin: 0 auto;
}

.wysiwyg-editor:empty::before {
  content: attr(data-placeholder);
  color: var(--text-secondary);
  opacity: 0.5;
  font-size: 1.1rem;
}

/* 源码编辑器 */
.source-editor {
  width: 100%;
  height: 100%;
  padding: 32px 40px;
  border: none;
  outline: none;
  resize: none;
  background: var(--theme-code-bg, var(--bg-primary));
  color: var(--theme-text, var(--text-primary));
  font-family: var(--theme-code-font, 'JetBrains Mono', 'Fira Code', 'Consolas', monospace);
  font-size: 15px;
  line-height: 1.8;
  tab-size: 2;
}

/* 大纲侧边栏 */
.outline-sidebar {
  width: 240px;
  background: var(--bg-primary);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.outline-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  font-weight: 700;
  font-size: 14px;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 8px;
}

.outline-header::before {
  content: '';
  width: 4px;
  height: 16px;
  background: var(--theme-gradient, var(--primary-color));
  border-radius: 2px;
}

.outline-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.outline-item {
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: all 0.2s ease;
  margin-bottom: 2px;
  border-left: 3px solid transparent;
}

.outline-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-left-color: var(--theme-primary, var(--primary-color));
  padding-left: 14px;
}

.outline-item.level-1 { padding-left: 12px; font-weight: 600; }
.outline-item.level-2 { padding-left: 24px; }
.outline-item.level-3 { padding-left: 36px; font-size: 12px; }
.outline-item.level-4 { padding-left: 48px; font-size: 12px; }
.outline-item.level-5 { padding-left: 60px; font-size: 11px; }
.outline-item.level-6 { padding-left: 72px; font-size: 11px; }
</style>
