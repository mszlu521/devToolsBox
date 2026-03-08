export interface Tool {
  id: string
  name: string
  description: string
  icon: string
  component: string
  isAvailable?: boolean
}

export const tools: Tool[] = [
  {
    id: 'env-manager',
    name: '环境变量管理',
    description: '管理系统和用户环境变量，支持导入导出',
    icon: 'Setting',
    component: 'EnvManager',
    isAvailable: true
  },
  {
    id: 'json-formatter',
    name: 'JSON 格式化',
    description: 'JSON 格式化、压缩、转义、校验工具',
    icon: 'Document',
    component: 'JsonFormatter',
    isAvailable: true
  },
  {
    id: 'host-manager',
    name: 'Host 管理',
    description: '管理 Hosts 文件，快速切换不同环境配置',
    icon: 'Connection',
    component: 'HostManager',
    isAvailable: true
  },
  {
    id: 'network-diagnostic',
    name: '网络诊断',
    description: '端口检测、DNS查询、IP信息、Ping/TCP连通性测试',
    icon: 'Monitor',
    component: 'NetworkDiagnostic',
    isAvailable: true
  },
  {
    id: 'todo-list',
    name: '待办事项',
    description: '让时间变得井井有条，高效管理每日任务',
    icon: 'List',
    component: 'TodoList',
    isAvailable: true
  },
  {
    id: 'markdown-notes',
    name: 'Markdown 笔记',
    description: '简洁的 Markdown 笔记工具，支持标签、搜索、导入导出',
    icon: 'Document',
    component: 'MarkdownNotes',
    isAvailable: true
  },
]
