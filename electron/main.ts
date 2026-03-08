import { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme, protocol } from 'electron'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as os from 'os'
import pingLib from 'ping'

const execAsync = promisify(exec)

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null

// 数据存储路径 - 使用用户目录下的 .devToolsBox 文件夹，按工具分子目录存储
const getDataPath = () => {
  const homePath = app.getPath('home')
  const dataDir = join(homePath, '.devToolsBox', '.envTool')
  
  // 确保目录存在
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  
  return join(dataDir, 'env-data.json')
}

// 读取存储的数据
const readData = (): EnvData => {
  try {
    const dataPath = getDataPath()
    if (fs.existsSync(dataPath)) {
      const content = fs.readFileSync(dataPath, 'utf-8')
      return JSON.parse(content)
    }
  } catch (error) {
    console.error('读取数据失败:', error)
  }
  return { groups: [], variables: [] }
}

// 写入数据
const writeData = (data: EnvData) => {
  try {
    const dataPath = getDataPath()
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('写入数据失败:', error)
    return false
  }
}
// 获取系统环境变量
const getSystemEnv = async (): Promise<EnvVariable[]> => {
  const platform = os.platform()
  const envVars: EnvVariable[] = []

  try {
    if (platform === 'win32') {
      // Windows - 从注册表读取用户环境变量
      const { stdout } = await execAsync('reg query "HKEY_CURRENT_USER\\Environment"')
      const lines = stdout.split('\n')
      
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('HKEY') && !trimmed.startsWith('(默认)')) {
          const parts = trimmed.split(/\s{2,}/)
          if (parts.length >= 3) {
            const name = parts[0]
            const value = parts.slice(2).join(' ').trim()
            if (name && name !== 'Path') {
              envVars.push({
                id: `system_${name}`,
                name,
                value,
                groupId: 'system',
                isSystem: true
              })
            }
          }
        }
      }

      // 读取系统环境变量
      const { stdout: sysStdout } = await execAsync('reg query "HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment"')
      const sysLines = sysStdout.split('\n')
      
      for (const line of sysLines) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('HKEY') && !trimmed.startsWith('(默认)')) {
          const parts = trimmed.split(/\s{2,}/)
          if (parts.length >= 3) {
            const name = parts[0]
            const value = parts.slice(2).join(' ').trim()
            if (name && name !== 'Path') {
              envVars.push({
                id: `system_machine_${name}`,
                name,
                value,
                groupId: 'system',
                isSystem: true,
                isMachine: true
              })
            }
          }
        }
      }
    } else {
      // macOS/Linux - 读取 shell 配置文件
      const homeDir = os.homedir()
      const profilePath = platform === 'darwin' 
        ? join(homeDir, '.bash_profile')
        : join(homeDir, '.bashrc')
      
      if (fs.existsSync(profilePath)) {
        const content = fs.readFileSync(profilePath, 'utf-8')
        const exportRegex = /^export\s+(\w+)=(.+)$/gm
        let match
        while ((match = exportRegex.exec(content)) !== null) {
          envVars.push({
            id: `system_${match[1]}`,
            name: match[1],
            value: match[2].replace(/["']/g, ''),
            groupId: 'system',
            isSystem: true
          })
        }
      }
    }
  } catch (error) {
    console.error('获取系统环境变量失败:', error)
  }

  return envVars
}

