import MarkdownIt from 'markdown-it'
import taskLists from 'markdown-it-task-lists'
import anchor from 'markdown-it-anchor'
import hljs from 'highlight.js'

// ==================== 主题配置 - 现代化高冲击力设计 ====================

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
  gradientSecondary: string
  shadow: string
  shadowStrong: string
  fontFamily: string
  codeFontFamily: string
  isDark: boolean
}

// 现代化主题配置
export const themeConfigs: Record<string, ThemeConfig> = {
  // ===== 浅色主题 =====
  default: {
    name: '极光蓝',
    bg: '#fafbfd',
    text: '#1a1f36',
    primary: '#4f46e5',
    secondary: '#7c3aed',
    accent: '#06b6d4',
    codeBg: '#1e1e2e',
    blockquoteBg: 'linear-gradient(135deg, #f0f7ff 0%, #f8f0ff 100%)',
    borderColor: '#e2e8f0',
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #06b6d4 100%)',
    gradientSecondary: 'linear-gradient(90deg, #4f46e5 0%, #06b6d4 100%)',
    shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    shadowStrong: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    codeFontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
    isDark: false
  },

  github: {
    name: 'GitHub Pro',
    bg: '#ffffff',
    text: '#1f2328',
    primary: '#0969da',
    secondary: '#0550ae',
    accent: '#54aeff',
    codeBg: '#1e1e2e',
    blockquoteBg: '#f6f8fa',
    borderColor: '#d0d7de',
    gradient: 'linear-gradient(135deg, #0969da 0%, #54aeff 100%)',
    gradientSecondary: 'linear-gradient(90deg, #0969da 0%, #54aeff 100%)',
    shadow: '0 1px 0 rgba(27,31,36,0.04)',
    shadowStrong: '0 8px 24px rgba(27,31,36,0.12)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    codeFontFamily: '"SF Mono", Consolas, monospace',
    isDark: false
  },

  notion: {
    name: 'Notion',
    bg: '#ffffff',
    text: '#37352f',
    primary: '#000000',
    secondary: '#37352f',
    accent: '#fd7e14',
    codeBg: '#1e1e2e',
    blockquoteBg: '#f7f6f3',
    borderColor: '#e3e2e0',
    gradient: 'linear-gradient(135deg, #000000 0%, #37352f 100%)',
    gradientSecondary: 'linear-gradient(90deg, #000000 0%, #666666 100%)',
    shadow: 'rgba(15, 15, 15, 0.05) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 3px 6px',
    shadowStrong: 'rgba(15, 15, 15, 0.1) 0px 10px 30px',
    fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, sans-serif',
    codeFontFamily: '"SF Mono", monospace',
    isDark: false
  },

  medium: {
    name: 'Medium',
    bg: '#ffffff',
    text: '#292929',
    primary: '#03a87c',
    secondary: '#029e74',
    accent: '#00ab6b',
    codeBg: '#1e1e2e',
    blockquoteBg: '#f7f9f9',
    borderColor: '#e5e5e5',
    gradient: 'linear-gradient(135deg, #03a87c 0%, #00ab6b 100%)',
    gradientSecondary: 'linear-gradient(90deg, #03a87c 0%, #00ab6b 100%)',
    shadow: '0 1px 4px rgba(0,0,0,0.04)',
    shadowStrong: '0 8px 24px rgba(0,0,0,0.08)',
    fontFamily: 'medium-content-sans-serif-font, -apple-system, sans-serif',
    codeFontFamily: '"Fira Code", monospace',
    isDark: false
  },

  juejin: {
    name: '掘金',
    bg: '#ffffff',
    text: '#252933',
    primary: '#1e80ff',
    secondary: '#1171ee',
    accent: '#4da3ff',
    codeBg: '#1e1e2e',
    blockquoteBg: '#f7f8fa',
    borderColor: '#e4e6eb',
    gradient: 'linear-gradient(135deg, #1e80ff 0%, #4da3ff 100%)',
    gradientSecondary: 'linear-gradient(90deg, #1e80ff 0%, #4da3ff 100%)',
    shadow: '0 2px 8px rgba(30, 128, 255, 0.15)',
    shadowStrong: '0 12px 32px rgba(30, 128, 255, 0.2)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    codeFontFamily: '"SF Mono", Consolas, monospace',
    isDark: false
  },

  // ===== 彩色主题 =====
  neon: {
    name: '霓虹幻彩',
    bg: '#0a0a0f',
    text: '#e2e8f0',
    primary: '#f472b6',
    secondary: '#a78bfa',
    accent: '#22d3ee',
    codeBg: '#1e1e2e',
    blockquoteBg: 'linear-gradient(135deg, rgba(244,114,182,0.1) 0%, rgba(167,139,250,0.1) 100%)',
    borderColor: 'rgba(244,114,182,0.3)',
    gradient: 'linear-gradient(135deg, #f472b6 0%, #a78bfa 50%, #22d3ee 100%)',
    gradientSecondary: 'linear-gradient(90deg, #f472b6 0%, #22d3ee 100%)',
    shadow: '0 0 20px rgba(244,114,182,0.3)',
    shadowStrong: '0 0 40px rgba(244,114,182,0.4)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    codeFontFamily: '"JetBrains Mono", "Fira Code", monospace',
    isDark: true
  },

  sunset: {
    name: '落日余晖',
    bg: '#fff7ed',
    text: '#431407',
    primary: '#f97316',
    secondary: '#ea580c',
    accent: '#fbbf24',
    codeBg: '#1e1e2e',
    blockquoteBg: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
    borderColor: '#fdba74',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #fbbf24 100%)',
    gradientSecondary: 'linear-gradient(90deg, #f97316 0%, #fbbf24 100%)',
    shadow: '0 4px 15px rgba(249, 115, 22, 0.25)',
    shadowStrong: '0 20px 40px rgba(249, 115, 22, 0.3)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    codeFontFamily: '"JetBrains Mono", monospace',
    isDark: false
  },

  ocean: {
    name: '深海静谧',
    bg: '#f0f9ff',
    text: '#0c4a6e',
    primary: '#0284c7',
    secondary: '#0369a1',
    accent: '#22d3ee',
    codeBg: '#1e1e2e',
    blockquoteBg: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)',
    borderColor: '#7dd3fc',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #22d3ee 100%)',
    gradientSecondary: 'linear-gradient(90deg, #0284c7 0%, #22d3ee 100%)',
    shadow: '0 4px 15px rgba(2, 132, 199, 0.25)',
    shadowStrong: '0 20px 40px rgba(2, 132, 199, 0.3)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    codeFontFamily: '"JetBrains Mono", monospace',
    isDark: false
  },

  forest: {
    name: '森林秘境',
    bg: '#f0fdf4',
    text: '#14532d',
    primary: '#16a34a',
    secondary: '#15803d',
    accent: '#4ade80',
    codeBg: '#1e1e2e',
    blockquoteBg: 'linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)',
    borderColor: '#86efac',
    gradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 50%, #4ade80 100%)',
    gradientSecondary: 'linear-gradient(90deg, #16a34a 0%, #4ade80 100%)',
    shadow: '0 4px 15px rgba(22, 163, 74, 0.25)',
    shadowStrong: '0 20px 40px rgba(22, 163, 74, 0.3)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    codeFontFamily: '"JetBrains Mono", monospace',
    isDark: false
  },

  berry: {
    name: '浆果风暴',
    bg: '#fdf2f8',
    text: '#831843',
    primary: '#db2777',
    secondary: '#be185d',
    accent: '#f472b6',
    codeBg: '#1e1e2e',
    blockquoteBg: 'linear-gradient(135deg, #fce7f3 0%, #fdf2f8 100%)',
    borderColor: '#f9a8d4',
    gradient: 'linear-gradient(135deg, #db2777 0%, #be185d 50%, #f472b6 100%)',
    gradientSecondary: 'linear-gradient(90deg, #db2777 0%, #f472b6 100%)',
    shadow: '0 4px 15px rgba(219, 39, 119, 0.25)',
    shadowStrong: '0 20px 40px rgba(219, 39, 119, 0.3)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    codeFontFamily: '"JetBrains Mono", monospace',
    isDark: false
  },

  // ===== 深色主题 =====
  dark: {
    name: '极夜黑',
    bg: '#0f172a',
    text: '#e2e8f0',
    primary: '#818cf8',
    secondary: '#a78bfa',
    accent: '#22d3ee',
    codeBg: '#1e1e2e',
    blockquoteBg: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    borderColor: '#334155',
    gradient: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 50%, #22d3ee 100%)',
    gradientSecondary: 'linear-gradient(90deg, #818cf8 0%, #22d3ee 100%)',
    shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
    shadowStrong: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    codeFontFamily: '"JetBrains Mono", "Fira Code", monospace',
    isDark: true
  },

  midnight: {
    name: '午夜蓝',
    bg: '#020617',
    text: '#cbd5e1',
    primary: '#3b82f6',
    secondary: '#6366f1',
    accent: '#0ea5e9',
    codeBg: '#0f172a',
    blockquoteBg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    borderColor: '#1e293b',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #0ea5e9 100%)',
    gradientSecondary: 'linear-gradient(90deg, #3b82f6 0%, #0ea5e9 100%)',
    shadow: '0 4px 20px rgba(59, 130, 246, 0.2)',
    shadowStrong: '0 20px 50px rgba(59, 130, 246, 0.3)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    codeFontFamily: '"JetBrains Mono", "Fira Code", monospace',
    isDark: true
  },

  dracula: {
    name: 'Dracula',
    bg: '#282a36',
    text: '#f8f8f2',
    primary: '#ff79c6',
    secondary: '#bd93f9',
    accent: '#8be9fd',
    codeBg: '#44475a',
    blockquoteBg: 'linear-gradient(135deg, #44475a 0%, #383a52 100%)',
    borderColor: '#6272a4',
    gradient: 'linear-gradient(135deg, #ff79c6 0%, #bd93f9 50%, #8be9fd 100%)',
    gradientSecondary: 'linear-gradient(90deg, #ff79c6 0%, #8be9fd 100%)',
    shadow: '0 4px 15px rgba(189, 147, 249, 0.2)',
    shadowStrong: '0 20px 40px rgba(189, 147, 249, 0.3)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    codeFontFamily: '"Fira Code", monospace',
    isDark: true
  },

  // ===== 特殊主题 =====
  wechat: {
    name: '微信公众号',
    bg: '#ffffff',
    text: '#333333',
    primary: '#07c160',
    secondary: '#00a650',
    accent: '#07c160',
    codeBg: '#1e1e2e',
    blockquoteBg: '#f7f7f7',
    borderColor: '#e5e5e5',
    gradient: 'linear-gradient(135deg, #07c160 0%, #00c853 100%)',
    gradientSecondary: 'linear-gradient(90deg, #07c160 0%, #00c853 100%)',
    shadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    shadowStrong: '0 8px 24px rgba(0, 0, 0, 0.12)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    codeFontFamily: '"SF Mono", Consolas, monospace',
    isDark: false
  },

  paper: {
    name: '纸张质感',
    bg: '#fdfbf7',
    text: '#2d2a2e',
    primary: '#d97706',
    secondary: '#b45309',
    accent: '#f59e0b',
    codeBg: '#1e1e2e',
    blockquoteBg: 'linear-gradient(135deg, #f5f0e8 0%, #faf7f2 100%)',
    borderColor: '#d6ccc2',
    gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    gradientSecondary: 'linear-gradient(90deg, #d97706 0%, #f59e0b 100%)',
    shadow: '0 2px 4px rgba(0,0,0,0.05)',
    shadowStrong: '0 12px 24px rgba(0,0,0,0.1)',
    fontFamily: 'Georgia, "Times New Roman", serif',
    codeFontFamily: '"JetBrains Mono", monospace',
    isDark: false
  }
}

