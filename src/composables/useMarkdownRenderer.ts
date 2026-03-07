import MarkdownIt from 'markdown-it'
import taskLists from 'markdown-it-task-lists'
import anchor from 'markdown-it-anchor'
import hljs from 'highlight.js'

// 主题配置 - 现代化设计风格
export const themeConfigs: Record<string, ThemeConfig> = {
  default: {
    name: '默认',
    bg: '#ffffff',
    text: '#1a1a2e',
    primary: '#4361ee',
    secondary: '#3f37c9',
    accent: '#4895ef',
    codeBg: '#f8f9fa',
    blockquoteBg: '#f0f4f8',
    borderColor: '#e2e8f0',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  chengxin: {
    name: '橙心',
    bg: '#fff5f0',
    text: '#2d1810',
    primary: '#ff6b35',
    secondary: '#f7931e',
    accent: '#ff9f43',
    codeBg: '#fff0e6',
    blockquoteBg: '#ffe8d6',
    borderColor: '#ffd4a3',
    gradient: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
    shadow: '0 4px 15px rgba(255, 107, 53, 0.2)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  chazi: {
    name: '姹紫',
    bg: '#faf5ff',
    text: '#2d1b4e',
    primary: '#9d4edd',
    secondary: '#7b2cbf',
    accent: '#c77dff',
    codeBg: '#f3e8ff',
    blockquoteBg: '#ede9fe',
    borderColor: '#ddd6fe',
    gradient: 'linear-gradient(135deg, #9d4edd 0%, #ff006e 100%)',
    shadow: '0 4px 15px rgba(157, 78, 221, 0.2)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  nenqing: {
    name: '嫩青',
    bg: '#f0fdf4',
    text: '#14532d',
    primary: '#10b981',
    secondary: '#059669',
    accent: '#34d399',
    codeBg: '#dcfce7',
    blockquoteBg: '#d1fae5',
    borderColor: '#a7f3d0',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    shadow: '0 4px 15px rgba(16, 185, 129, 0.2)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  lvyi: {
    name: '绿意',
    bg: '#f0fdf4',
    text: '#1a2e1a',
    primary: '#22c55e',
    secondary: '#16a34a',
    accent: '#4ade80',
    codeBg: '#dcfce7',
    blockquoteBg: '#f0fdf4',
    borderColor: '#86efac',
    gradient: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
    shadow: '0 4px 15px rgba(34, 197, 94, 0.2)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  hongfei: {
    name: '红绯',
    bg: '#fef2f2',
    text: '#450a0a',
    primary: '#ef4444',
    secondary: '#dc2626',
    accent: '#f87171',
    codeBg: '#fee2e2',
    blockquoteBg: '#fef2f2',
    borderColor: '#fecaca',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    shadow: '0 4px 15px rgba(239, 68, 68, 0.2)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  lanying: {
    name: '蓝莹',
    bg: '#f0f9ff',
    text: '#082f49',
    primary: '#0ea5e9',
    secondary: '#0284c7',
    accent: '#38bdf8',
    codeBg: '#e0f2fe',
    blockquoteBg: '#f0f9ff',
    borderColor: '#bae6fd',
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
    shadow: '0 4px 15px rgba(14, 165, 233, 0.2)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  lanqing: {
    name: '兰青',
    bg: '#ecfeff',
    text: '#083344',
    primary: '#06b6d4',
    secondary: '#0891b2',
    accent: '#22d3ee',
    codeBg: '#cffafe',
    blockquoteBg: '#ecfeff',
    borderColor: '#a5f3fc',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    shadow: '0 4px 15px rgba(6, 182, 212, 0.2)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  shanchui: {
    name: '山吹',
    bg: '#fffbeb',
    text: '#451a03',
    primary: '#f59e0b',
    secondary: '#d97706',
    accent: '#fbbf24',
    codeBg: '#fef3c7',
    blockquoteBg: '#fffbeb',
    borderColor: '#fde68a',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    shadow: '0 4px 15px rgba(245, 158, 11, 0.2)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  jikehei: {
    name: '极客黑',
    bg: '#0f172a',
    text: '#e2e8f0',
    primary: '#a855f7',
    secondary: '#c084fc',
    accent: '#22d3ee',
    codeBg: '#1e293b',
    blockquoteBg: '#1e293b',
    borderColor: '#334155',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #22d3ee 100%)',
    shadow: '0 4px 15px rgba(168, 85, 247, 0.3)',
    fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace'
  },
  github: {
    name: 'GitHub',
    bg: '#ffffff',
    text: '#24292f',
    primary: '#0969da',
    secondary: '#0550ae',
    accent: '#54aeff',
    codeBg: '#f6f8fa',
    blockquoteBg: '#f6f8fa',
    borderColor: '#d0d7de',
    gradient: 'linear-gradient(135deg, #0969da 0%, #54aeff 100%)',
    shadow: '0 1px 0 rgba(27,31,36,0.04)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  notion: {
    name: 'Notion',
    bg: '#ffffff',
    text: '#37352f',
    primary: '#000000',
    secondary: '#37352f',
    accent: '#fd7e14',
    codeBg: '#f5f5f5',
    blockquoteBg: '#f7f6f3',
    borderColor: '#e3e2e0',
    gradient: 'linear-gradient(135deg, #000000 0%, #37352f 100%)',
    shadow: 'rgba(15, 15, 15, 0.05) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 3px 6px',
    fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, sans-serif'
  },
  juejin: {
    name: '掘金',
    bg: '#ffffff',
    text: '#252933',
    primary: '#1e80ff',
    secondary: '#1171ee',
    accent: '#4da3ff',
    codeBg: '#f4f5f5',
    blockquoteBg: '#f7f8fa',
    borderColor: '#e4e6eb',
    gradient: 'linear-gradient(135deg, #1e80ff 0%, #4da3ff 100%)',
    shadow: '0 2px 8px rgba(30, 128, 255, 0.15)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  medium: {
    name: 'Medium',
    bg: '#ffffff',
    text: '#292929',
    primary: '#03a87c',
    secondary: '#029e74',
    accent: '#00ab6b',
    codeBg: '#f7f9f9',
    blockquoteBg: '#f7f9f9',
    borderColor: '#e5e5e5',
    gradient: 'linear-gradient(135deg, #03a87c 0%, #00ab6b 100%)',
    shadow: '0 1px 4px rgba(0,0,0,0.04)',
    fontFamily: 'medium-content-sans-serif-font, -apple-system, sans-serif'
  }
}

export interface ThemeConfig {
  name: string
  bg: string
  text: string
  primary: string
  secondary: string
  accent: string
  codeBg: string
  blockquoteBg: string
  borderColor: string
  gradient: string
  shadow: string
  fontFamily: string
}

// 解析图片路径为 mdimage:// 协议 URL
const resolveImageUrl = (src: string, basePath?: string): string => {
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('mdimage://')) {
    return src
  }

  let imagePath = src

  if (basePath) {
    const normalizedBasePath = basePath.replace(/\\/g, '/')
    const lastSlashIndex = normalizedBasePath.lastIndexOf('/')
    const baseDir = lastSlashIndex > 0 ? normalizedBasePath.substring(0, lastSlashIndex) : normalizedBasePath
    let cleanSrc = src.replace(/\\/g, '/')

    if (cleanSrc.startsWith('./')) {
      imagePath = baseDir + '/' + cleanSrc.substring(2)
    } else if (cleanSrc.startsWith('../')) {
      let targetDir = baseDir
      let remainingSrc = cleanSrc
      while (remainingSrc.startsWith('../')) {
        remainingSrc = remainingSrc.substring(3)
        const lastSlash = targetDir.lastIndexOf('/')
        targetDir = lastSlash > 0 ? targetDir.substring(0, lastSlash) : targetDir
      }
      imagePath = targetDir + '/' + remainingSrc
    } else if (!cleanSrc.startsWith('/') && !cleanSrc.match(/^[a-zA-Z]:/i)) {
      imagePath = baseDir + '/' + cleanSrc
    }
  }

  const normalizedPath = imagePath.replace(/\\/g, '/')
  return `mdimage://${encodeURIComponent(normalizedPath)}`
}

