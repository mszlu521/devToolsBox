<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { Node } from '@tiptap/core'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Plugin, PluginKey } from 'prosemirror-state'
import { common, createLowlight } from 'lowlight'
import type { Editor as EditorType, AnyExtension } from '@tiptap/core'
import type { PreviewTheme } from '../MdEditor/types'
import { themeConfigs } from '../../../composables/useMarkdownRenderer'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  theme?: PreviewTheme
  filePath?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [value: string]
}>()

const editor = ref<EditorType | null>(null)
const editorContainer = ref<HTMLDivElement>()
const isFocused = ref(false)
const showSource = ref(false)
const currentTheme = computed(() => props.theme || 'default')

// 根据当前主题生成 CSS 变量
const themeStyles = computed(() => {
  const config = themeConfigs[currentTheme.value] || themeConfigs.default
  return {
    '--md-bg': config.bg,
    '--md-text': config.text,
    '--md-primary': config.primary,
    '--md-secondary': config.secondary,
    '--md-accent': config.accent,
    '--md-code-bg': config.codeBg,
    '--md-blockquote-bg': config.blockquoteBg,
    '--md-border': config.borderColor,
    '--md-gradient': config.gradient,
    '--md-gradient-sec': config.gradientSecondary,
    '--md-shadow': config.shadow,
    '--md-shadow-strong': config.shadowStrong,
    '--md-font': config.fontFamily,
    '--md-code-font': config.codeFontFamily,
    '--md-is-dark': config.isDark ? '1' : '0'
  }
})

// 源码编辑
const sourceContent = ref('')

// 从源码同步回编辑器
const syncSourceToEditor = () => {
  emit('update:modelValue', sourceContent.value)
  emit('change', sourceContent.value)
}

// 切换源码视图
const toggleSourceView = () => {
  if (!showSource.value) {
    // 切换到源码视图时，从编辑器获取当前 Markdown 内容
    // 优先使用 props.modelValue，它应该是最新的
    sourceContent.value = props.modelValue || ''
  } else {
    // 切换回编辑器视图时，同步源码到编辑器
    emit('update:modelValue', sourceContent.value)
    emit('change', sourceContent.value)
  }
  showSource.value = !showSource.value
}

// 切换主题
const toggleTheme = () => {
  // 主题由父组件控制，这里发出事件
  emit('change', props.modelValue)
}

// 创建 lowlight 实例用于代码高亮
const lowlight = createLowlight(common)

// 解析图片路径，将相对路径转换为 mdimage:// 协议（Electron 自定义协议）
const resolveImagePath = (path: string, basePath?: string): string => {
  // 外部 URL 直接返回
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path
  }

  // 已经是 mdimage:// 协议的返回
  if (path.startsWith('mdimage://')) {
    return path
  }

  // 没有 basePath 时，直接返回原路径
  if (!basePath) {
    return path
  }

  const baseDir = basePath.replace(/\\/g, '/').replace(/\/[^\/]+$/, '')

  // Windows 绝对路径 (C:\path)
  if (/^[a-zA-Z]:[\\/]/.test(path)) {
    const normalizedPath = path.replace(/\\/g, '/')
    return `mdimage://${encodeURIComponent(normalizedPath)}`
  }

  // Unix 绝对路径
  if (path.startsWith('/')) {
    return `mdimage://${encodeURIComponent(path)}`
  }

  // 相对路径 - 相对于当前文件目录
  const resolvedPath = baseDir + '/' + path.replace(/\\/g, '/')
  return `mdimage://${encodeURIComponent(resolvedPath)}`
}

// 将 mdimage:// 协议路径还原为原始路径
const restoreImagePath = (src: string): string => {
  if (src.startsWith('mdimage://')) {
    return decodeURIComponent(src.replace('mdimage://', ''))
  }
  return src
}

// 自定义 Image 扩展，支持 mdimage:// 协议
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: element => {
          const src = element.getAttribute('src') || ''
          // 将普通路径转换为 mdimage:// 协议（用于编辑器内部显示）
          return resolveImagePath(src, props.filePath)
        },
      }
    }
  }
})

// 标记符插件状态接口
interface MarkerPluginState {
  cursorPos: number | null
}

