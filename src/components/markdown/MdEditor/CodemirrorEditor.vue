<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import Codemirror from 'vue-codemirror6'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import type { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import type { Text } from '@codemirror/state'
import type { PreviewTheme, EditorMode, OutlineItem } from './types'
import { themeConfigs } from '../../../composables/useMarkdownRenderer'

interface Props {
  modelValue: string
  mode: EditorMode
  theme: PreviewTheme
  filePath?: string
  disabled?: boolean
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  mode: 'wysiwyg',
  theme: 'default',
  filePath: '',
  disabled: false,
  placeholder: '开始编写 Markdown...'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}>()

const editorView = ref<EditorView>()

// 计算大纲
const outline = computed<OutlineItem[]>(() => {
  const items: OutlineItem[] = []
  const lines = props.modelValue.replace(/\r\n/g, '\n').split('\n')
  let inCodeBlock = false

  lines.forEach((line, index) => {
    if (/^```|^~~~/.test(line)) {
      inCodeBlock = !inCodeBlock
      return
    }
    if (!inCodeBlock) {
      const match = line.match(/^(#{1,6})\s+(.+)$/)
      if (match) {
        items.push({
          level: match[1].length,
          text: match[2].trim(),
          line: index + 1,
          id: 'heading-' + items.length
        })
      }
    }
  })
  return items
})

// 获取当前主题的背景色
const currentThemeStyle = computed(() => {
  const config = themeConfigs[props.theme] || themeConfigs.default
  return {
    '--editor-bg': config.bg,
    '--editor-text': config.text,
    '--editor-primary': config.primary,
    '--editor-code-bg': config.codeBg,
  }
})

// CodeMirror 扩展
const extensions = computed(() => {
  const base: Extension[] = [markdown()]
  
  // 暗黑主题适配
  const config = themeConfigs[props.theme]
  if (config?.isDark) {
    base.push(oneDark as Extension)
  }
  
  return base
})

// 处理变化
const handleChange = (value: string | Text | undefined) => {
  let text = ''
  if (typeof value === 'string') {
    text = value
  } else if (value && typeof value === 'object' && 'toString' in value) {
    text = value.toString()
  }
  emit('update:modelValue', text)
  emit('change', text)
}

// 处理就绪事件
const handleReady = (payload: { view: EditorView; state: any; container: HTMLElement }) => {
  editorView.value = payload.view
}

// 暴露方法
const focus = () => {
  nextTick(() => {
    editorView.value?.focus()
  })
}

const insertContent = (text: string) => {
  const view = editorView.value
  if (!view) return
  
  const { from, to } = view.state.selection.main
  view.dispatch({
    changes: { from, to, insert: text },
    selection: { anchor: from + text.length }
  })
}

const getSelectedText = (): string => {
  const view = editorView.value
  if (!view) return ''
  
  const { from, to } = view.state.selection.main
  return view.state.doc.sliceString(from, to)
}

const scrollToLine = (lineNumber: number) => {
  const view = editorView.value
  if (!view) return
  
  const line = view.state.doc.line(lineNumber)
  view.dispatch({
    selection: { anchor: line.from },
    scrollIntoView: true
  })
}

defineExpose({
  focus,
  insertContent,
  getSelectedText,
  scrollToLine
})
</script>

<template>
  <div class="codemirror-editor" :style="currentThemeStyle">
    <Codemirror
      :model-value="props.modelValue"
      :extensions="extensions"
      :disabled="disabled"
      :placeholder="placeholder"
      @update:model-value="handleChange"
      @ready="handleReady"
      class="cm-editor-wrapper"
    />
  </div>
</template>

<style scoped>
.codemirror-editor {
  height: 100%;
  background: var(--editor-bg, var(--bg-primary));
}

.cm-editor-wrapper {
  height: 100%;
  font-size: 15px;
  line-height: 1.8;
}

.cm-editor-wrapper :deep(.cm-editor) {
  height: 100%;
  background: var(--editor-bg, var(--bg-primary)) !important;
}

.cm-editor-wrapper :deep(.cm-content) {
  padding: 32px 40px;
  color: var(--editor-text, var(--text-primary));
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}

.cm-editor-wrapper :deep(.cm-scroller) {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}

/* 光标颜色 */
.cm-editor-wrapper :deep(.cm-cursor) {
  border-left-color: var(--editor-primary, var(--primary-color));
}

/* 选中高亮 */
.cm-editor-wrapper :deep(.cm-selectionBackground) {
  background: var(--editor-primary, var(--primary-color))30 !important;
}

/* 激活行 */
.cm-editor-wrapper :deep(.cm-activeLine) {
  background: var(--editor-primary, var(--primary-color))08 !important;
}

/* 行号 */
.cm-editor-wrapper :deep(.cm-gutters) {
  background: var(--editor-bg, var(--bg-primary)) !important;
  border-right: 1px solid var(--border-color);
  color: var(--text-secondary);
}

/* 滚动条 */
.cm-editor-wrapper :deep(.cm-scroller) {
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;
}

.cm-editor-wrapper :deep(.cm-scroller::-webkit-scrollbar) {
  width: 8px;
}

.cm-editor-wrapper :deep(.cm-scroller::-webkit-scrollbar-track) {
  background: transparent;
}

.cm-editor-wrapper :deep(.cm-scroller::-webkit-scrollbar-thumb) {
  background: var(--border-color);
  border-radius: 4px;
}

.cm-editor-wrapper :deep(.cm-scroller::-webkit-scrollbar-thumb:hover) {
  background: var(--editor-primary, var(--primary-color));
}
</style>
