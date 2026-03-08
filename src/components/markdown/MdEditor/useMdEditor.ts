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
  onSave?: (isManual?: boolean) => void
  onChange?: (value: string) => void
}

/**
 * Markdown 编辑器逻辑封装 - Typora 风格实时预览
 *
 * 核心架构：
 * - 编辑器直接使用 contenteditable 显示 HTML
 * - 但用户实际编辑的是 Markdown 纯文本
 * - 当检测到 Markdown 语法时，在光标位置实时转换为样式
 * - 通过 textContent 获取完整 Markdown 内容同步到数据源
 */
export function useMdEditor(options: UseMdEditorOptions) {
  const { content, filePath, mode, theme, autoSave, onSave, onChange } = options

  const wrappedOnSave = (isManual?: boolean) => {
    onSave?.(isManual ?? false)
  }

  const wysiwygEditorRef = ref<HTMLElement>()

  const state: EditorState = {
    isComposing: false,
    isUpdating: false,
    autoSaveTimer: null
  }

  // ==================== 计算属性 ====================

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

  // ==================== 核心方法 ====================

  /**
   * 更新 WYSIWYG 编辑器内容 - 完整重新渲染
   * 用于初始加载、切换主题等场景
   */
  const updateWysiwygContent = () => {
    if (wysiwygEditorRef.value && !state.isUpdating) {
      const html = renderMarkdown(content.value, filePath.value || '', theme.value)
      wysiwygEditorRef.value.innerHTML = html
      updateEditorStyles(theme.value)
      nextTick(() => {
        highlightCodeBlocks()
      })
    }
  }

  const updateEditorStyles = (themeValue: PreviewTheme) => {
    let styleEl = document.getElementById('wysiwyg-dynamic-styles')
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'wysiwyg-dynamic-styles'
      wysiwygEditorRef.value?.parentElement?.insertBefore(styleEl, wysiwygEditorRef.value)
    }
    styleEl.textContent = generateThemeStyles(themeValue)
  }

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

  // ==================== 光标位置管理 ====================

  /**
   * 保存光标在块级元素内的偏移
   */
  const saveCaretOffsetInBlock = (block: HTMLElement): number => {
    const selection = window.getSelection()
    if (!selection || !selection.rangeCount) return 0

    const range = selection.getRangeAt(0)
    const preCaretRange = range.cloneRange()
    preCaretRange.selectNodeContents(block)
    preCaretRange.setEnd(range.endContainer, range.endOffset)

    return preCaretRange.toString().length
  }

  /**
   * 在块级元素内恢复光标位置
   */
  const restoreCaretInBlock = (block: HTMLElement, targetOffset: number): void => {
    const selection = window.getSelection()
    if (!selection) return

    let currentOffset = 0
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)

    let node
    while (node = walker.nextNode()) {
      const nodeLength = node.textContent?.length || 0
      if (currentOffset + nodeLength >= targetOffset) {
        const range = document.createRange()
        range.setStart(node, Math.min(targetOffset - currentOffset, nodeLength))
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
        return
      }
      currentOffset += nodeLength
    }

    // 如果找不到，放在块末尾
    const range = document.createRange()
    range.selectNodeContents(block)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  // ==================== 行内 Markdown 实时转换 ====================

  /**
   * 检测并转换 Markdown 语法（包括块级和行内）
   * 支持标题、粗体、斜体、删除线、行内代码
   */
  const processMarkdown = (text: string): { html: string; isBlock: boolean; tag?: string } => {
    // 先转义 HTML 特殊字符
    let html = text
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')

    // 检查是否是标题 (# ## ### 等)
    const headingMatch = text.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const content = headingMatch[2]
      // 处理标题内容中的行内语法
      const processedContent = processInlineElements(content)
      return {
        html: processedContent,
        isBlock: true,
        tag: `h${level}`
      }
    }

    // 处理行内语法
    html = processInlineElements(html)

    return { html, isBlock: false }
  }

  /**
   * 处理行内 Markdown 语法
   */
  const processInlineElements = (text: string): string => {
    let html = text

    // 粗体 (**text** 或 __text__)
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')

    // 斜体 (*text* 或 _text_)
    // 使用简单正则，避免复杂的后行断言兼容性 issues
    html = html.replace(/(?<![*_])\*(?![*_])([^*]+)(?<![*_])\*(?![*_])/g, '<em>$1</em>')
    html = html.replace(/(?<![*_])_(?![*_])([^_]+)(?<![*_])_(?![*_])/g, '<em>$1</em>')

    // 删除线 (~~text~~)
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>')

    // 行内代码 (`code`)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

    return html
  }

  /**
   * 检查文本是否包含 Markdown 语法
   */
  const hasMarkdownSyntax = (text: string): boolean => {
    return /^(#{1,6})\s|(\*\*.+?\*\*)|(__.+?__)|(\*.+?\*)|(_.+?_)|(~~.+?~~)|(`[^`]+`)/.test(text)
  }

  // ==================== 编辑处理 ====================

  /**
   * 触发自动保存
   */
  const triggerAutoSave = () => {
    if (autoSave.value) {
      if (state.autoSaveTimer) clearTimeout(state.autoSaveTimer)
      state.autoSaveTimer = setTimeout(() => {
        wrappedOnSave(false)
      }, 2000)
    }
  }

  /**
   * 触发保存
   */
  const triggerSave = () => {
    if (state.autoSaveTimer) {
      clearTimeout(state.autoSaveTimer)
      state.autoSaveTimer = null
    }
    wrappedOnSave(true)
  }

  /**
   * 从编辑器获取 Markdown 内容
   * 将 HTML 结构转换回 Markdown 格式
   */
  const getMarkdownFromEditor = (): string => {
    if (!wysiwygEditorRef.value) return ''

    const editor = wysiwygEditorRef.value
    const blocks: string[] = []

    // 遍历所有子元素，将每个块转换为 Markdown
    editor.childNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement
        const md = blockElementToMarkdown(element)
        if (md) blocks.push(md)
      } else if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim()
        if (text) blocks.push(text)
      }
    })

    return blocks.join('\n\n')
  }

  /**
   * 将块级元素转换为 Markdown
   */
  const blockElementToMarkdown = (element: HTMLElement): string => {
    const tagName = element.tagName.toLowerCase()
    const text = element.textContent || ''

    switch (tagName) {
      case 'h1': return '# ' + text
      case 'h2': return '## ' + text
      case 'h3': return '### ' + text
      case 'h4': return '#### ' + text
      case 'h5': return '##### ' + text
      case 'h6': return '###### ' + text
      case 'blockquote':
        return text.split('\n').map(line => '> ' + line).join('\n')
      case 'pre': {
        const code = element.querySelector('code')
        if (code) {
          const lang = code.className.match(/language-(\w+)/)?.[1] || ''
          return '```' + lang + '\n' + code.textContent + '\n```'
        }
        return '```\n' + text + '\n```'
      }
      case 'ul':
        return Array.from(element.querySelectorAll('li')).map(li => '- ' + li.textContent).join('\n')
      case 'ol':
        return Array.from(element.querySelectorAll('li')).map((li, i) => `${i + 1}. ${li.textContent}`).join('\n')
      case 'hr':
        return '---'
      case 'p':
      case 'div':
      default:
        // 处理行内样式
        return inlineElementsToMarkdown(element)
    }
  }

  /**
   * 将行内元素转换回 Markdown
   */
  const inlineElementsToMarkdown = (element: HTMLElement): string => {
    let result = ''

    element.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        const tagName = el.tagName.toLowerCase()
        const content = el.textContent || ''

        switch (tagName) {
          case 'strong':
          case 'b':
            result += '**' + content + '**'
            break
          case 'em':
          case 'i':
            result += '*' + content + '*'
            break
          case 'del':
          case 's':
            result += '~~' + content + '~~'
            break
          case 'code':
            result += '`' + content + '`'
            break
          case 'a':
            const href = el.getAttribute('href') || ''
            result += '[' + content + '](' + href + ')'
            break
          default:
            result += content
        }
      }
    })

    return result
  }

  /**
   * 处理 WYSIWYG 输入 - Typora 风格实时预览
   *
   * 核心逻辑：
   * 1. 找到光标所在的块级元素
   * 2. 如果是纯文本且包含 Markdown 语法，转换为带样式的 HTML
   * 3. 通过 textContent 获取完整 Markdown 内容，同步到数据源
   */
  const handleWysiwygInput = () => {
    if (state.isComposing || !wysiwygEditorRef.value) return

    const editor = wysiwygEditorRef.value
    const selection = window.getSelection()
    if (!selection || !selection.rangeCount) return

    // 找到当前光标所在的块级元素
    let currentBlock: HTMLElement | null = null
    let node = selection.getRangeAt(0).startContainer as Node

    while (node && node !== editor) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = (node as HTMLElement).tagName
        if (['P', 'DIV', 'LI', 'BLOCKQUOTE'].includes(tagName)) {
          currentBlock = node as HTMLElement
          break
        }
      }
      node = node.parentNode!
    }

    // 如果在代码块内，不做行内转换
    if (currentBlock?.closest('pre')) {
      syncMarkdownToDataSource()
      return
    }

    // 处理当前块的 Markdown 语法转换
    if (currentBlock && currentBlock.childNodes.length === 1 &&
        currentBlock.childNodes[0].nodeType === Node.TEXT_NODE) {
      const text = currentBlock.textContent || ''

      // 检查是否包含 Markdown 语法
      if (hasMarkdownSyntax(text)) {
        // 保存光标偏移
        const offset = saveCaretOffsetInBlock(currentBlock)

        // 转换 Markdown 为 HTML
        const { html, isBlock, tag } = processMarkdown(text)

        if (isBlock && tag) {
          // 创建新的块级元素（如 h1, h2 等）
          const newElement = document.createElement(tag)
          newElement.innerHTML = html
          currentBlock.replaceWith(newElement)
          // 将光标放在新元素末尾
          const range = document.createRange()
          range.selectNodeContents(newElement)
          range.collapse(false)
          selection.removeAllRanges()
          selection.addRange(range)
        } else {
          // 普通行内转换
          currentBlock.innerHTML = html
          // 恢复光标位置
          restoreCaretInBlock(currentBlock, offset)
        }
      }
    }

    // 同步 Markdown 到数据源（通过 textContent）
    syncMarkdownToDataSource()
  }

  /**
   * 同步编辑器内容到数据源
   * 使用 textContent 获取原始 Markdown
   */
  const syncMarkdownToDataSource = () => {
    const markdown = getMarkdownFromEditor()

    // 只有当内容真正有变化时才更新
    if (markdown !== content.value) {
      // 标记为内部更新，防止触发重新渲染
      state.isUpdating = true

      // 更新数据源
      content.value = markdown
      onChange?.(markdown)

      // 触发自动保存
      triggerAutoSave()

      // 重置标志
      nextTick(() => {
        state.isUpdating = false
      })
    }
  }

  /**
   * 处理回车键
   */
  const handleEnterKey = () => {
    if (!wysiwygEditorRef.value) return

    const selection = window.getSelection()
    if (!selection || !selection.rangeCount) return

    const range = selection.getRangeAt(0)
    let currentNode = range.startContainer

    // 找到当前段落
    while (currentNode && currentNode !== wysiwygEditorRef.value) {
      if (currentNode.nodeType === Node.ELEMENT_NODE) {
        const tagName = (currentNode as HTMLElement).tagName
        if (['DIV', 'P', 'BLOCKQUOTE', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tagName)) {
          break
        }
      }
      currentNode = currentNode.parentNode!
    }

    if (!currentNode || currentNode === wysiwygEditorRef.value) {
      document.execCommand('insertParagraph')
      syncMarkdownToDataSource()
      return
    }

    const element = currentNode as HTMLElement
    const text = element.textContent || ''

    // 检查是否需要延续格式
    const isBlockquote = element.tagName === 'BLOCKQUOTE' || element.closest('blockquote')
    const isListItem = element.tagName === 'LI'
    const isEmpty = text.trim() === '' || text.trim() === '>' || text.trim().match(/^[-*]$/) || text.trim().match(/^\d+\.$/)

    if (isEmpty && (isBlockquote || isListItem)) {
      document.execCommand('outdent')
    } else if (isBlockquote) {
      document.execCommand('insertParagraph')
      setTimeout(() => {
        const newSelection = window.getSelection()
        if (newSelection) {
          const newRange = newSelection.getRangeAt(0)
          const newNode = newRange.startContainer
          if (newNode.nodeType === Node.TEXT_NODE) {
            const textNode = newNode as Text
            if (!textNode.textContent?.startsWith('>')) {
              textNode.textContent = '> ' + (textNode.textContent || '')
            }
          }
        }
      }, 0)
    } else if (isListItem) {
      document.execCommand('insertParagraph')
    } else {
      document.execCommand('insertParagraph')
    }

    // 同步到数据源
    setTimeout(() => {
      syncMarkdownToDataSource()
    }, 0)
  }

  /**
   * 处理快捷键
   */
  const handleWysiwygKeydown = (e: KeyboardEvent) => {
    // 回车键处理
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      handleEnterKey()
      return
    }

    // Tab 键处理
    if (e.key === 'Tab') {
      e.preventDefault()
      document.execCommand('insertText', false, '  ')
      syncMarkdownToDataSource()
      return
    }

    // Ctrl/Cmd + B: 粗体
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault()
      const selection = window.getSelection()
      if (selection && !selection.isCollapsed) {
        const selectedText = selection.toString()
        document.execCommand('insertText', false, `**${selectedText}**`)
        handleWysiwygInput() // 触发转换
      }
    }

    // Ctrl/Cmd + I: 斜体
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault()
      const selection = window.getSelection()
      if (selection && !selection.isCollapsed) {
        const selectedText = selection.toString()
        document.execCommand('insertText', false, `*${selectedText}*`)
        handleWysiwygInput() // 触发转换
      }
    }

    // Ctrl/Cmd + K: 链接
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      const selection = window.getSelection()
      if (selection) {
        const selectedText = selection.toString() || '链接文字'
        const url = prompt('请输入链接地址:', 'https://')
        if (url) {
          document.execCommand('insertText', false, `[${selectedText}](${url})`)
          handleWysiwygInput()
        }
      }
    }

    // Ctrl/Cmd + S: 保存
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      triggerSave()
    }
  }

  /**
   * 处理粘贴事件
   */
  const handleWysiwygPaste = (e: ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData?.getData('text/plain') || ''
    document.execCommand('insertText', false, text)
    syncMarkdownToDataSource()
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
   * 插入内容
   */
  const insertContent = (text: string) => {
    if (mode.value === 'wysiwyg' && wysiwygEditorRef.value) {
      document.execCommand('insertText', false, text)
      syncMarkdownToDataSource()
    } else {
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
   * 获取选中文本
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
   * 设置焦点
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

  // 初始加载和外部内容变化
  watch(() => content.value, (newVal, oldVal) => {
    if (!state.isUpdating && mode.value === 'wysiwyg' && newVal !== oldVal) {
      nextTick(() => {
        updateWysiwygContent()
      })
    }
  }, { immediate: true })

  // 文件路径变化
  watch(() => filePath.value, (newPath) => {
    if (newPath && mode.value === 'wysiwyg') {
      nextTick(() => {
        updateWysiwygContent()
      })
    }
  })

  // 主题变化 - 重新渲染
  watch(theme, () => {
    if (mode.value === 'wysiwyg' && wysiwygEditorRef.value) {
      updateWysiwygContent()
    }
  })

  // 模式变化
  watch(mode, (newMode) => {
    if (newMode === 'wysiwyg') {
      nextTick(() => {
        updateWysiwygContent()
      })
    }
  })

  return {
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
    scrollToLine,
    insertContent,
    getSelectedText,
    focus
  }
}