// Typora 风格标记符插件 - 根据光标位置显示/隐藏 Markdown 标记符
const createMarkerPlugin = (): AnyExtension => {
  const markerPluginKey = new PluginKey<MarkerPluginState>('marker-visibility')
  
  const plugin = new Plugin<MarkerPluginState>({
    key: markerPluginKey,
    state: {
      init(): MarkerPluginState {
        return { cursorPos: null }
      },
      apply(tr, value: MarkerPluginState): MarkerPluginState {
        const meta = tr.getMeta('cursorPosition')
        if (meta !== undefined) {
          return { cursorPos: meta }
        }
        // 如果文档变化，保持当前光标位置
        if (tr.docChanged && value.cursorPos !== null) {
          const newPos = tr.mapping.map(value.cursorPos)
          return { cursorPos: newPos }
        }
        return value
      }
    },
    props: {
      decorations: (state): DecorationSet => {
        const pluginState = markerPluginKey.getState(state)
        const cursorPos = pluginState?.cursorPos
        const decorations: Decoration[] = []
        
        if (cursorPos === null || cursorPos === undefined) {
          return DecorationSet.empty
        }
        
        const { doc } = state
        
        // 遍历文档中的所有标记符节点
        doc.descendants((node, pos) => {
          const nodeEnd = pos + node.nodeSize
          
          // 检查光标是否在这个节点内或附近
          const isNearCursor = cursorPos >= pos - 2 && cursorPos <= nodeEnd + 2
          
          if (!isNearCursor) {
            // 隐藏标记符 - 通过添加 decoration 来隐藏
            if (node.type.name === 'heading') {
              // 隐藏标题的 # 标记
              const level = node.attrs.level as number
              const markerText = '#'.repeat(level) + ' '
              decorations.push(
                Decoration.widget(pos, () => {
                  const span = document.createElement('span')
                  span.className = 'typora-marker typora-marker-hidden'
                  span.textContent = markerText
                  return span
                }, { side: -1 })
              )
            }
          } else {
            // 光标附近 - 显示标记符
            if (node.type.name === 'heading') {
              const level = node.attrs.level as number
              const markerText = '#'.repeat(level) + ' '
              decorations.push(
                Decoration.widget(pos, () => {
                  const span = document.createElement('span')
                  span.className = 'typora-marker typora-marker-visible'
                  span.textContent = markerText
                  return span
                }, { side: -1 })
              )
            }
          }
          
          // 处理行内标记符
          if (node.isText && node.text) {
            const text = node.text
            
            // 粗体 **text**
            const boldRegex = /\*\*([^*]+)\*\*/g
            let match: RegExpExecArray | null
            while ((match = boldRegex.exec(text)) !== null) {
              const matchStart = pos + match.index
              const matchEnd = matchStart + match[0].length
              const isCursorInRange = cursorPos !== null && cursorPos !== undefined && 
                cursorPos >= matchStart - 1 && cursorPos <= matchEnd + 1
              
              if (!isCursorInRange) {
                // 隐藏 ** 标记符
                decorations.push(
                  Decoration.inline(matchStart, matchStart + 2, {
                    class: 'typora-marker-hidden'
                  }),
                  Decoration.inline(matchEnd - 2, matchEnd, {
                    class: 'typora-marker-hidden'
                  })
                )
              }
            }
            
            // 斜体 *text* 或 _text_
            const italicRegex = /(?<!\*)\*([^*]+)\*(?!\*)|_([^_]+)_/g
            while ((match = italicRegex.exec(text)) !== null) {
              const matchStart = pos + match.index
              const matchEnd = matchStart + match[0].length
              const isCursorInRange = cursorPos !== null && cursorPos !== undefined && 
                cursorPos >= matchStart - 1 && cursorPos <= matchEnd + 1
              
              if (!isCursorInRange) {
                decorations.push(
                  Decoration.inline(matchStart, matchStart + 1, {
                    class: 'typora-marker-hidden'
                  }),
                  Decoration.inline(matchEnd - 1, matchEnd, {
                    class: 'typora-marker-hidden'
                  })
                )
              }
            }
            
            // 行内代码 `code`
            const codeRegex = /`([^`]+)`/g
            while ((match = codeRegex.exec(text)) !== null) {
              const matchStart = pos + match.index
              const matchEnd = matchStart + match[0].length
              const isCursorInRange = cursorPos !== null && cursorPos !== undefined && 
                cursorPos >= matchStart - 1 && cursorPos <= matchEnd + 1
              
              if (!isCursorInRange) {
                decorations.push(
                  Decoration.inline(matchStart, matchStart + 1, {
                    class: 'typora-marker-hidden'
                  }),
                  Decoration.inline(matchEnd - 1, matchEnd, {
                    class: 'typora-marker-hidden'
                  })
                )
              }
            }
            
            // 删除线 ~~text~~
            const strikeRegex = /~~([^~]+)~~/g
            while ((match = strikeRegex.exec(text)) !== null) {
              const matchStart = pos + match.index
              const matchEnd = matchStart + match[0].length
              const isCursorInRange = cursorPos !== null && cursorPos !== undefined && 
                cursorPos >= matchStart - 1 && cursorPos <= matchEnd + 1
              
              if (!isCursorInRange) {
                decorations.push(
                  Decoration.inline(matchStart, matchStart + 2, {
                    class: 'typora-marker-hidden'
                  }),
                  Decoration.inline(matchEnd - 2, matchEnd, {
                    class: 'typora-marker-hidden'
                  })
                )
              }
            }
          }
          
          return true
        })
        
        return DecorationSet.create(doc, decorations)
      },
      handleDOMEvents: {
        mousemove(view): boolean {
          const pos = view.state.selection.anchor
          view.dispatch(view.state.tr.setMeta('cursorPosition', pos))
          return false
        },
        keydown(view): boolean {
          const pos = view.state.selection.anchor
          view.dispatch(view.state.tr.setMeta('cursorPosition', pos))
          return false
        },
        click(view): boolean {
          const pos = view.state.selection.anchor
          view.dispatch(view.state.tr.setMeta('cursorPosition', pos))
          return false
        }
      }
    }
  })
  
  return plugin as unknown as AnyExtension
}

// 快捷键插件
const createShortcutsPlugin = (): AnyExtension => {
  const plugin = new Plugin({
    key: new PluginKey('shortcuts'),
    props: {
      handleKeyDown(view, event): boolean {
        // Ctrl/Cmd + B: 粗体
        if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
          event.preventDefault()
          const editorInstance = (view.dom.closest('.typora-tiptap-editor') as any)?.__vueParentComponent?.ctx?.editor as EditorType
          editorInstance?.chain().focus().toggleBold().run()
          return true
        }
        
        // Ctrl/Cmd + I: 斜体
        if ((event.ctrlKey || event.metaKey) && event.key === 'i') {
          event.preventDefault()
          const editorInstance = (view.dom.closest('.typora-tiptap-editor') as any)?.__vueParentComponent?.ctx?.editor as EditorType
          editorInstance?.chain().focus().toggleItalic().run()
          return true
        }
        
        // Ctrl/Cmd + K: 代码
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
          event.preventDefault()
          const editorInstance = (view.dom.closest('.typora-tiptap-editor') as any)?.__vueParentComponent?.ctx?.editor as EditorType
          editorInstance?.chain().focus().toggleCode().run()
          return true
        }
        
        return false
      }
    }
  })
  
  return plugin as unknown as AnyExtension
}

onMounted(() => {
  editor.value = new Editor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6]
        },
        codeBlock: false, // 使用 CodeBlockLowlight 替代
        link: false, // 使用独立的 Link 扩展
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'typora-table'
        }
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList.configure({
        HTMLAttributes: {
          class: 'typora-task-list'
        }
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'typora-task-item'
        }
      }),
      CustomImage.configure({
        HTMLAttributes: {
          class: 'typora-image'
        }
      }),
      Link.configure({
        openOnClick: false
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'typora-code-block'
        }
      }),
      Placeholder.configure({
        placeholder: props.placeholder || '开始输入...'
      }),
      // Markdown 扩展 - 使用 tiptap-markdown 处理双向转换
      Markdown.configure({
        html: true,                      // 允许 HTML 输入/输出
        tightLists: true,               // 紧凑列表，移除列表项内的 <p> 标签
        bulletListMarker: '-',          // 使用 - 作为无序列表标记
        linkify: false,                 // 禁用自动链接转换（由 Link 扩展处理）
        breaks: false,                  // 不按换行符创建 <br>
        transformPastedText: true,      // 粘贴时自动解析 Markdown
        transformCopiedText: false,     // 复制时不转换为 Markdown（保持 HTML）
      }),
      // 自定义插件
      createMarkerPlugin(),
      createShortcutsPlugin()
    ],
    content: props.modelValue || '',  // 直接传入 Markdown，由扩展自动解析
    editable: true,
    autofocus: false,
    onUpdate: ({ editor: e }) => {
      // 使用 tiptap-markdown 获取 Markdown 内容
      let markdown = (e.storage as any).markdown?.getMarkdown() || ''
      
      // 处理图片路径：将 mdimage:// 还原为相对路径
      markdown = markdown.replace(/!\[([^\]]*)\]\((mdimage:\/\/[^)]+)\)/g, (match: string, alt: string, src: string) => {
        let restoredSrc = restoreImagePath(src)
        // 如果是相对于当前文件的路径，则转换
        if (props.filePath && !restoredSrc.startsWith('http') && !restoredSrc.startsWith('data:')) {
          const baseDir = props.filePath.replace(/\\/g, '/').replace(/\/[^\/]+$/, '')
          if (restoredSrc.startsWith(baseDir + '/')) {
            restoredSrc = restoredSrc.substring(baseDir.length + 1)
          } else if (restoredSrc.startsWith(baseDir)) {
            restoredSrc = restoredSrc.substring(baseDir.length)
          }
        }
        return `![${alt}](${restoredSrc})`
      })
      
      // 修复块级元素之间的换行问题：确保图片和后续内容之间有换行符
      // 注意：tiptap-markdown 序列化时图片和后续内容直接连接没有换行符
      // 在图片后面添加换行符，但避免重复添加
      const beforeFix = markdown
      // 匹配图片后直接跟着非换行字符的情况，添加换行符
      markdown = markdown.replace(/(!\[[^\]]*\]\([^)]+\))(?=[^\n])/g, '$1\n')
      
      emit('update:modelValue', markdown)
      emit('change', markdown)
    },
    onFocus: () => {
      isFocused.value = true
    },
    onBlur: () => {
      isFocused.value = false
      // 失去焦点时隐藏所有标记符
      setTimeout(() => {
        editor.value?.chain().setMeta('cursorPosition', null).run()
      }, 200)
    }
  })
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})

// 监听外部值变化
watch(() => props.modelValue, (newValue) => {
  if (editor.value) {
    const currentMarkdown = (editor.value.storage as any).markdown?.getMarkdown() || ''
    if (newValue !== currentMarkdown) {
      // 直接设置 Markdown 内容，由扩展自动解析
      editor.value.commands.setContent(newValue || '')
    }
  }
})

// 简化的 Markdown 到 HTML 转换 - 用于源码视图预览
function markdownToHtml(markdown: string): string {
  if (!markdown) return ''
  
  let html = markdown
  
  // 分隔线
  html = html.replace(/^[\s]*---[\s]*$/gim, '<hr>')
  
  // 标题
  html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>')
  html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>')
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>')
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')
  
  // 粗体
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  
  // 斜体
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
  
  // 删除线
  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>')
  
  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  
  // 代码块
  html = html.replace(/```([\w-]*)\n?([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
  
  // 引用
  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
  
  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  
  // 图片
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
  
  // 无序列表
  html = html.replace(/^(\s*)[-*+] (.*$)/gim, '<li>$2</li>')
  
  // 有序列表
  html = html.replace(/^(\s*)\d+\. (.*$)/gim, '<li>$2</li>')
  
  // 段落
  const lines = html.split('\n')
  const result: string[] = []
  let inParagraph = false
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '') {
      if (inParagraph) {
        result.push('</p>')
        inParagraph = false
      }
    } else if (!trimmed.match(/^<(h\d|ul|ol|li|blockquote|pre|hr|table|p)/)) {
      if (!inParagraph) {
        result.push('<p>')
        inParagraph = true
      }
      result.push(trimmed)
    } else {
      if (inParagraph) {
        result.push('</p>')
        inParagraph = false
      }
      result.push(line)
    }
  }
  
  if (inParagraph) {
    result.push('</p>')
  }
  
  return result.join('\n')
}

// 工具栏操作
const insertHeading = (level: number) => {
  editor.value?.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run()
}

const toggleBold = () => {
  editor.value?.chain().focus().toggleBold().run()
}

const toggleItalic = () => {
  editor.value?.chain().focus().toggleItalic().run()
}

const toggleStrike = () => {
  editor.value?.chain().focus().toggleStrike().run()
}

const toggleCode = () => {
  editor.value?.chain().focus().toggleCode().run()
}

const toggleCodeBlock = () => {
  editor.value?.chain().focus().toggleCodeBlock().run()
}

const toggleBulletList = () => {
  editor.value?.chain().focus().toggleBulletList().run()
}

const toggleOrderedList = () => {
  editor.value?.chain().focus().toggleOrderedList().run()
}

const toggleTaskList = () => {
  editor.value?.chain().focus().toggleTaskList().run()
}

const toggleBlockquote = () => {
  editor.value?.chain().focus().toggleBlockquote().run()
}

const insertHorizontalRule = () => {
  editor.value?.chain().focus().setHorizontalRule().run()
}

const insertTable = () => {
  editor.value?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
}

const insertImage = () => {
  const url = prompt('输入图片 URL:')
  if (url) {
    editor.value?.chain().focus().setImage({ src: url }).run()
  }
}

const insertLink = () => {
  const url = prompt('输入链接 URL:')
  if (url) {
    editor.value?.chain().focus().setLink({ href: url }).run()
  }
}

const isActive = (name: string, attributes?: Record<string, any>) => {
  return computed(() => {
    if (!editor.value) return false
    return editor.value.isActive(name, attributes)
  }).value
}
</script>

<template>
  <div class="typora-tiptap-editor" :class="{ 'is-focused': isFocused }" :style="themeStyles">
    <!-- 工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-group">
        <button
          v-for="level in 3"
          :key="level"
          class="toolbar-btn"
          :class="{ active: isActive('heading', { level }) }"
          @click="insertHeading(level)"
          :title="'标题 ' + level"
        >
          H{{ level }}
        </button>
      </div>
      <div class="toolbar-divider"></div>
      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          :class="{ active: isActive('bold') }"
          @click="toggleBold"
          title="粗体 (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: isActive('italic') }"
          @click="toggleItalic"
          title="斜体 (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: isActive('strike') }"
          @click="toggleStrike"
          title="删除线"
        >
          <s>S</s>
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: isActive('code') }"
          @click="toggleCode"
          title="行内代码 (Ctrl+K)"
        >
          &#60;/&#62;
        </button>
      </div>
      <div class="toolbar-divider"></div>
      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          :class="{ active: isActive('bulletList') }"
          @click="toggleBulletList"
          title="无序列表"
        >
          • 列表
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: isActive('orderedList') }"
          @click="toggleOrderedList"
          title="有序列表"
        >
          1. 列表
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: isActive('taskList') }"
          @click="toggleTaskList"
          title="任务列表"
        >
          ☑ 任务
        </button>
      </div>
      <div class="toolbar-divider"></div>
      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          :class="{ active: isActive('codeBlock') }"
          @click="toggleCodeBlock"
          title="代码块"
        >
          { }
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: isActive('blockquote') }"
          @click="toggleBlockquote"
          title="引用"
        >
          "
        </button>
        <button
          class="toolbar-btn"
          @click="insertTable"
          title="插入表格"
        >
          表格
        </button>
        <button
          class="toolbar-btn"
          @click="insertHorizontalRule"
          title="分隔线"
        >
          —
        </button>
      </div>
      <div class="toolbar-divider"></div>
      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          @click="insertLink"
          title="插入链接"
        >
          链接
        </button>
        <button
          class="toolbar-btn"
          @click="insertImage"
          title="插入图片"
        >
          图片
        </button>
      </div>
      <div class="toolbar-divider"></div>
      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          :class="{ active: showSource }"
          @click="toggleSourceView"
          title="查看/编辑源码"
        >
          {{ showSource ? '返回' : '源码' }}
        </button>
      </div>
    </div>
    
    <!-- 编辑器内容 -->
    <div ref="editorContainer" class="editor-content">
      <!-- WYSIWYG 编辑器 -->
      <editor-content
        v-if="editor && !showSource"
        :editor="(editor as any)"
        class="tiptap-content"
      />
      
      <!-- 源码编辑器 -->
      <div v-if="showSource" class="source-editor">
        <textarea
          v-model="sourceContent"
          class="source-textarea"
          @input="syncSourceToEditor"
          placeholder="编辑 Markdown 源码..."
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.typora-tiptap-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color);
  border-radius: 8px;
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color-light);
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  gap: 2px;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--el-border-color);
  margin: 0 4px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: var(--el-text-color-regular);
  font-size: 13px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 28px;
  height: 28px;
}