// 设置系统环境变量
const setSystemEnv = async (name: string, value: string, isMachine: boolean = false): Promise<boolean> => {
  const platform = os.platform()
  
  try {
    if (platform === 'win32') {
      if (isMachine) {
        await execAsync(`reg add "HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment" /v "${name}" /t REG_SZ /d "${value}" /f`)
      } else {
        await execAsync(`reg add "HKEY_CURRENT_USER\\Environment" /v "${name}" /t REG_SZ /d "${value}" /f`)
      }
      // 广播环境变量变更消息
      await execAsync('powershell -Command "[Environment]::SetEnvironmentVariable(\"' + name + '\", \"' + value + '\", \"User\")"')
      return true
    } else {
      // macOS/Linux - 添加到 shell 配置文件
      const homeDir = os.homedir()
      const profilePath = platform === 'darwin' 
        ? join(homeDir, '.bash_profile')
        : join(homeDir, '.bashrc')
      
      const exportLine = `export ${name}="${value}"\n`
      
      // 检查是否已存在
      let content = ''
      if (fs.existsSync(profilePath)) {
        content = fs.readFileSync(profilePath, 'utf-8')
        const regex = new RegExp(`^export\\s+${name}=.+$`, 'm')
        if (regex.test(content)) {
          // 替换现有值
          content = content.replace(regex, exportLine.trim())
        } else {
          content += '\n' + exportLine
        }
      } else {
        content = exportLine
      }
      
      fs.writeFileSync(profilePath, content, 'utf-8')
      return true
    }
  } catch (error) {
    console.error('设置系统环境变量失败:', error)
    return false
  }
}