// 创建并配置 markdown-it 实例
const createMarkdownIt = (): MarkdownIt => {
  const md = new MarkdownIt({
    html: true,
    xhtmlOut: false,
    breaks: true,
    langPrefix: 'language-',
    linkify: true,
    typographer: true,
    highlight: (str, lang) => {
      let highlighted = str
      if (lang && hljs.getLanguage(lang)) {
        try {
          highlighted = hljs.highlight(str, { language: lang }).value
        } catch {
          highlighted = str
        }
      } else {
        try {
          highlighted = hljs.highlightAuto(str).value
        } catch {
          highlighted = str
        }
      }
      return `<pre class="hljs"><code class="hljs language-${lang || 'plaintext'}">${highlighted}</code></pre>\n`
    }
  })

  md.use(taskLists as any, { enabled: true, label: true, labelAfter: true })
  md.use(anchor as any, { permalink: false })

  return md
}

// 处理图片路径替换
const processImages = (html: string, basePath?: string): string => {
  if (!basePath) return html
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  return html.replace(imgRegex, (match, src) => {
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('mdimage://')) {
      return match
    }
    const resolvedUrl = resolveImageUrl(src, basePath)
    return match.replace(src, resolvedUrl)
  })
}

// 生成主题样式 CSS
export const generateThemeStyles = (theme: string, isInline = false): string => {
  const config = themeConfigs[theme] || themeConfigs.default
  const prefix = isInline ? '' : '.wysiwyg-editor '

  return `
    ${prefix} {
      background: ${config.bg};
      color: ${config.text};
      font-family: ${config.fontFamily};
    }
    ${prefix} h1 {
      font-size: 2.25rem;
      font-weight: 800;
      margin: 2rem 0 1.5rem;
      padding-bottom: 0.75rem;
      border-bottom: 3px solid ${config.primary};
      background: ${config.gradient};
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }
    ${prefix} h2 {
      font-size: 1.75rem;
      font-weight: 700;
      margin: 1.75rem 0 1rem;
      color: ${config.text};
      position: relative;
      padding-left: 1rem;
      border-left: 4px solid ${config.primary};
      letter-spacing: -0.01em;
    }
    ${prefix} h3 {
      font-size: 1.375rem;
      font-weight: 600;
      margin: 1.5rem 0 0.75rem;
      color: ${config.primary};
    }
    ${prefix} h4, ${prefix} h5, ${prefix} h6 {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 1.25rem 0 0.75rem;
      color: ${config.secondary};
    }
    ${prefix} p {
      margin: 1rem 0;
      line-height: 1.8;
      font-size: 1rem;
    }
    ${prefix} a {
      color: ${config.primary};
      text-decoration: none;
      border-bottom: 2px solid transparent;
      transition: border-color 0.2s, color 0.2s;
      font-weight: 500;
    }
    ${prefix} a:hover {
      border-bottom-color: ${config.primary};
    }
    ${prefix} ul, ${prefix} ol {
      padding-left: 1.75rem;
      margin: 1rem 0;
    }
    ${prefix} li {
      margin: 0.5rem 0;
      line-height: 1.7;
    }
    ${prefix} li::marker {
      color: ${config.primary};
    }
    ${prefix} code {
      background: ${config.codeBg};
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      color: ${config.primary};
      font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
      font-size: 0.875em;
      border: 1px solid ${config.borderColor};
    }
    ${prefix} pre {
      background: ${config.codeBg};
      border-radius: 12px;
      padding: 1.25rem;
      overflow-x: auto;
      margin: 1.25rem 0;
      border: 1px solid ${config.borderColor};
      box-shadow: ${config.shadow};
    }
    ${prefix} pre code {
      background: transparent;
      border: none;
      padding: 0;
      color: ${config.text};
    }
    ${prefix} blockquote {
      border-left: 4px solid ${config.primary};
      background: ${config.blockquoteBg};
      padding: 1rem 1.25rem;
      margin: 1.25rem 0;
      border-radius: 0 12px 12px 0;
      box-shadow: ${config.shadow};
      font-style: italic;
    }
    ${prefix} blockquote p {
      margin: 0.5rem 0;
    }
    ${prefix} hr {
      border: none;
      height: 2px;
      background: ${config.gradient};
      margin: 2rem 0;
      border-radius: 1px;
    }
    ${prefix} table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 1.5rem 0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: ${config.shadow};
      border: 1px solid ${config.borderColor};
    }
    ${prefix} th {
      background: ${config.gradient};
      color: white;
      padding: 0.875rem 1rem;
      font-weight: 600;
      text-align: left;
    }
    ${prefix} td {
      padding: 0.875rem 1rem;
      border-bottom: 1px solid ${config.borderColor};
      border-right: 1px solid ${config.borderColor};
    }
    ${prefix} tr:last-child td {
      border-bottom: none;
    }
    ${prefix} tr:nth-child(even) {
      background: ${config.codeBg};
    }
    ${prefix} img {
      max-width: 100%;
      border-radius: 12px;
      display: block;
      margin: 1.5rem auto;
      box-shadow: ${config.shadow};
    }
    ${prefix} .task-list-item {
      list-style: none;
      margin-left: -1.5rem;
    }
    ${prefix} .task-list-item input[type="checkbox"] {
      accent-color: ${config.primary};
      width: 1.1rem;
      height: 1.1rem;
      margin-right: 0.5rem;
      vertical-align: middle;
    }
  `.trim()
}