.toolbar-btn:hover {
  background: var(--el-fill-color);
  color: var(--el-text-color-primary);
}

.toolbar-btn.active {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
}

.tiptap-content {
  max-width: 800px;
  margin: 0 auto;
  min-height: 100%;
}

.tiptap-content :deep(.ProseMirror) {
  background: var(--md-bg) !important;
  outline: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 16px;
  line-height: 1.8;
  color: var(--el-text-color-primary);
}

.tiptap-content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  color: var(--el-text-color-placeholder);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

/* 标题样式 - 使用 themeConfigs */
.tiptap-content :deep(.ProseMirror h1),
.tiptap-content :deep(.ProseMirror h2),
.tiptap-content :deep(.ProseMirror h3),
.tiptap-content :deep(.ProseMirror h4),
.tiptap-content :deep(.ProseMirror h5),
.tiptap-content :deep(.ProseMirror h6) {
  line-height: 1.4;
}

.tiptap-content :deep(.ProseMirror h1) {
  font-size: 2.75rem;
  font-weight: 900;
  margin: 2.5rem 0 1.5rem;
  padding: 1rem 0;
  background: var(--md-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.03em;
  line-height: 1.1;
  text-align: center;
  position: relative;
}

.tiptap-content :deep(.ProseMirror h1)::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 4px;
  background: var(--md-gradient);
  border-radius: 2px;
}

