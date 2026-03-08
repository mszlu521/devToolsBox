/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface Window {
  electronAPI: {
    // 应用配置
    getAppSettings: () => Promise<{ success: boolean; data: any; error?: string }>
    saveAppSettings: (data: any) => Promise<{ success: boolean; error?: string }>
    
    // 关闭行为设置
    getCloseBehavior: () => Promise<{ behavior: 'tray' | 'close' }>
    updateCloseBehavior: (behavior: 'tray' | 'close') => Promise<{ success: boolean }>
    
    getData: () => Promise<EnvData>
    saveData: (data: EnvData) => Promise<boolean>
    getSystemEnv: () => Promise<EnvVariable[]>
    setSystemEnv: (name: string, value: string, isMachine?: boolean) => Promise<boolean>
    deleteSystemEnv: (name: string, isMachine?: boolean) => Promise<boolean>
    showMessageBox: (options: {
      type?: 'none' | 'info' | 'error' | 'question' | 'warning'
      title?: string
      message?: string
      buttons?: string[]
      defaultId?: number
      cancelId?: number
    }) => Promise<{ response: number; checkboxChecked: boolean }>
    showErrorBox: (title: string, content: string) => Promise<void>
    showOpenDialog: (options: {
      properties?: string[]
      filters?: { name: string; extensions: string[] }[]
    }) => Promise<{ canceled: boolean; filePaths: string[] }>
    readFile: (filePath: string) => Promise<string>
    openExternal: (url: string) => Promise<void>
    getHostConfigs: () => Promise<{ configs: any[] }>
    saveHostConfigs: (data: { configs: any[] }) => Promise<boolean>
    getSystemHosts: () => Promise<string>
    activateHostConfig: (content: string) => Promise<boolean>
    deactivateHostConfig: () => Promise<boolean>
    restoreFromBackup: () => Promise<{ success: boolean; message: string }>
    fetchRemoteHosts: (url: string, useProxy?: boolean, proxyUrl?: string) =>
      Promise<{ success: boolean; content: string | null; error: string | null }>
    createHostsBackup: () => Promise<{ success: boolean; backupPath?: string; message: string }>
    getHostDataPath: () => Promise<string>
    getBackupList: () => Promise<{ backups: { name: string; path: string; time: string }[] }>
    restoreFromSpecificBackup: (backupPath: string) => Promise<{ success: boolean; message: string }>
    readBackupFile: (backupPath: string) => Promise<{ success: boolean; content: string | null; message: string }>
    // 网络诊断
    checkPort: (port: number) => Promise<{ success: boolean; processes: { pid: number; name: string; protocol: string; localAddress: string }[]; error?: string }>
    killProcess: (pid: number) => Promise<{ success: boolean; message: string }>
    dnsLookup: (domain: string, type: string, server?: string) => Promise<{ success: boolean; records: any[]; error?: string }>
    getIpInfo: () => Promise<{ success: boolean; localIp: string; publicIp: string; location: string; error?: string }>
    pingHost: (host: string, count?: number) => Promise<{ success: boolean; results: { host: string; time: number; success: boolean }[]; avgTime: number; lossRate: number; error?: string }>
    tcpConnect: (host: string, port: number, timeout?: number) => Promise<{ success: boolean; connected: boolean; time: number; error?: string }>
    
    // 待办事项数据
    getTodoData: () => Promise<{ success: boolean; data: { todos: any[], projects: any[], categories: any[] }; error?: string }>
    saveTodoData: (data: { todos: any[], projects: any[], categories?: any[] }) => Promise<{ success: boolean; error?: string }>
    
    // Markdown 笔记设置持久化
    getMdNotesData: () => Promise<{ success: boolean; data: any; error?: string }>
    saveMdNotesData: (data: any) => Promise<{ success: boolean; error?: string }>
    
    // Markdown 笔记文件管理
    mdReadDirectory: (dirPath: string) => Promise<{ success: boolean; data?: any[]; error?: string }>
    mdReadFile: (filePath: string) => Promise<{ success: boolean; data?: { content: string; size: number; modifiedTime: number; lineCount: number }; error?: string }>
    mdWriteFile: (filePath: string, content: string) => Promise<{ success: boolean; data?: { size: number; modifiedTime: number }; error?: string }>
    mdCreateFile: (filePath: string) => Promise<{ success: boolean; error?: string }>
    mdCreateDirectory: (dirPath: string) => Promise<{ success: boolean; error?: string }>
    mdRename: (oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>
    mdDeleteFile: (filePath: string) => Promise<{ success: boolean; error?: string }>
    mdDeleteDirectory: (dirPath: string) => Promise<{ success: boolean; error?: string }>
    mdExists: (path: string) => Promise<{ success: boolean; exists?: boolean; error?: string }>
    mdReadImage: (imagePath: string) => Promise<{ success: boolean; data?: string; error?: string }>
    mdGetImageUrl: (imagePath: string) => string
  }
}

interface EnvVariable {
  id: string
  name: string
  value: string
  groupId: string
  isSystem?: boolean
  isMachine?: boolean
}

interface EnvGroup {
  id: string
  name: string
  description?: string
  color?: string
}

interface EnvData {
  groups: EnvGroup[]
  variables: EnvVariable[]
}
