/**
 * Markdown 编辑器类型定义
 */

/** 编辑器模式 */
export type EditorMode = 'wysiwyg' | 'source'

/** 预览主题 - 现代化高冲击力主题 */
export type PreviewTheme =
  // 推荐主题
  | 'default'      // 极光蓝
  | 'neon'         // 霓虹幻彩
  | 'sunset'       // 落日余晖
  | 'ocean'        // 深海静谧
  | 'berry'        // 浆果风暴
  | 'forest'       // 森林秘境
  // 平台风格
  | 'github'       // GitHub Pro
  | 'notion'       // Notion
  | 'medium'       // Medium
  | 'juejin'       // 掘金
  | 'wechat'       // 微信公众号
  // 深色主题
  | 'dark'         // 极夜黑
  | 'midnight'     // 午夜蓝
  | 'dracula'      // Dracula
  // 特色主题
  | 'paper'        // 纸张质感

/** 大纲项 */
export interface OutlineItem {
  level: number
  text: string
  line: number
  id: string
}

/** 编辑器 Props */
export interface MdEditorProps {
  /** 当前文件内容 */
  modelValue: string
  /** 当前文件路径 */
  filePath?: string
  /** 编辑器模式 */
  mode?: EditorMode
  /** 预览主题 */
  theme?: PreviewTheme
  /** 是否自动保存 */
  autoSave?: boolean
  /** 是否显示大纲 */
  showOutline?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 占位符文本 */
  placeholder?: string
}

/** 编辑器 Emits */
export interface MdEditorEmits {
  (e: 'update:modelValue', value: string): void
  (e: 'update:mode', mode: EditorMode): void
  (e: 'update:theme', theme: PreviewTheme): void
  (e: 'save'): void
  (e: 'change', value: string): void
  (e: 'scrollToLine', line: number): void
}

/** 编辑器状态 */
export interface EditorState {
  isComposing: boolean
  isUpdating: boolean
  autoSaveTimer: ReturnType<typeof setTimeout> | null
}

/** 编辑器设置 */
export interface EditorSettings {
  autoSave: boolean
  editorMode: EditorMode
  previewTheme: PreviewTheme
}