.tiptap-content :deep(.ProseMirror h2) {
  font-size: 2rem;
  font-weight: 800;
  margin: 2rem 0 1rem;
  padding: 0.75rem 0 0.75rem 1.25rem;
  color: var(--md-text);
  position: relative;
  letter-spacing: -0.02em;
}

.tiptap-content :deep(.ProseMirror h2)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 80%;
  background: var(--md-gradient);
  border-radius: 3px;
}

.tiptap-content :deep(.ProseMirror h3) {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 1.75rem 0 0.875rem;
  color: var(--md-primary);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.tiptap-content :deep(.ProseMirror h3)::before {
  content: '◆';
  font-size: 0.75rem;
  color: var(--md-primary);
  opacity: 0.8;
}

.tiptap-content :deep(.ProseMirror h4) {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 1.5rem 0 0.75rem;
  color: var(--md-secondary);
}

.tiptap-content :deep(.ProseMirror h5),
.tiptap-content :deep(.ProseMirror h6) {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 1.25rem 0 0.75rem;
  color: var(--md-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* 段落 */
.tiptap-content :deep(.ProseMirror p) {
  margin: 1.25rem 0;
  line-height: 1.9;
  font-size: 1.0625rem;
}

/* 粗体 */
.tiptap-content :deep(.ProseMirror strong) {
  color: var(--md-primary);
  font-weight: 700;
}

/* 斜体 */
.tiptap-content :deep(.ProseMirror em) {
  color: var(--md-secondary);
  font-style: italic;
}

/* 删除线 */
.tiptap-content :deep(.ProseMirror s) {
  text-decoration: line-through;
  opacity: 0.6;
  text-decoration-color: var(--md-primary);
}

/* 行内代码 */
.tiptap-content :deep(.ProseMirror code) {
  background: var(--md-code-bg);
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  color: var(--md-accent);
  font-family: var(--md-code-font);
  font-size: 0.9em;
  font-weight: 600;
  border: 1px solid var(--md-border);
}

/* 代码块 */
.tiptap-content :deep(.ProseMirror pre) {
  background: #1e1e2e;
  border-radius: 12px;
  padding: 0;
  margin: 1.5rem 0;
  overflow-x: auto;
  box-shadow: var(--md-shadow-strong);
  position: relative;
  border: 1px solid rgba(255,255,255,0.08);
}

.tiptap-content :deep(.ProseMirror pre)::before {
  content: '● ● ●';
  display: block;
  padding: 0.75rem 1rem;
  font-size: 0.75rem;
  color: #ff5f56;
  letter-spacing: 0.25em;
  background: linear-gradient(180deg, #2d2d3a 0%, #252532 100%);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px 12px 0 0;
  font-family: system-ui, sans-serif;
  text-shadow: 0 0 2px rgba(255,95,86,0.5);
}

.tiptap-content :deep(.ProseMirror pre code) {
  display: block;
  background: transparent;
  padding: 1.25rem;
  color: #abb2bf;
  font-size: 0.9rem;
  line-height: 1.8;
  overflow-x: auto;
  font-weight: 400;
  border: none;
}

/* 列表 */
.tiptap-content :deep(.ProseMirror ul),
.tiptap-content :deep(.ProseMirror ol) {
  margin: 1.25rem 0;
  padding-left: 1.75rem;
}

.tiptap-content :deep(.ProseMirror li) {
  margin: 0.625rem 0;
  line-height: 1.8;
}

.tiptap-content :deep(.ProseMirror li::marker) {
  color: var(--md-primary);
}

/* 嵌套列表 */
.tiptap-content :deep(.ProseMirror li > ul),
.tiptap-content :deep(.ProseMirror li > ol) {
  margin: 0.3em 0;
}

/* 任务列表 */
.tiptap-content :deep(.ProseMirror ul[data-type="taskList"]) {
  list-style: none;
  padding-left: 0;
}

.tiptap-content :deep(.ProseMirror ul[data-type="taskList"] li) {
  display: flex;
  align-items: flex-start;
  gap: 0.5em;
}

.tiptap-content :deep(.ProseMirror ul[data-type="taskList"] li > label) {
  flex-shrink: 0;
  margin-top: 0.3em;
}

.tiptap-content :deep(.ProseMirror ul[data-type="taskList"] li > div) {
  flex: 1;
}

/* 引用 */
.tiptap-content :deep(.ProseMirror blockquote) {
  background: var(--md-blockquote-bg);
  border: none;
  padding: 1.5rem 1.5rem 1.5rem 2rem;
  margin: 1.75rem 0;
  border-radius: 12px;
  box-shadow: var(--md-shadow);
  position: relative;
  overflow: hidden;
}

.tiptap-content :deep(.ProseMirror blockquote)::before {
  content: '"';
  position: absolute;
  top: 0.5rem;
  left: 1rem;
  font-size: 3rem;
  color: var(--md-primary);
  opacity: 0.2;
  font-family: Georgia, serif;
  line-height: 1;
}

.tiptap-content :deep(.ProseMirror blockquote)::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: var(--md-gradient);
}

.tiptap-content :deep(.ProseMirror blockquote p) {
  margin: 0.5rem 0;
  font-style: italic;
  font-size: 1.05rem;
}

/* 嵌套引用 */
.tiptap-content :deep(.ProseMirror blockquote blockquote) {
  margin: 8px 0;
}

/* 分隔线 */
.tiptap-content :deep(.ProseMirror hr) {
  border: none;
  height: 2px;
  background: var(--md-gradient);
  margin: 2.5rem 0;
  border-radius: 1px;
  opacity: 0.6;
}

/* 链接 */
.tiptap-content :deep(.ProseMirror a) {
  color: var(--md-primary);
  text-decoration: none;
  font-weight: 600;
  position: relative;
  padding-bottom: 2px;
  transition: color 0.3s ease;
}

.tiptap-content :deep(.ProseMirror a)::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--md-gradient);
  transition: width 0.3s ease;
  border-radius: 1px;
}

.tiptap-content :deep(.ProseMirror a:hover) {
  color: var(--md-secondary);
}

.tiptap-content :deep(.ProseMirror a:hover)::after {
  width: 100%;
}

/* 图片 */
.tiptap-content :deep(.ProseMirror img) {
  max-width: 100%;
  height: auto;
  border-radius: 12px;
  display: block;
  margin: 1.5rem auto;
  box-shadow: var(--md-shadow-strong);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.tiptap-content :deep(.ProseMirror img:hover) {
  transform: translateY(-2px);
  box-shadow: var(--md-shadow-strong), 0 0 0 4px color-mix(in srgb, var(--md-primary) 20%, transparent);
}

/* 表格 */
.tiptap-content :deep(.ProseMirror table) {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin: 1.5rem 0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--md-shadow);
  border: 1px solid var(--md-border);
}

.tiptap-content :deep(.ProseMirror thead) {
  background: var(--md-gradient);
}

.tiptap-content :deep(.ProseMirror th) {
  background: var(--md-gradient);
  color: white;
  padding: 1rem 1.25rem;
  font-weight: 600;
  text-align: left;
  font-size: 0.9375rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  border-right: 1px solid var(--md-border);  /* 添加右边框 */
}

.tiptap-content :deep(.ProseMirror td) {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--md-border);
  border-right: 1px solid var(--md-border);  /* 添加右边框 */
  transition: background-color 0.2s ease;
}