// 获取所有主题列表
export const getThemeList = (): { value: string; label: string }[] => {
  return Object.entries(themeConfigs).map(([key, config]) => ({
    value: key,
    label: config.name
  }))
}

// ==================== Markdown-it 配置 ====================

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

// 缓存 markdown-it 实例，避免重复创建
let cachedMd: MarkdownIt | null = null

// 创建并配置 markdown-it 实例
const createMarkdownIt = (): MarkdownIt => {
  // 如果已有缓存实例，直接返回
  if (cachedMd) {
    return cachedMd
  }

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
      }
      // 移除 highlightAuto 调用，大幅提升性能
      // 未指定语言的代码块保持原样，避免昂贵的自动检测
      return `<pre class="hljs"><code class="hljs language-${lang || 'plaintext'}">${highlighted}</code></pre>\n`
    }
  })

  md.use(taskLists as any, { enabled: true, label: true, labelAfter: true })
  md.use(anchor as any, { permalink: false })

  // 缓存实例
  cachedMd = md
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

// ==================== 样式生成器 ====================

// 生成 CSS 变量
const generateCSSVariables = (config: ThemeConfig): string => {
  return `
    --md-bg: ${config.bg};
    --md-text: ${config.text};
    --md-primary: ${config.primary};
    --md-secondary: ${config.secondary};
    --md-accent: ${config.accent};
    --md-code-bg: ${config.codeBg};
    --md-blockquote-bg: ${config.blockquoteBg};
    --md-border: ${config.borderColor};
    --md-gradient: ${config.gradient};
    --md-gradient-sec: ${config.gradientSecondary};
    --md-shadow: ${config.shadow};
    --md-shadow-strong: ${config.shadowStrong};
    --md-font: ${config.fontFamily};
    --md-code-font: ${config.codeFontFamily};
  `.trim()
}

