/**
 * 图片处理工具 - 用于处理 Markdown 中的图片路径
 */

// 处理 Markdown 内容中的图片路径
export const processImagePaths = (content: string, basePath: string): string => {
  if (!content || !basePath) {
    return content
  }

  // 匹配 Markdown 图片语法 ![alt](path)
  const mdImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
  // 匹配 HTML img 标签
  const htmlImgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi

  const baseDir = basePath.replace(/\\/g, '/').replace(/\/[^\/]+$/, '')

  // 处理 Markdown 图片
  content = content.replace(mdImageRegex, (match, alt, path) => {
    const resolvedPath = resolveImagePath(path, baseDir)
    return `![${alt}](${resolvedPath})`
  })

  // 处理 HTML 图片
  content = content.replace(htmlImgRegex, (match, path) => {
    const resolvedPath = resolveImagePath(path, baseDir)
    return match.replace(path, resolvedPath)
  })

  return content
}

// 解析图片路径
const resolveImagePath = (path: string, baseDir: string): string => {
  // 外部 URL 直接返回
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path
  }

  // 已经是 file:// 协议的返回
  if (path.startsWith('file://')) {
    return path
  }

  // Windows 绝对路径 (C:\path)
  if (/^[a-zA-Z]:[\\/]/.test(path)) {
    return 'file:///' + path.replace(/\\/g, '/')
  }

  // Unix 绝对路径
  if (path.startsWith('/')) {
    return 'file://' + path
  }

  // 相对路径
  const resolvedPath = baseDir + '/' + path.replace(/\\/g, '/')
  return 'file://' + resolvedPath
}

// 加载本地图片并转为 base64
export const loadLocalImage = async (imagePath: string): Promise<string | null> => {
  try {
    const cleanPath = imagePath.replace(/^file:\/\//, '')

    if (!window.electronAPI?.mdReadImage) {
      return null
    }

    const result = await window.electronAPI.mdReadImage(cleanPath)

    if (result.success && result.data) {
      return result.data
    }
    return null
  } catch {
    return null
  }
}

// 处理 HTML 中的图片标签
export const processHtmlImages = async (html: string): Promise<string> => {
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  const matches = Array.from(html.matchAll(imgRegex))

  let processedHtml = html

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const fullTag = match[0]
    const src = match[1]

    if (src.startsWith('file://')) {
      const base64 = await loadLocalImage(src)
      if (base64) {
        processedHtml = processedHtml.replace(fullTag, fullTag.replace(src, base64))
      }
    }
  }

  return processedHtml
}