// 将渲染后的 HTML 添加主题样式（使用 style 属性）
const addThemeStyles = (html: string, theme: string = 'default'): string => {
  const config = themeConfigs[theme] || themeConfigs.default

  // 为每个元素添加内联样式
  let styledHtml = html
    .replace(/<h1>/g, `<h1 style="font-size:2.25rem;font-weight:800;margin:2rem 0 1.5rem;padding-bottom:0.75rem;border-bottom:3px solid ${config.primary};background:${config.gradient};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-0.02em;line-height:1.2;">`)
    .replace(/<h2>/g, `<h2 style="font-size:1.75rem;font-weight:700;margin:1.75rem 0 1rem;color:${config.text};padding-left:1rem;border-left:4px solid ${config.primary};letter-spacing:-0.01em;">`)
    .replace(/<h3>/g, `<h3 style="font-size:1.375rem;font-weight:600;margin:1.5rem 0 0.75rem;color:${config.primary};">`)
    .replace(/<h4>/g, `<h4 style="font-size:1.125rem;font-weight:600;margin:1.25rem 0 0.75rem;color:${config.secondary};">`)
    .replace(/<h5>/g, `<h5 style="font-size:1.125rem;font-weight:600;margin:1.25rem 0 0.75rem;color:${config.secondary};">`)
    .replace(/<h6>/g, `<h6 style="font-size:1.125rem;font-weight:600;margin:1.25rem 0 0.75rem;color:${config.secondary};">`)
    .replace(/<p>/g, `<p style="margin:1rem 0;line-height:1.8;font-size:1rem;color:${config.text};">`)
    .replace(/<a /g, `<a style="color:${config.primary};text-decoration:none;border-bottom:2px solid transparent;font-weight:500;" `)
    .replace(/<ul>/g, `<ul style="padding-left:1.75rem;margin:1rem 0;">`)
    .replace(/<ol>/g, `<ol style="padding-left:1.75rem;margin:1rem 0;">`)
    .replace(/<li>/g, `<li style="margin:0.5rem 0;line-height:1.7;color:${config.text};">`)
    .replace(/<code>/g, `<code style="background:${config.codeBg};padding:0.2rem 0.5rem;border-radius:6px;color:${config.primary};font-family:'JetBrains Mono','Fira Code',Consolas,monospace;font-size:0.875em;border:1px solid ${config.borderColor};">`)
    .replace(/<hr>/g, `<hr style="border:none;height:2px;background:${config.gradient};margin:2rem 0;border-radius:1px;" />`)
    .replace(/<blockquote>/g, `<blockquote style="border-left:4px solid ${config.primary};background:${config.blockquoteBg};padding:1rem 1.25rem;margin:1.25rem 0;border-radius:0 12px 12px 0;box-shadow:${config.shadow};font-style:italic;">`)
    .replace(/<pre>/g, `<pre style="background:${config.codeBg};border-radius:12px;padding:1.25rem;overflow-x:auto;margin:1.25rem 0;border:1px solid ${config.borderColor};box-shadow:${config.shadow};">`)
    .replace(/<table>/g, `<table style="width:100%;border-collapse:separate;border-spacing:0;margin:1.5rem 0;border-radius:12px;overflow:hidden;box-shadow:${config.shadow};border:1px solid ${config.borderColor};">`)
    .replace(/<th>/g, `<th style="background:${config.primary};color:white;padding:0.875rem 1rem;font-weight:600;text-align:left;">`)
    .replace(/<td>/g, `<td style="padding:0.875rem 1rem;border-bottom:1px solid ${config.borderColor};border-right:1px solid ${config.borderColor};color:${config.text};">`)

  // 包裹内容以应用背景色
  return `<div style="background:${config.bg};padding:2rem;font-family:${config.fontFamily};color:${config.text};">${styledHtml}</div>`
}

// 渲染 Markdown 为 HTML
export const renderMarkdown = (content: string, basePath?: string, theme: string = 'default'): string => {
  if (!content) return '<p><br></p>'

  try {
    const md = createMarkdownIt()
    let html = md.render(content)
    html = processImages(html, basePath)
    html = addThemeStyles(html, theme)
    return html
  } catch (error) {
    return `<p style="color:red;">渲染错误: ${error}</p>`
  }
}

// 生成微信公众号格式
export const generateWechatHtml = (content: string, basePath?: string, theme: string = 'default'): string => {
  const html = renderMarkdown(content, basePath, theme)
  return html
}

// 复制到剪贴板
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textarea)
    return success
  }
}

// 复制 HTML 到剪贴板（富文本）
export const copyHtmlToClipboard = async (html: string): Promise<boolean> => {
  try {
    const blob = new Blob([html], { type: 'text/html' })
    const clipboardItem = new ClipboardItem({ 'text/html': blob })
    await navigator.clipboard.write([clipboardItem])
    return true
  } catch {
    return copyToClipboard(html)
  }
}