// 删除系统环境变量
const deleteSystemEnv = async (name: string, isMachine: boolean = false): Promise<boolean> => {
  const platform = os.platform()
  
  try {
    if (platform === 'win32') {
      if (isMachine) {
        await execAsync(`reg delete "HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment" /v "${name}" /f`)
      } else {
        await execAsync(`reg delete "HKEY_CURRENT_USER\\Environment" /v "${name}" /f`)
      }
      return true
    } else {
      // macOS/Linux - 从 shell 配置文件移除
      const homeDir = os.homedir()
      const profilePath = platform === 'darwin' 
        ? join(homeDir, '.bash_profile')
        : join(homeDir, '.bashrc')
      
      if (fs.existsSync(profilePath)) {
        let content = fs.readFileSync(profilePath, 'utf-8')
        const regex = new RegExp(`^export\\s+${name}=.+$\\n?`, 'gm')
        content = content.replace(regex, '')
        fs.writeFileSync(profilePath, content, 'utf-8')
      }
      return true
    }
  } catch (error) {
    console.error('删除系统环境变量失败:', error)
    return false
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'DevToolsBox',
    webPreferences: {
      preload: join(__dirname, '../dist-electron/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    autoHideMenuBar: true,
    show: false
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  // 注册自定义协议用于本地图片加载
  protocol.registerFileProtocol('mdimage', (request, callback) => {
    const url = request.url.replace('mdimage://', '')
    // 解码 URL 编码的路径
    const decodedPath = decodeURIComponent(url)
    // Windows 路径处理
    const filePath = process.platform === 'win32' && !decodedPath.startsWith('/')
      ? decodedPath
      : decodedPath.startsWith('/') ? decodedPath : '/' + decodedPath
    
    try {
      callback({ path: filePath })
    } catch {
      callback({ error: -2 }) // net::FAILED
    }
  })

  // 移除默认菜单栏
  if (process.platform !== 'darwin') {
    app.applicationMenu = null
  }
  
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC 处理程序
ipcMain.handle('get-data', async () => {
  return readData()
})

ipcMain.handle('save-data', async (_event, data: EnvData) => {
  return writeData(data)
})

ipcMain.handle('get-system-env', async () => {
  return await getSystemEnv()
})

ipcMain.handle('set-system-env', async (_event, name: string, value: string, isMachine?: boolean) => {
  return await setSystemEnv(name, value, isMachine)
})

ipcMain.handle('delete-system-env', async (_event, name: string, isMachine?: boolean) => {
  return await deleteSystemEnv(name, isMachine)
})

ipcMain.handle('show-message-box', async (_event, options: Electron.MessageBoxOptions) => {
  if (!mainWindow) return { response: 0, checkboxChecked: false }
  return await dialog.showMessageBox(mainWindow, options)
})

ipcMain.handle('show-error-box', async (_event, title: string, content: string) => {
  dialog.showErrorBox(title, content)
})

ipcMain.handle('show-open-dialog', async (_event, options: Electron.OpenDialogOptions) => {
  if (!mainWindow) return { canceled: true, filePaths: [] }
  return await dialog.showOpenDialog(mainWindow, options)
})

ipcMain.handle('read-file', async (_event, filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return content
  } catch (error) {
    console.error('读取文件失败:', error)
    throw error
  }
})

// 打开外部链接
ipcMain.handle('open-external', async (_event, url: string) => {
  try {
    await shell.openExternal(url)
    return { success: true }
  } catch (error) {
    console.error('打开外部链接失败:', error)
    throw error
  }
})

// ==================== Host 管理功能 ====================

const getHostDataPath = () => {
  const homePath = app.getPath('home')
  const dataDir = join(homePath, '.devToolsBox', '.hostTool')
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  
  return join(dataDir, 'host-configs.json')
}

const getHostsFilePath = () => {
  const platform = os.platform()
  if (platform === 'win32') {
    return 'C:\\Windows\\System32\\drivers\\etc\\hosts'
  }
  return '/etc/hosts'
}

const writeHostsFile = (content: string): boolean => {
  const hostsPath = getHostsFilePath()
  const platform = os.platform()
  
  try {
    fs.writeFileSync(hostsPath, content, 'utf-8')
    return true
  } catch {
    // Windows 需要管理员权限，使用 PowerShell
    if (platform === 'win32') {
      try {
        const { execSync } = require('child_process')
        const tempFile = join(os.tmpdir(), 'hosts_temp_' + Date.now())
        fs.writeFileSync(tempFile, content, 'utf-8')
        
        execSync(`powershell -Command "Start-Process powershell -ArgumentList 'Copy-Item -Path \\"${tempFile}\\" -Destination \\"${hostsPath}\\" -Force' -Verb runAs -Wait"`, { timeout: 30000 })
        fs.unlinkSync(tempFile)
        return true
      } catch {
        return false
      }
    }
    return false
  }
}

// 首次启用时创建系统 hosts 备份（到备份目录，不在配置列表中显示）
const createSystemBackupIfNeeded = (): boolean => {
  try {
    // 只创建文件备份，不再创建配置项
    // 备份文件会在 activate-host-config 时通过 create-hosts-backup 创建
    return true
  } catch (error) {
    console.error('创建备份失败:', error)
    return false
  }
}

ipcMain.handle('get-host-configs', async () => {
  try {
    const dataPath = getHostDataPath()
    if (fs.existsSync(dataPath)) {
      const content = fs.readFileSync(dataPath, 'utf-8')
      return JSON.parse(content)
    }
  } catch (error) {
    console.error('读取 Host 配置失败:', error)
  }
  return { configs: [] }
})

ipcMain.handle('save-host-configs', async (_event, data) => {
  try {
    const dataPath = getHostDataPath()
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('保存 Host 配置失败:', error)
    return false
  }
})

ipcMain.handle('get-system-hosts', async () => {
  try {
    const hostsPath = getHostsFilePath()
    return fs.readFileSync(hostsPath, 'utf-8')
  } catch (error) {
    console.error('读取系统 hosts 失败:', error)
    throw error
  }
})

ipcMain.handle('activate-host-config', async (_event, content: string) => {
  try {
    // 首次启用时创建备份
    createSystemBackupIfNeeded()
    
    const newContent = content.trim() + '\n'
    
    return writeHostsFile(newContent)
  } catch (error) {
    console.error('激活 Host 配置失败:', error)
    return false
  }
})

ipcMain.handle('deactivate-host-config', async () => {
  try {
    // 停用所有配置时，恢复到系统备份
    const dataPath = getHostDataPath()
    let backupContent = ''
    
    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
      const backupConfig = data.configs?.find((c: any) => c.id === 'system-backup')
      if (backupConfig) {
        backupContent = backupConfig.content
      }
    }
    
    // 恢复到备份内容（如果没有备份则清空）
    const newContent = backupContent.trim() + '\n'
    return writeHostsFile(newContent)
  } catch (error) {
    console.error('停用 Host 配置失败:', error)
    return false
  }
})

// 从备份恢复
ipcMain.handle('restore-from-backup', async () => {
  try {
    const dataPath = getHostDataPath()
    if (!fs.existsSync(dataPath)) {
      return { success: false, message: '未找到配置' }
    }
    
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
    const backupConfig = data.configs?.find((c: any) => c.id === 'system-backup')
    
    if (!backupConfig) {
      return { success: false, message: '未找到系统备份' }
    }
    
    // 停用所有配置
    data.configs.forEach((c: any) => c.isActive = false)
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8')
    
    // 恢复系统 hosts
    const hostsPath = getHostsFilePath()
    let existingContent = ''
    try {
      existingContent = fs.readFileSync(hostsPath, 'utf-8')
    } catch {}
    
    // 移除 DevToolsBox 配置
    const markerStart = '# === DevToolsBox Host Config Start ==='
    const markerEnd = '# === DevToolsBox Host Config End ==='
    const regex = new RegExp(`\\n?${markerStart}[\\s\\S]*?${markerEnd}\\n?`, 'g')
    const newContent = existingContent.replace(regex, '').trim() + '\n'
    
    const success = writeHostsFile(newContent)
    return { success, message: success ? '已恢复到备份状态' : '恢复失败' }
  } catch (error) {
    console.error('恢复备份失败:', error)
    return { success: false, message: '恢复失败' }
  }
})

// 获取远程 hosts 配置
ipcMain.handle('fetch-remote-hosts', async (_event, url: string, useProxy?: boolean, proxyUrl?: string) => {
  try {
    let fetchOptions: any = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }
    
    // 如果配置了代理，使用代理
    if (useProxy && proxyUrl) {
      // 这里可以使用 node-fetch 的代理支持，或 electron 的 net 模块
      // 简化实现，实际项目中可以使用 https-proxy-agent
      console.log(`使用代理: ${proxyUrl}`)
    }
    
    const response = await fetch(url, fetchOptions)
    
    if (!response.ok) {
      return { success: false, content: null, error: `HTTP ${response.status}` }
    }
    
    const content = await response.text()
    return { success: true, content, error: null }
  } catch (error) {
    console.error('获取远程 hosts 失败:', error)
    return { success: false, content: null, error: String(error) }
  }
})

// 获取备份列表
ipcMain.handle('get-backup-list', async () => {
  try {
    const dataDir = join(app.getPath('home'), '.devToolsBox', '.hostTool')
    const backupDir = join(dataDir, 'backups')
    
    if (!fs.existsSync(backupDir)) {
      return { backups: [] }
    }
    
    const backupFiles = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('hosts-backup-'))
      .map(f => {
        const stat = fs.statSync(join(backupDir, f))
        return {
          name: f,
          path: join(backupDir, f),
          time: stat.mtime.toLocaleString()
        }
      })
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    
    return { backups: backupFiles }
  } catch (error) {
    console.error('获取备份列表失败:', error)
    return { backups: [] }
  }
})