// 生成主题样式 CSS（用于组件内样式）
export const generateThemeStyles = (theme: string, prefix: string = '.wysiwyg-editor '): string => {
  const config = themeConfigs[theme] || themeConfigs.default

  return `
${prefix} {
  ${generateCSSVariables(config)}
  background: ${config.bg};
  color: ${config.text};
  font-family: ${config.fontFamily};
}

/* ========== 标题样式 - 高冲击力 ========== */
${prefix} h1 {
  font-size: 2.75rem;
  font-weight: 900;
  margin: 2.5rem 0 1.5rem;
  padding: 1rem 0;
  background: ${config.gradient};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.03em;
  line-height: 1.1;
  text-align: center;
  position: relative;
}

${prefix} h1::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 4px;
  background: ${config.gradient};
  border-radius: 2px;
}

${prefix} h2 {
  font-size: 2rem;
  font-weight: 800;
  margin: 2rem 0 1rem;
  padding: 0.75rem 0 0.75rem 1.25rem;
  color: ${config.text};
  position: relative;
  letter-spacing: -0.02em;
}

${prefix} h2::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 80%;
  background: ${config.gradient};
  border-radius: 3px;
}

${prefix} h3 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 1.75rem 0 0.875rem;
  color: ${config.primary};
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

${prefix} h3::before {
  content: '◆';
  font-size: 0.75rem;
  color: ${config.primary};
  opacity: 0.8;
}

${prefix} h4 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 1.5rem 0 0.75rem;
  color: ${config.secondary};
}

${prefix} h5, ${prefix} h6 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 1.25rem 0 0.75rem;
  color: ${config.secondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ========== 段落和文本 ========== */
${prefix} p {
  margin: 1.25rem 0;
  line-height: 1.9;
  font-size: 1.0625rem;
}

${prefix} strong {
  color: ${config.primary};
  font-weight: 700;
}

${prefix} em {
  color: ${config.secondary};
  font-style: italic;
}

/* ========== 链接 - 3D 悬停效果 ========== */
${prefix} a {
  color: ${config.primary};
  text-decoration: none;
  font-weight: 600;
  position: relative;
  padding-bottom: 2px;
  transition: color 0.3s ease;
}

${prefix} a::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background: ${config.gradient};
  transition: width 0.3s ease;
  border-radius: 1px;
}

${prefix} a:hover {
  color: ${config.secondary};
}

${prefix} a:hover::after {
  width: 100%;
}

/* ========== 列表 - 现代样式 ========== */
${prefix} ul, ${prefix} ol {
  padding-left: 1.75rem;
  margin: 1.25rem 0;
}

${prefix} li {
  margin: 0.625rem 0;
  line-height: 1.8;
  position: relative;
}

${prefix} li::marker {
  color: ${config.primary};
}

${prefix} ul > li::marker {
  content: '▸ ';
  font-size: 1.2em;
}

${prefix} ul ul > li::marker {
  content: '▪ ';
  font-size: 1em;
}

${prefix} ol > li::marker {
  font-weight: 600;
  color: ${config.primary};
}

/* ========== 代码块 - Mac 窗口风格 高对比度 ========== */
${prefix} code {
  background: ${config.codeBg} !important ;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  color: ${config.isDark ? '#22d3ee' : '#0369a1'};
  font-family: ${config.codeFontFamily};
  font-size: 0.9em;
  font-weight: 600;
  border: 1px solid ${config.isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0'};
}

${prefix} pre {
  background: #1e1e2e;
  border-radius: 12px;
  padding: 0;
  overflow-x: auto;
  margin: 1.5rem 0;
  box-shadow: ${config.shadowStrong};
  position: relative;
  border: 1px solid rgba(255,255,255,0.08);
}

${prefix} pre::before {
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

${prefix} pre code {
  display: block;
  background: transparent;
  padding: 1.25rem;
  color: #abb2bf;
  font-size: 0.9rem;
  line-height: 1.8;
  overflow-x: auto;
  font-weight: 400;
}

/* Atom One Dark 语法高亮样式 */
${prefix} .hljs {
  background: transparent;
  color: #abb2bf;
}

${prefix} .hljs-keyword,
${prefix} .hljs-selector-tag,
${prefix} .hljs-literal,
${prefix} .hljs-section,
${prefix} .hljs-link {
  color: #c678dd;
  font-weight: 600;
}

${prefix} .hljs-function .hljs-keyword {
  color: #c678dd;
}

${prefix} .hljs-string,
${prefix} .hljs-title,
${prefix} .hljs-name,
${prefix} .hljs-type,
${prefix} .hljs-attribute,
${prefix} .hljs-symbol,
${prefix} .hljs-bullet,
${prefix} .hljs-addition,
${prefix} .hljs-variable,
${prefix} .hljs-template-tag,
${prefix} .hljs-template-variable {
  color: #98c379;
}

${prefix} .hljs-comment,
${prefix} .hljs-quote,
${prefix} .hljs-deletion,
${prefix} .hljs-meta {
  color: #5c6370;
  font-style: italic;
}

${prefix} .hljs-number,
${prefix} .hljs-regexp,
${prefix} .hljs-literal,
${prefix} .hljs-params,
${prefix} .hljs-constant {
  color: #d19a66;
  font-weight: 600;
}

${prefix} .hljs-class .hljs-title,
${prefix} .hljs-function .hljs-title {
  color: #61afef;
  font-weight: 600;
}

${prefix} .hljs-tag,
${prefix} .hljs-tag .hljs-name {
  color: #e06c75;
}

${prefix} .hljs-tag .hljs-attr {
  color: #d19a66;
}

${prefix} .hljs-tag .hljs-string {
  color: #98c379;
}

${prefix} .hljs-built_in,
${prefix} .hljs-builtin-name {
  color: #e6c07b;
  font-weight: 600;
}

${prefix} .hljs-operator,
${prefix} .hljs-punctuation {
  color: #56b6c2;
}

${prefix} .hljs-property {
  color: #61afef;
}

/* ========== 引用块 - 渐变边框卡片 ========== */
${prefix} blockquote {
  background: ${config.blockquoteBg};
  border: none;
  padding: 1.5rem 1.5rem 1.5rem 2rem;
  margin: 1.75rem 0;
  border-radius: 12px;
  box-shadow: ${config.shadow};
  position: relative;
  overflow: hidden;
}

${prefix} blockquote::before {
  content: '"';
  position: absolute;
  top: 0.5rem;
  left: 1rem;
  font-size: 3rem;
  color: ${config.primary};
  opacity: 0.2;
  font-family: Georgia, serif;
  line-height: 1;
}

${prefix} blockquote::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: ${config.gradient};
}

${prefix} blockquote p {
  margin: 0.5rem 0;
  font-style: italic;
  font-size: 1.05rem;
}

${prefix} blockquote p:first-child {
  margin-top: 0;
}

${prefix} blockquote p:last-child {
  margin-bottom: 0;
}

/* ========== 分隔线 - 渐变 ========== */
${prefix} hr {
  border: none;
  height: 2px;
  background: ${config.gradient};
  margin: 2.5rem 0;
  border-radius: 1px;
  opacity: 0.6;
}

/* ========== 表格 - 现代卡片风格 ========== */
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

${prefix} thead {
  background: ${config.gradient};
}

${prefix} th {
  color: white;
  padding: 1rem 1.25rem;
  font-weight: 600;
  text-align: left;
  font-size: 0.9375rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

${prefix} td {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid ${config.borderColor};
  transition: background-color 0.2s ease;
}

${prefix} tr:last-child td {
  border-bottom: none;
}

${prefix} tr:hover td {
  background: ${config.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
}

${prefix} tbody tr:nth-child(even) {
  background: ${config.isDark ? 'rgba(255,255,255,0.02)' : config.borderColor};
}

/* ========== 图片 - 圆角阴影 ========== */
${prefix} img {
  max-width: 100%;
  height: auto;
  border-radius: 12px;
  display: block;
  margin: 1.5rem auto;
  box-shadow: ${config.shadowStrong};
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

${prefix} img:hover {
  transform: translateY(-2px);
  box-shadow: ${config.shadowStrong}, 0 0 0 4px ${config.primary}20;
}

/* ========== 任务列表 ========== */
${prefix} .task-list-item {
  list-style: none;
  margin-left: -1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

${prefix} .task-list-item input[type="checkbox"] {
  width: 1.25rem;
  height: 1.25rem;
  accent-color: ${config.primary};
  cursor: pointer;
}

/* ========== 标记文本 ========== */
${prefix} mark {
  background: ${config.gradientSecondary};
  color: white;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-weight: 600;
}

/* ========== 删除线 ========== */
${prefix} del {
  opacity: 0.6;
  text-decoration-color: ${config.primary};
}

/* ========== 上标/下标 ========== */
${prefix} sup, ${prefix} sub {
  color: ${config.primary};
  font-weight: 600;
}
  `.trim()
}

