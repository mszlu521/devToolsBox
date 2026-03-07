import { contextBridge, ipcRenderer, shell } from 'electron'

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 数据操作
  getData: () => ipcRenderer.invoke('get-data'),
  saveData: (data: EnvData) => ipcRenderer.invoke('save-data', data),
  
  // 系统环境变量操作
  getSystemEnv: () => ipcRenderer.invoke('get-system-env'),
  setSystemEnv: (name: string, value: string, isMachine?: boolean) =>
    ipcRenderer.invoke('set-system-env', name, value, isMachine),
  deleteSystemEnv: (name: string, isMachine?: boolean) =>
    ipcRenderer.invoke('delete-system-env', name, isMachine),
  
  // 对话框
  showMessageBox: (options: Electron.MessageBoxOptions) =>
    ipcRenderer.invoke('show-message-box', options),
  showErrorBox: (title: string, content: string) =>
    ipcRenderer.invoke('show-error-box', title, content),
  showOpenDialog: (options: Electron.OpenDialogOptions) =>
    ipcRenderer.invoke('show-open-dialog', options),
  readFile: (filePath: string) =>
    ipcRenderer.invoke('read-file', filePath),
  
  // 外部链接
  openExternal: (url: string) => shell.openExternal(url),
  
  // Host 管理
  getHostConfigs: () => ipcRenderer.invoke('get-host-configs'),
  saveHostConfigs: (data: any) => ipcRenderer.invoke('save-host-configs', data),
  getSystemHosts: () => ipcRenderer.invoke('get-system-hosts'),
  activateHostConfig: (content: string) => ipcRenderer.invoke('activate-host-config', content),
  deactivateHostConfig: () => ipcRenderer.invoke('deactivate-host-config'),
  restoreFromBackup: () => ipcRenderer.invoke('restore-from-backup'),
  fetchRemoteHosts: (url: string, useProxy?: boolean, proxyUrl?: string) =>
    ipcRenderer.invoke('fetch-remote-hosts', url, useProxy, proxyUrl),
  createHostsBackup: () => ipcRenderer.invoke('create-hosts-backup'),
  getHostDataPath: () => ipcRenderer.invoke('get-host-data-path'),
  getBackupList: () => ipcRenderer.invoke('get-backup-list'),
  restoreFromSpecificBackup: (backupPath: string) =>
    ipcRenderer.invoke('restore-from-specific-backup', backupPath),
  readBackupFile: (backupPath: string) =>
    ipcRenderer.invoke('read-backup-file', backupPath),
  
  // 网络诊断
  checkPort: (port: number) => ipcRenderer.invoke('check-port', port),
  killProcess: (pid: number) => ipcRenderer.invoke('kill-process', pid),
  dnsLookup: (domain: string, type: string, server?: string) =>
    ipcRenderer.invoke('dns-lookup', domain, type, server),
  getIpInfo: () => ipcRenderer.invoke('get-ip-info'),
  pingHost: (host: string, count?: number) =>
    ipcRenderer.invoke('ping-host', host, count),
  tcpConnect: (host: string, port: number, timeout?: number) =>
    ipcRenderer.invoke('tcp-connect', host, port, timeout),

  // 待办事项数据
  getTodoData: () => ipcRenderer.invoke('get-todo-data'),
  saveTodoData: (data: { todos: any[], projects: any[], categories?: any[] }) =>
    ipcRenderer.invoke('save-todo-data', data),

  // Markdown 笔记文件管理
  mdReadDirectory: (dirPath: string) =>
    ipcRenderer.invoke('md-read-directory', dirPath),
  mdReadFile: (filePath: string) =>
    ipcRenderer.invoke('md-read-file', filePath),
  mdWriteFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('md-write-file', filePath, content),
  mdCreateFile: (filePath: string) =>
    ipcRenderer.invoke('md-create-file', filePath),
  mdCreateDirectory: (dirPath: string) =>
    ipcRenderer.invoke('md-create-directory', dirPath),
  mdRename: (oldPath: string, newPath: string) =>
    ipcRenderer.invoke('md-rename', oldPath, newPath),
  mdDeleteFile: (filePath: string) =>
    ipcRenderer.invoke('md-delete-file', filePath),
  mdDeleteDirectory: (dirPath: string) =>
    ipcRenderer.invoke('md-delete-directory', dirPath),
  mdExists: (path: string) =>
    ipcRenderer.invoke('md-exists', path),
  mdReadImage: (imagePath: string) =>
    ipcRenderer.invoke('md-read-image', imagePath),
  
  // 获取图片的自定义协议 URL
  mdGetImageUrl: (imagePath: string) => {
    // 将本地路径转换为 mdimage:// 协议 URL
    const normalizedPath = imagePath.replace(/\\/g, '/')
    return `mdimage://${encodeURIComponent(normalizedPath)}`
  }
})

// 类型声明 - 与 src/env.d.ts 保持一致
export interface EnvVariable {
  id: string
  name: string
  value: string
  groupId: string
  isSystem?: boolean
  isMachine?: boolean
}

export interface EnvGroup {
  id: string
  name: string
  description?: string
  color?: string
}

export interface EnvData {
  groups: EnvGroup[]
  variables: EnvVariable[]
}