// 从指定备份恢复
ipcMain.handle('restore-from-specific-backup', async (_event, backupPath: string) => {
  try {
    if (!fs.existsSync(backupPath)) {
      return { success: false, message: '备份文件不存在' }
    }
    
    const backupContent = fs.readFileSync(backupPath, 'utf-8')
    
    // 停用所有配置
    const dataPath = getHostDataPath()
    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
      data.configs?.forEach((c: any) => c.isActive = false)
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8')
    }
    
    // 恢复系统 hosts
    const success = writeHostsFile(backupContent)
    return { success, message: success ? '已恢复到指定备份' : '恢复失败' }
  } catch (error) {
    console.error('从指定备份恢复失败:', error)
    return { success: false, message: String(error) }
  }
})

// 创建 hosts 修改前的备份
ipcMain.handle('create-hosts-backup', async () => {
  try {
    const hostsPath = getHostsFilePath()
    const dataDir = join(app.getPath('home'), '.devToolsBox', '.hostTool')
    const backupDir = join(dataDir, 'backups')
    
    // 确保备份目录存在
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }
    
    // 读取当前系统 hosts
    let currentContent = ''
    try {
      currentContent = fs.readFileSync(hostsPath, 'utf-8')
    } catch {
      return { success: false, message: '无法读取系统 hosts' }
    }
    
    // 创建带时间戳的备份
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = join(backupDir, `hosts-backup-${timestamp}.txt`)
    fs.writeFileSync(backupPath, currentContent, 'utf-8')
    
    // 清理旧备份（只保留最近 10 个）
    const backupFiles = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('hosts-backup-'))
      .map(f => ({
        name: f,
        path: join(backupDir, f),
        mtime: fs.statSync(join(backupDir, f)).mtime
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
    
    if (backupFiles.length > 10) {
      for (const file of backupFiles.slice(10)) {
        fs.unlinkSync(file.path)
      }
    }
    
    return { success: true, backupPath, message: '备份创建成功' }
  } catch (error) {
    console.error('创建备份失败:', error)
    return { success: false, message: String(error) }
  }
})

// 获取数据路径
ipcMain.handle('get-host-data-path', async () => {
  return getHostDataPath()
})

// 读取备份文件内容
ipcMain.handle('read-backup-file', async (_event, backupPath: string) => {
  try {
    if (!fs.existsSync(backupPath)) {
      return { success: false, content: null, message: '备份文件不存在' }
    }
    
    const content = fs.readFileSync(backupPath, 'utf-8')
    return { success: true, content, message: '读取成功' }
  } catch (error) {
    console.error('读取备份文件失败:', error)
    return { success: false, content: null, message: String(error) }
  }
})

// 类型定义
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

// ========== 网络诊断功能 ==========
import { lookup, Resolver } from 'dns'
import * as net from 'net'
import * as iconv from 'iconv-lite'

// 检测端口占用
ipcMain.handle('check-port', async (_event, port: number) => {
  try {
    const platform = os.platform()
    let command = ''
    
    if (platform === 'win32') {
      command = `netstat -ano | findstr :${port}`
    } else {
      command = `lsof -i :${port} -P -n`
    }
    
    const { stdout } = await execAsync(command)
    const processes: { pid: number; name: string; protocol: string; localAddress: string }[] = []
    
    if (platform === 'win32') {
      const lines = stdout.split('\n').filter(line => line.trim())
      for (const line of lines) {
        const parts = line.trim().split(/\s+/)
        if (parts.length >= 5) {
          const protocol = parts[0]
          const localAddress = parts[1]
          const pid = parseInt(parts[4], 10)
          if (!isNaN(pid)) {
            try {
              const { stdout: tasklist } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`)
              const match = tasklist.match(/^"([^"]+)"/)
              const name = match ? match[1] : 'Unknown'
              processes.push({ pid, name, protocol, localAddress })
            } catch {
              processes.push({ pid, name: 'Unknown', protocol, localAddress })
            }
          }
        }
      }
    } else {
      const lines = stdout.split('\n').slice(1).filter(line => line.trim())
      for (const line of lines) {
        const parts = line.trim().split(/\s+/)
        if (parts.length >= 9) {
          const name = parts[0]
          const pid = parseInt(parts[1], 10)
          const protocol = parts[7]
          const localAddress = parts[8]
          if (!isNaN(pid)) {
            processes.push({ pid, name, protocol, localAddress })
          }
        }
      }
    }
    
    return { success: true, processes: processes.filter((p, i, arr) => arr.findIndex(t => t.pid === p.pid) === i) }
  } catch (error) {
    return { success: true, processes: [] }
  }
})

// 结束进程
ipcMain.handle('kill-process', async (_event, pid: number) => {
  try {
    const platform = os.platform()
    if (platform === 'win32') {
      await execAsync(`taskkill /F /PID ${pid}`)
    } else {
      await execAsync(`kill -9 ${pid}`)
    }
    return { success: true, message: `进程 ${pid} 已终止` }
  } catch (error: any) {
    return { success: false, message: error.message || '终止进程失败' }
  }
})

// DNS 查询
ipcMain.handle('dns-lookup', async (_event, domain: string, type: string, server?: string) => {
  try {
    const records: any[] = []
    
    if (server) {
      // 使用指定 DNS 服务器
      const resolver = new Resolver()
      resolver.setServers([server])
      
      const result: any = await new Promise((resolve, reject) => {
        if (type === 'A') {
          resolver.resolve4(domain, (err, addresses) => {
            if (err) reject(err)
            else resolve(addresses.map(addr => ({ type: 'A', value: addr, ttl: 0 })))
          })
        } else if (type === 'AAAA') {
          resolver.resolve6(domain, (err, addresses) => {
            if (err) reject(err)
            else resolve(addresses.map(addr => ({ type: 'AAAA', value: addr, ttl: 0 })))
          })
        } else if (type === 'CNAME') {
          resolver.resolveCname(domain, (err, addresses) => {
            if (err) reject(err)
            else resolve(addresses.map(addr => ({ type: 'CNAME', value: addr, ttl: 0 })))
          })
        } else if (type === 'MX') {
          resolver.resolveMx(domain, (err, addresses) => {
            if (err) reject(err)
            else resolve(addresses.map((addr: any) => ({ type: 'MX', value: `${addr.priority} ${addr.exchange}`, ttl: 0 })))
          })
        } else if (type === 'TXT') {
          resolver.resolveTxt(domain, (err, addresses) => {
            if (err) reject(err)
            else resolve(addresses.map((addr: string[]) => ({ type: 'TXT', value: addr.join(''), ttl: 0 })))
          })
        } else if (type === 'NS') {
          resolver.resolveNs(domain, (err, addresses) => {
            if (err) reject(err)
            else resolve(addresses.map(addr => ({ type: 'NS', value: addr, ttl: 0 })))
          })
        } else {
          resolve([])
        }
      })
      records.push(...result)
    } else {
      // 使用系统默认 DNS
      const result: any = await new Promise((resolve, reject) => {
        if (type === 'A') {
          lookup(domain, { all: true }, (err, addresses) => {
            if (err) reject(err)
            else resolve(addresses.map((addr: any) => ({ type: addr.family === 4 ? 'A' : 'AAAA', value: addr.address, ttl: 0 })))
          })
        } else {
          resolve([])
        }
      })
      records.push(...result)
    }
    
    return { success: true, records }
  } catch (error: any) {
    return { success: false, records: [], error: error.message || 'DNS 查询失败' }
  }
})

// 获取 IP 信息
ipcMain.handle('get-ip-info', async () => {
  try {
    // 获取本机 IP
    const interfaces = os.networkInterfaces()
    let localIp = ''
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          localIp = iface.address
          break
        }
      }
      if (localIp) break
    }
    
    // 获取公网 IP - 使用 https 模块，跨平台兼容
    let publicIp = ''
    let location = ''
    
    const httpsGet = (url: string): Promise<any> => {
      return new Promise((resolve, reject) => {
        const client = url.startsWith('https:') ? require('https') : require('http')
        const req = client.get(url, (res: any) => {
          let data = ''
          res.on('data', (chunk: any) => data += chunk)
          res.on('end', () => {
            try {
              resolve(JSON.parse(data))
            } catch {
              reject(new Error('Invalid JSON'))
            }
          })
        })
        req.on('error', reject)
        req.setTimeout(5000, () => {
          req.destroy()
          reject(new Error('Timeout'))
        })
      })
    }
    
    try {
      const data = await httpsGet('https://api.ip.sb/geoip')
      publicIp = data.ip || ''
      location = data.country ? `${data.country}${data.city ? ' - ' + data.city : ''}${data.isp ? ' (' + data.isp + ')' : ''}` : ''
    } catch {
      try {
        const data = await httpsGet('https://ipinfo.io/json')
        publicIp = data.ip || ''
        location = data.country ? `${data.country}${data.city ? ' - ' + data.city : ''}${data.org ? ' (' + data.org + ')' : ''}` : ''
      } catch {
        publicIp = '获取失败'
        location = '未知'
      }
    }
    
    return { success: true, localIp, publicIp, location }
  } catch (error: any) {
    return { success: false, localIp: '', publicIp: '', location: '', error: error.message || '获取 IP 信息失败' }
  }
})

// Ping 测试 - 使用 ping npm 包
ipcMain.handle('ping-host', async (_event, host: string, count: number = 4) => {
  try {
    const platform = os.platform()
    
    // 配置 ping 选项（Windows 不支持 deadline）
    const cfg: any = {
      timeout: 10,
      min_reply: count
    }
    
    // Windows 使用 -n 指定次数，Linux/macOS 使用 -c
    if (platform === 'win32') {
      cfg.extra = ['-n', count.toString()]
    } else {
      cfg.extra = ['-c', count.toString()]
    }
    
    // 执行 ping
    const res = await pingLib.promise.probe(host, cfg)
    
    // 解析输出构建详细结果数组
    const results: { host: string; time: number; success: boolean }[] = []
    let successCount = 0
    let totalTime = 0
    
    // 从输出中提取每一跳的延迟
    if (res.output) {
      const lines = res.output.split(/\r?\n/)
      for (const line of lines) {
        const trimmedLine = line.trim()
        // 匹配时间：time=32ms, time<1ms, 时间=32ms 等
        const timeMatch = trimmedLine.match(/(?:time|时间)\s*[=<]\s*([\d.]+)\s*ms/i)
        if (timeMatch) {
          const time = parseFloat(timeMatch[1])
          results.push({ host, time, success: true })
          successCount++
          totalTime += time
        }
        // 匹配超时
        else if (/超时|timed out|timeout/i.test(trimmedLine)) {
          results.push({ host, time: -1, success: false })
        }
      }
    }
    
    // 如果解析不到详细结果，使用库返回的统计信息
    if (results.length === 0) {
      // 根据丢包率生成结果
      const lossRate = res.packetLoss || 0
      const successPackets = Math.round(count * (100 - lossRate) / 100)
      const avgTime = res.avg ? parseFloat(res.avg) : 0
      
      for (let i = 0; i < count; i++) {
        if (i < successPackets) {
          results.push({ host, time: avgTime || -1, success: true })
          successCount++
          totalTime += avgTime || 0
        } else {
          results.push({ host, time: -1, success: false })
        }
      }
    }
    
    const avgTime = successCount > 0 ? Math.round(totalTime / successCount) : 0
    const lossRate = Math.round(((count - successCount) / count) * 100)
    
    return { success: true, results, avgTime, lossRate }
  } catch (error: any) {
    console.error('[Ping] 错误:', error.message)
    console.error('[Ping] 错误详情:', error)
    
    return { success: false, results: [], avgTime: 0, lossRate: 100, error: error.message || 'Ping 失败' }
  }
})

// TCP 连通测试
ipcMain.handle('tcp-connect', async (_event, host: string, port: number, timeout: number = 5000) => {
  return new Promise((resolve) => {
    const startTime = Date.now()
    const socket = new net.Socket()
    
    socket.setTimeout(timeout)
    
    socket.on('connect', () => {
      const time = Date.now() - startTime
      socket.destroy()
      resolve({ success: true, connected: true, time })
    })
    
    socket.on('timeout', () => {
      socket.destroy()
      resolve({ success: true, connected: false, time: timeout, error: '连接超时' })
    })
    
    socket.on('error', (error) => {
      socket.destroy()
      resolve({ success: true, connected: false, time: Date.now() - startTime, error: error.message })
    })
    
    socket.connect(port, host)
  })
})

// ========== 待办事项数据持久化 ==========

// 待办事项存储路径
const getTodoDataPath = () => {
  const homePath = app.getPath('home')
  const dataDir = join(homePath, '.devToolsBox', 'todo-list')
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  
  return {
    dataPath: join(dataDir, 'data.json')
  }
}

// 读取待办事项数据
ipcMain.handle('get-todo-data', async () => {
  try {
    const paths = getTodoDataPath()
    const result: { todos: any[], projects: any[], categories: any[] } = { todos: [], projects: [], categories: [] }
    
    if (fs.existsSync(paths.dataPath)) {
      const data = JSON.parse(fs.readFileSync(paths.dataPath, 'utf-8'))
      result.todos = data.todos || []
      result.projects = data.projects || []
      result.categories = data.categories || []
    }
    
    return { success: true, data: result }
  } catch (error: any) {
    console.error('读取待办数据失败:', error)
    return { success: false, error: error.message, data: { todos: [], projects: [], categories: [] } }
  }
})

// 保存待办事项数据
ipcMain.handle('save-todo-data', async (_event, data: { todos: any[], projects: any[], categories?: any[] }) => {
  try {
    const paths = getTodoDataPath()
    fs.writeFileSync(paths.dataPath, JSON.stringify(data, null, 2), 'utf-8')
    return { success: true }
  } catch (error: any) {
    console.error('保存待办数据失败:', error)
    return { success: false, error: error.message }
  }
})

// ========== Markdown 笔记文件管理 ==========

// 读取目录内容
ipcMain.handle('md-read-directory', async (_event, dirPath: string) => {
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true })
    const result = items
      .filter(item => !item.name.startsWith('.'))
      .map(item => ({
        name: item.name,
        path: join(dirPath, item.name),
        isDirectory: item.isDirectory(),
        size: item.isFile() ? fs.statSync(join(dirPath, item.name)).size : 0,
        modifiedTime: fs.statSync(join(dirPath, item.name)).mtime.getTime()
      }))
      .sort((a, b) => (a.isDirectory === b.isDirectory ? 0 : a.isDirectory ? -1 : 1))
    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 读取文件内容
ipcMain.handle('md-read-file', async (_event, filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const stats = fs.statSync(filePath)
    return {
      success: true,
      data: {
        content,
        size: stats.size,
        modifiedTime: stats.mtime.getTime(),
        lineCount: content.split('\n').length
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 写入文件
ipcMain.handle('md-write-file', async (_event, filePath: string, content: string) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8')
    const stats = fs.statSync(filePath)
    return {
      success: true,
      data: {
        size: stats.size,
        modifiedTime: stats.mtime.getTime()
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 创建文件
ipcMain.handle('md-create-file', async (_event, filePath: string) => {
  try {
    fs.writeFileSync(filePath, '', 'utf-8')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 创建文件夹
ipcMain.handle('md-create-directory', async (_event, dirPath: string) => {
  try {
    fs.mkdirSync(dirPath, { recursive: true })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 重命名文件/文件夹
ipcMain.handle('md-rename', async (_event, oldPath: string, newPath: string) => {
  try {
    fs.renameSync(oldPath, newPath)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 删除文件
ipcMain.handle('md-delete-file', async (_event, filePath: string) => {
  try {
    fs.unlinkSync(filePath)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 删除文件夹
ipcMain.handle('md-delete-directory', async (_event, dirPath: string) => {
  try {
    fs.rmSync(dirPath, { recursive: true, force: true })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 检查文件是否存在
ipcMain.handle('md-exists', async (_event, path: string) => {
  try {
    return { success: true, exists: fs.existsSync(path) }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 读取图片文件为 base64 (保留向后兼容)
ipcMain.handle('md-read-image', async (_event, imagePath: string) => {
  try {
    let cleanPath = decodeURIComponent(imagePath)
    cleanPath = cleanPath.replace(/^file:\/\//, '')

    if (cleanPath.match(/^\/[a-zA-Z]:/)) {
      cleanPath = cleanPath.substring(1)
    }

    cleanPath = cleanPath.replace(/^\\/, '')

    if (process.platform === 'win32') {
      cleanPath = cleanPath.replace(/\//g, '\\')
    }

    if (!fs.existsSync(cleanPath)) {
      return { success: false, error: '文件不存在: ' + cleanPath }
    }

    const data = fs.readFileSync(cleanPath)
    const ext = cleanPath.split('.').pop()?.toLowerCase() || 'png'
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                     ext === 'png' ? 'image/png' :
                     ext === 'gif' ? 'image/gif' :
                     ext === 'svg' ? 'image/svg+xml' :
                     ext === 'webp' ? 'image/webp' :
                     ext === 'bmp' ? 'image/bmp' : 'image/png'
    const base64 = data.toString('base64')

    return { success: true, data: `data:${mimeType};base64,${base64}` }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})
