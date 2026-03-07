import { ref, computed, nextTick, watch, type Ref } from 'vue'
import { renderMarkdown, themeConfigs, generateThemeStyles } from '../../../composables/useMarkdownRenderer'
import hljs from 'highlight.js'
import type { EditorMode, PreviewTheme, OutlineItem, EditorState } from './types'

export interface UseMdEditorOptions {
  content: Ref<string>
  filePath: Ref<string | undefined>
  mode: Ref<EditorMode>
  theme: Ref<PreviewTheme>
  autoSave: Ref<boolean>
  onSave?: () => void
  onChange?: (value: string) => void
}

/**
 * Markdown 编辑器逻辑封装
 */
export function useMdEditor(options: UseMdEditorOptions) {
  const { content, filePath, mode, theme, autoSave, onSave, onChange } = options

  // DOM 引用
  const wysiwygEditorRef = ref<HTMLElement>()

  // 编辑器状态
  const state: EditorState = {
    isComposing: false,
    isUpdating: false,
    autoSaveTimer: null
  }

  // ==================== 计算属性 ====================

  /** 当前主题样式 */
  const currentThemeStyle = computed(() => {
    const config = themeConfigs[theme.value] || themeConfigs.default
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
      '--theme-gradient-sec': config.gradientSecondary,
      '--theme-shadow': config.shadow,
      '--theme-shadow-strong': config.shadowStrong,
      '--theme-font': config.fontFamily,
      '--theme-code-font': config.codeFontFamily,
    }
  })

  /** 大纲数据 */
  const outline = computed<OutlineItem[]>(() => {
    const items: OutlineItem[] = []
    const lines = content.value.replace(/\r\n/g, '\n').split('\n')
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

  // ==================== 方法 ====================

  /**
   * 更新 WYSIWYG 编辑器内容
   */
  const updateWysiwygContent = () => {
    if (wysiwygEditorRef.value && !state.isUpdating) {
      const html = renderMarkdown(content.value, filePath.value || '', theme.value)
      // 注入主题样式
      const styles = generateThemeStyles(theme.value)
      const styledHtml = `<style>${styles}</style>${html}`
      wysiwygEditorRef.value.innerHTML = styledHtml
      // 代码高亮
      nextTick(() => {
        highlightCodeBlocks()
      })
    }
  }

  /**
   * 代码块高亮 - 只处理未高亮的代码块，避免覆盖样式
   */
  const highlightCodeBlocks = () => {
    if (!wysiwygEditorRef.value) return
    const blocks = wysiwygEditorRef.value.querySelectorAll('pre code:not(.hljs-highlighted)')
    blocks.forEach((block) => {
      const element = block as HTMLElement
      const langClass = Array.from(element.classList).find(c => c.startsWith('language-'))
      const lang = langClass ? langClass.replace('language-', '') : ''
      
      try {
        let result
        if (lang && lang !== 'plaintext' && hljs.getLanguage(lang)) {
          result = hljs.highlight(element.textContent || '', { language: lang })
        } else {
          result = hljs.highlightAuto(element.textContent || '')
        }
        element.innerHTML = result.value
        element.classList.add('hljs', 'hljs-highlighted')
      } catch (e) {
        console.warn('Code highlight failed:', e)
      }
    })
  }

  /**
   * 处理 WYSIWYG 输入
   */
  const handleWysiwygInput = () => {
    if (state.isComposing || !wysiwygEditorRef.value) return

    state.isUpdating = true
    const html = wysiwygEditorRef.value.innerHTML
    const markdown = htmlToMarkdown(html)
    content.value = markdown
    state.isUpdating = false

    onChange?.(markdown)

    // 自动保存
    if (autoSave.value) {
      if (state.autoSaveTimer) clearTimeout(state.autoSaveTimer)
      state.autoSaveTimer = setTimeout(() => {
        onSave?.()
      }, 2000)
    }
  }

  /**
   * 处理快捷键
   */
  const handleWysiwygKeydown = (e: KeyboardEvent) => {
    // Ctrl/Cmd + B: 粗体
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault()
      document.execCommand('bold')
      handleWysiwygInput()
    }
    // Ctrl/Cmd + I: 斜体
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault()
      document.execCommand('italic')
      handleWysiwygInput()
    }
    // Ctrl/Cmd + K: 链接
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      const url = prompt('请输入链接地址:', 'https://')
      if (url) {
        document.execCommand('createLink', false, url)
        handleWysiwygInput()
      }
    }
    // Ctrl/Cmd + S: 保存
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      onSave?.()
    }
  }

  /**
   * 处理粘贴事件
   */
  const handleWysiwygPaste = (e: ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData?.getData('text/plain') || ''
    document.execCommand('insertText', false, text)
    handleWysiwygInput()
  }

  /**
   * HTML 转 Markdown
   */
  const htmlToMarkdown = (html: string): string => {
    const temp = document.createElement('div')
    temp.innerHTML = html

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
        case 'pre': {
          const codeBlock = element.querySelector('code')
          if (codeBlock) {
            const lang = codeBlock.className.match(/language-(\w+)/)?.[1] || ''
            return '```' + lang + '\n' + codeBlock.textContent + '\n```\n\n'
          }
          return '```\n' + children + '\n```\n\n'
        }
        case 'blockquote':
          return '> ' + children.replace(/\n/g, '\n> ') + '\n\n'
        case 'a': {
          const href = element.getAttribute('href') || ''
          return '[' + children + '](' + href + ')'
        }
        case 'img': {
          const src = element.getAttribute('src') || ''
          const alt = element.getAttribute('alt') || ''
          return '![' + alt + '](' + src + ')'
        }
        case 'ul':
          return Array.from(element.children).map(li => '- ' + convertNode(li)).join('\n') + '\n\n'
        case 'ol':
          return Array.from(element.children).map((li, i) => (i + 1) + '. ' + convertNode(li)).join('\n') + '\n\n'
        case 'li':
        case 'div':
          return children
        default:
          return children
      }
    }

    const markdown = Array.from(temp.childNodes).map(convertNode).join('')
    return markdown.replace(/\n{3,}/g, '\n\n').trim()
  }

  /**
   * 跳转到指定行
   */
  const scrollToLine = (lineNumber: number) => {
    if (mode.value === 'wysiwyg' && wysiwygEditorRef.value) {
      const headings = Array.from(wysiwygEditorRef.value.querySelectorAll('h1, h2, h3, h4, h5, h6')) as HTMLElement[]
      const outlineItem = outline.value.find(item => item.line === lineNumber)
      if (outlineItem) {
        const targetHeading = headings.find(h => h.textContent?.trim() === outlineItem.text)
        if (targetHeading) {
          targetHeading.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
        const lineHeight = 22.4
        sourceEditor.scrollTop = (lineNumber - 1) * lineHeight - sourceEditor.clientHeight / 2
        const pos = content.value.split('\n').slice(0, lineNumber - 1).join('\n').length + (lineNumber > 1 ? 1 : 0)
        sourceEditor.setSelectionRange(pos, pos)
        sourceEditor.focus()
      }
    }
  }

  /**
   * 插入内容到编辑器
   */
  const insertContent = (text: string) => {
    if (mode.value === 'wysiwyg' && wysiwygEditorRef.value) {
      document.execCommand('insertText', false, text)
      handleWysiwygInput()
    } else {
      // 源码模式
      const sourceEditor = document.querySelector('.source-editor') as HTMLTextAreaElement
      if (sourceEditor) {
        const start = sourceEditor.selectionStart
        const end = sourceEditor.selectionEnd
        const value = content.value
        content.value = value.substring(0, start) + text + value.substring(end)
        nextTick(() => {
          const newPos = start + text.length
          sourceEditor.setSelectionRange(newPos, newPos)
          sourceEditor.focus()
        })
      }
    }
  }

  /**
   * 获取当前选中的文本
   */
  const getSelectedText = (): string => {
    if (mode.value === 'wysiwyg' && wysiwygEditorRef.value) {
      const selection = window.getSelection()
      return selection?.toString() || ''
    } else {
      const sourceEditor = document.querySelector('.source-editor') as HTMLTextAreaElement
      if (sourceEditor) {
        const start = sourceEditor.selectionStart
        const end = sourceEditor.selectionEnd
        return content.value.substring(start, end)
      }
    }
    return ''
  }

  /**
   * 设置编辑器焦点
   */
  const focus = () => {
    nextTick(() => {
      if (mode.value === 'wysiwyg' && wysiwygEditorRef.value) {
        wysiwygEditorRef.value.focus()
      } else {
        const sourceEditor = document.querySelector('.source-editor') as HTMLTextAreaElement
        sourceEditor?.focus()
      }
    })
  }

  // ==================== 监听 ====================

  // 监听主题变化，自动更新预览
  watch(theme, () => {
    if (mode.value === 'wysiwyg' && wysiwygEditorRef.value) {
      updateWysiwygContent()
    }
  })

  // 监听模式变化
  watch(mode, (newMode) => {
    if (newMode === 'wysiwyg') {
      nextTick(() => {
        updateWysiwygContent()
      })
    }
  })

  // 监听文件内容变化（从外部）
  watch(() => content.value, (newValue, oldValue) => {
    if (!state.isUpdating && mode.value === 'wysiwyg' && wysiwygEditorRef.value) {
      const html = renderMarkdown(newValue, filePath.value || '', theme.value)
      if (wysiwygEditorRef.value.innerHTML !== html) {
        wysiwygEditorRef.value.innerHTML = html
        highlightCodeBlocks()
      }
    }
  })

  return {
    // refs
    wysiwygEditorRef,
    state,
    // computed
    currentThemeStyle,
    outline,
    // methods
    updateWysiwygContent,
    highlightCodeBlocks,
    handleWysiwygInput,
    handleWysiwygKeydown,
    handleWysiwygPaste,
    htmlToMarkdown,
    scrollToLine,
    insertContent,
    getSelectedText,
    focus
  }
}