// ==================== 内联样式生成（用于公众号复制）====================

// 生成带样式的 HTML（使用 style 属性，兼容性更好）
export const generateStyledHtml = (html: string, theme: string = 'default'): string => {
  const config = themeConfigs[theme] || themeConfigs.default
  const isDark = config.isDark

  // 为每个元素添加内联样式
  let styledHtml = html
    // H1: 大标题带渐变文字效果
    .replace(/<h1[^>]*>/g, `<h1 style="
      font-size:2.75rem;
      font-weight:900;
      margin:2.5rem 0 1.5rem;
      padding:1rem 0;
      background:${config.gradient};
      -webkit-background-clip:text;
      -webkit-text-fill-color:transparent;
      background-clip:text;
      letter-spacing:-0.03em;
      line-height:1.1;
      text-align:center;
      position:relative;
      display:block;
    ">`)
    .replace(/<\/h1>/g, '</h1>')

    // H2: 左侧强调线
    .replace(/<h2[^>]*>/g, `<h2 style="
      font-size:2rem;
      font-weight:800;
      margin:2rem 0 1rem;
      padding:0.75rem 0 0.75rem 1.25rem;
      color:${config.text};
      position:relative;
      letter-spacing:-0.02em;
      border-left:6px solid ${config.primary};
    ">`)

    // H3: 带装饰
    .replace(/<h3[^>]*>/g, `<h3 style="
      font-size:1.5rem;
      font-weight:700;
      margin:1.75rem 0 0.875rem;
      color:${config.primary};
    ">`)

    // H4-H6
    .replace(/<h4[^>]*>/g, `<h4 style="
      font-size:1.25rem;
      font-weight:700;
      margin:1.5rem 0 0.75rem;
      color:${config.secondary};
    ">`)
    .replace(/<h5[^>]*>/g, `<h5 style="
      font-size:1.125rem;
      font-weight:600;
      margin:1.25rem 0 0.75rem;
      color:${config.secondary};
      text-transform:uppercase;
      letter-spacing:0.05em;
    ">`)
    .replace(/<h6[^>]*>/g, `<h6 style="
      font-size:1rem;
      font-weight:600;
      margin:1rem 0 0.5rem;
      color:${config.secondary};
      text-transform:uppercase;
      letter-spacing:0.05em;
    ">`)

    // 段落
    .replace(/<p[^>]*>/g, `<p style="
      margin:1.25rem 0;
      line-height:1.9;
      font-size:1.0625rem;
      color:${config.text};
    ">`)

    // 加粗
    .replace(/<strong>/g, `<strong style="color:${config.primary};font-weight:700;">`)
    .replace(/<b>/g, `<b style="color:${config.primary};font-weight:700;">`)

    // 斜体
    .replace(/<em>/g, `<em style="color:${config.secondary};font-style:italic;">`)
    .replace(/<i>/g, `<i style="color:${config.secondary};font-style:italic;">`)

    // 链接
    .replace(/<a /g, `<a style="
      color:${config.primary};
      text-decoration:none;
      font-weight:600;
      border-bottom:2px solid ${config.primary}40;
      transition:all 0.3s ease;
    " `)

    // 列表
    .replace(/<ul>/g, `<ul style="
      padding-left:1.75rem;
      margin:1.25rem 0;
      list-style:none;
    ">`)
    .replace(/<ol>/g, `<ol style="
      padding-left:1.75rem;
      margin:1.25rem 0;
    ">`)
    .replace(/<li>/g, `<li style="
      margin:0.625rem 0;
      line-height:1.8;
      color:${config.text};
    ">`)

    // 行内代码（只匹配没有 class 属性的 code 标签，避免影响代码块）
    .replace(/<code(?![^>]*class=)[^>]*>/g, `<code style="
      background:${isDark ? '#1e293b' : '#f1f5f9'};
      padding:0.25rem 0.5rem;
      border-radius:6px;
      color:${config.accent};
      font-family:'SF Mono', Consolas, monospace;
      font-size:0.9em;
      font-weight:500;
    ">`)

    // 代码块（匹配带 class 的 pre 标签）
    .replace(/<pre[^>]*>/g, `<pre style="
      background:${config.codeBg};
      border-radius:12px;
      padding:1.25rem;
      overflow-x:auto;
      margin:1.5rem 0;
      box-shadow:0 8px 24px rgba(0,0,0,0.2);
    ">`)

    // 引用块
    .replace(/<blockquote>/g, `<blockquote style="
      background:${config.blockquoteBg};
      padding:1.5rem 1.5rem 1.5rem 2rem;
      margin:1.75rem 0;
      border-radius:12px;
      border-left:4px solid ${config.primary};
      box-shadow:0 4px 6px rgba(0,0,0,0.05);
    ">`)

    // 分隔线
    .replace(/<hr>/g, `<hr style="
      border:none;
      height:2px;
      background:${config.gradient};
      margin:2.5rem 0;
      border-radius:1px;
      opacity:0.6;
    " />`)

    // 表格
    .replace(/<table>/g, `<table style="
      width:100%;
      border-collapse:separate;
      border-spacing:0;
      margin:1.5rem 0;
      border-radius:12px;
      overflow:hidden;
      box-shadow:0 4px 6px rgba(0,0,0,0.1);
      border:1px solid ${config.borderColor};
    ">`)
    .replace(/<th>/g, `<th style="
      background:${config.gradient};
      color:white;
      padding:1rem 1.25rem;
      font-weight:600;
      text-align:left;
      font-size:0.9375rem;
    ">`)
    .replace(/<td>/g, `<td style="
      padding:1rem 1.25rem;
      border-bottom:1px solid ${config.borderColor};
      color:${config.text};
    ">`)

    // 图片
    .replace(/<img/g, `<img style="
      max-width:100%;
      height:auto;
      border-radius:12px;
      display:block;
      margin:1.5rem auto;
      box-shadow:0 8px 24px rgba(0,0,0,0.15);
    "`)

  // 包裹内容以应用背景色和字体
  return `<div style="
    background:${config.bg};
    color:${config.text};
    font-family:${config.fontFamily};
    padding:2rem;
    font-size:16px;
    line-height:1.8;
  ">${styledHtml}</div>`
}

// ==================== 渲染函数 ====================

// 渲染 Markdown 为 HTML
export const renderMarkdown = (content: string, basePath?: string, theme: string = 'default'): string => {
  if (!content) return '<p><br></p>'

  try {
    const md = createMarkdownIt()
    let html = md.render(content)
    html = processImages(html, basePath)
    return html
  } catch (error) {
    return `<p style="color:red;">渲染错误: ${error}</p>`
  }
}

// 生成微信公众号格式（用于预览，使用 CSS 类）
export const generateWechatHtmlForPreview = (content: string, basePath?: string, theme: string = 'default'): string => {
  const html = renderMarkdown(content, basePath, theme)
  const styles = generateThemeStyles(theme, '.wechat-content ')
  return `<style>${styles}</style>${html}`
}

// 生成微信公众号格式（用于复制，使用内联样式）
export const generateWechatHtml = (content: string, basePath?: string, theme: string = 'default'): string => {
  const html = renderMarkdown(content, basePath, theme)
  return generateStyledHtml(html, theme)
}

// ==================== 工具函数 ====================

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