.tiptap-content :deep(.ProseMirror th:last-child),
.tiptap-content :deep(.ProseMirror td:last-child) {
  border-right: none;
}
.tiptap-content :deep(.ProseMirror th:first-child),
.tiptap-content :deep(.ProseMirror td:first-child) {
  border-left: none;
}
.tiptap-content :deep(.ProseMirror tr:last-child td) {
  border-bottom: none;
}

.tiptap-content :deep(.ProseMirror tr:hover td) {
  background: color-mix(in srgb, var(--md-text) 3%, transparent);
}

.tiptap-content :deep(.ProseMirror tbody tr:nth-child(even)) {
  background: color-mix(in srgb, var(--md-border) 30%, transparent);
}

/* 选中文本 */
.tiptap-content :deep(.ProseMirror ::selection) {
  background: color-mix(in srgb, var(--md-primary) 20%, transparent);
}

/* 光标 */
.tiptap-content :deep(.ProseMirror-focused .ProseMirror-cursor) {
  border-color: var(--md-primary);
}

/* 标记符样式 */
.typora-marker {
  color: var(--el-text-color-placeholder);
  font-weight: normal;
}

.typora-marker-visible {
  opacity: 1;
}

.typora-marker-hidden {
  opacity: 0.3;
}

/* 源码编辑器样式 */
.source-editor {
  flex: 1;
  padding: 24px 32px;
  overflow: hidden;
  background: var(--md-bg);
}

.source-textarea {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  resize: none;
  font-family: var(--md-code-font);
  font-size: 14px;
  line-height: 1.6;
  color: var(--md-text);
  background: var(--el-bg-color, #fff);
  padding: 24px;
  border-radius: 12px;
  box-shadow: var(--md-shadow);
}

.source-textarea::placeholder {
  color: var(--el-text-color-placeholder);
}

/* ========================================
   编辑器内容区域样式 - 基于 themeConfigs CSS 变量
   ======================================== */

.editor-content {
  background: var(--md-bg);
  transition: background 0.3s ease;
}

.editor-content .tiptap-content :deep(.ProseMirror) {
  background: var(--el-bg-color, #fff);
  border-radius: 12px;
  padding: 32px;
  box-shadow: var(--md-shadow);
  color: var(--md-text);
  font-family: var(--md-font);
}

/* 列表标记样式 */
.tiptap-content :deep(.ProseMirror ul > li::marker) {
  content: '▸ ';
  font-size: 1.2em;
  color: var(--md-primary);
}

.tiptap-content :deep(.ProseMirror ul ul > li::marker) {
  content: '▪ ';
  font-size: 1em;
}

.tiptap-content :deep(.ProseMirror ol > li::marker) {
  font-weight: 600;
  color: var(--md-primary);
}
</style>
