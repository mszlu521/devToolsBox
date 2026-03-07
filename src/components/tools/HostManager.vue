<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Plus, Delete, DocumentCopy, FolderOpened, Setting, Warning, Collection, InfoFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

interface HostConfig {
  id: string
  name: string
  description: string
  content: string
  isActive: boolean
  isSystem?: boolean
  createdAt: number
  updatedAt: number
}

interface HighlightedLine {
  text: string
  html: string
}

interface BackupItem {
  name: string
  path: string
  time: string
}

const configs = ref<HostConfig[]>([])
const loading = ref(false)
const selectedConfigId = ref<string>('')
const searchQuery = ref('')
const hasError = ref(false)
const errorMessage = ref('')
const editorContent = ref('')
const systemHostsRefreshTimer = ref<number | null>(null)
const backupStatus = ref('')
const showBackupHistory = ref(false)
const backupList = ref<BackupItem[]>([])
const selectedBackupContent = ref('')
const showBackupContentDialog = ref(false)
const showNewConfigDialog = ref(false)
const newConfigNameInput = ref('')
const newConfigNameError = ref('')

const systemHosts = ref<HostConfig>({
  id: 'system',
  name: '当前系统 Hosts',
  description: '系统 hosts 文件当前内容',
  content: '',
  isActive: false,
  isSystem: true,
  createdAt: 0,
  updatedAt: 0
})

const currentConfig = computed(() => {
  if (selectedConfigId.value === 'system') return systemHosts.value
  return configs.value.find(c => c.id === selectedConfigId.value)
})

const activeConfigs = computed(() => configs.value.filter(c => c.isActive))
const userConfigs = computed(() => configs.value)

const filteredConfigs = computed(() => {
  if (!searchQuery.value) return userConfigs.value
  const query = searchQuery.value.toLowerCase()
  return userConfigs.value.filter(c => 
    c.name.toLowerCase().includes(query) || 
    c.description.toLowerCase().includes(query)
  )
})

// 语法高亮
const highlightContent = (content: string): HighlightedLine[] => {
  if (!content) return []
  const lines = content.split('\n')
  return lines.map(line => {
    const trimmed = line.trim()
    
    if (!trimmed) {
      return { text: line, html: '<span>&nbsp;</span>' }
    }
    
    if (trimmed.startsWith('#')) {
      return { text: line, html: `<span class="comment">${escapeHtml(line)}</span>` }
    }
    
    const commentIndex = line.indexOf('#')
    if (commentIndex > 0) {
      const beforeComment = line.substring(0, commentIndex)
      const commentPart = line.substring(commentIndex)
      return { text: line, html: highlightLineWithComment(beforeComment, commentPart) }
    }
    
    const parts = line.split(/(\s+)/)
    let html = ''
    let isFirst = true
    
    for (const part of parts) {
      if (!part) continue
      
      if (isFirst && /^[\d.:a-fA-F]+$/.test(part)) {
        html += `<span class="ip-address">${escapeHtml(part)}</span>`
        isFirst = false
      } else if (!isFirst && part.trim()) {
        html += `<span class="domain">${escapeHtml(part)}</span>`
      } else {
        html += escapeHtml(part)
      }
    }
    
    return { text: line, html }
  })
}

const escapeHtml = (str: string): string => {
  return str.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>')
}

const highlightLineWithComment = (before: string, comment: string): string => {
  const parts = before.split(/(\s+)/)
  let html = ''
  let isFirst = true
  
  for (const part of parts) {
    if (!part) continue
    
    if (isFirst && /^[\d.:a-fA-F]+$/.test(part)) {
      html += `<span class="ip-address">${escapeHtml(part)}</span>`
      isFirst = false
    } else if (!isFirst && part.trim()) {
      html += `<span class="domain">${escapeHtml(part)}</span>`
    } else {
      html += escapeHtml(part)
    }
  }
  
  html += `<span class="comment">${escapeHtml(comment)}</span>`
  return html
}

const highlightedLines = computed(() => {
  if (!currentConfig.value) return []
  return highlightContent(currentConfig.value.content)
})

// 监听当前配置变化，同步编辑器内容
watch(
  () => currentConfig.value,
  (config) => {
    if (config?.content !== undefined) {
      editorContent.value = config.content
    }
  },
  { immediate: true }
)

const textareaRef = ref<HTMLTextAreaElement>()
const highlightRef = ref<HTMLDivElement>()

const syncScroll = () => {
  if (textareaRef.value && highlightRef.value) {
    highlightRef.value.scrollTop = textareaRef.value.scrollTop
    highlightRef.value.scrollLeft = textareaRef.value.scrollLeft
  }
}

const onEditorInput = () => {
  if (currentConfig.value) {
    currentConfig.value.content = editorContent.value
    onContentChange()
  }
}

onMounted(() => {
  loadConfigs()
  loadSystemHosts()
  startSystemHostsRefresh()
})

onUnmounted(() => {
  stopSystemHostsRefresh()
})

// 启动系统 hosts 定时刷新
const startSystemHostsRefresh = () => {
  stopSystemHostsRefresh()
  systemHostsRefreshTimer.value = window.setInterval(async () => {
    await loadSystemHosts()
  }, 3000)
}

const stopSystemHostsRefresh = () => {
  if (systemHostsRefreshTimer.value) {
    clearInterval(systemHostsRefreshTimer.value)
    systemHostsRefreshTimer.value = null
  }
}

// 复制系统当前 hosts
const copySystemHosts = () => {
  if (systemHosts.value.content) {
    navigator.clipboard.writeText(systemHosts.value.content)
    ElMessage.success('已复制系统 hosts 到剪贴板')
  }
}

const loadConfigs = async () => {
  try {
    const data = await window.electronAPI.getHostConfigs()
    configs.value = data.configs || []
    if (configs.value.length > 0 && !selectedConfigId.value) {
      selectedConfigId.value = configs.value[0].id
    }
  } catch (error) {
    console.error('加载配置失败:', error)
  }
}

const loadSystemHosts = async () => {
  try {
    const content = await window.electronAPI.getSystemHosts()
    systemHosts.value.content = content
    systemHosts.value.updatedAt = Date.now()
  } catch (error) {
    console.error('加载系统 hosts 失败:', error)
  }
}

const saveConfigs = async () => {
  try {
    const plainConfigs = JSON.parse(JSON.stringify(configs.value))
    await window.electronAPI.saveHostConfigs({ configs: plainConfigs })
    return true
  } catch (error) {
    console.error('保存配置失败:', error)
    return false
  }
}

// 创建备份并显示状态
const createBackupBeforeChange = async (): Promise<boolean> => {
  try {
    const result = await window.electronAPI.createHostsBackup?.()
    if (result?.success) {
      backupStatus.value = `已备份: ${new Date().toLocaleTimeString()}`
      setTimeout(() => { backupStatus.value = '' }, 5000)
      return true
    }
    return false
  } catch (error) {
    console.error('创建备份失败:', error)
    return false
  }
}

// 加载备份列表
const loadBackupList = async () => {
  try {
    const result = await window.electronAPI.getBackupList?.()
    if (result?.backups) {
      backupList.value = result.backups
    }
  } catch (error) {
    console.error('加载备份列表失败:', error)
  }
}

// 从指定备份恢复
const restoreFromSpecificBackup = async (backupPath: string) => {
  try {
    const result = await window.electronAPI.restoreFromSpecificBackup?.(backupPath)
    if (result?.success) {
      await loadConfigs()
      await loadSystemHosts()
      selectedConfigId.value = 'system'
      ElMessage.success('已恢复到指定备份')
    } else {
      ElMessage.error(result?.message || '恢复失败')
    }
  } catch (error) {
    ElMessage.error('恢复失败')
  }
}

const openBackupHistory = async () => {
  await loadBackupList()
  showBackupHistory.value = true
}

// 查看备份文件内容
const viewBackupContent = async (backupPath: string) => {
  try {
    const result = await window.electronAPI.readBackupFile?.(backupPath)
    if (result?.success && result.content) {
      selectedBackupContent.value = result.content
      showBackupContentDialog.value = true
    } else {
      ElMessage.error('读取备份文件失败')
    }
  } catch (error) {
    ElMessage.error('读取备份文件失败')
  }
}

const validateHostsContent = (content: string): { valid: boolean; message: string } => {
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('#')) continue
    
    const parts = line.split(/\s+/)
    if (parts.length < 2) {
      return { valid: false, message: `第 ${i + 1} 行格式错误` }
    }
    
    const ip = parts[0]
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F:]+)$/
    if (!ipRegex.test(ip)) {
      return { valid: false, message: `第 ${i + 1} 行 IP 地址格式错误: ${ip}` }
    }
  }
  return { valid: true, message: '' }
}

const onContentChange = () => {
  if (!currentConfig.value) return
  
  const result = validateHostsContent(currentConfig.value.content)
  hasError.value = !result.valid
  errorMessage.value = result.message
  
  if (result.valid) {
    currentConfig.value.updatedAt = Date.now()
    saveConfigs()
  }
}

// 生成唯一的配置名称
const generateUniqueConfigName = (baseName: string): string => {
  const existingNames = new Set(configs.value.map(c => c.name))
  if (!existingNames.has(baseName)) return baseName
  
  let index = 1
  let newName = `${baseName}_${index}`
  while (existingNames.has(newName)) {
    index++
    newName = `${baseName}_${index}`
  }
  return newName
}

const createConfig = () => {
  newConfigNameInput.value = '新配置'
  newConfigNameError.value = ''
  showNewConfigDialog.value = true
}

const confirmCreateConfig = () => {
  const name = newConfigNameInput.value.trim()
  if (!name) {
    newConfigNameError.value = '请输入配置名称'
    return
  }
  
  const existingNames = configs.value.map(c => c.name)
  if (existingNames.includes(name)) {
    newConfigNameError.value = '配置名称已存在，请使用其他名称'
    return
  }
  
  const newConfig: HostConfig = {
    id: `host_${Date.now()}`,
    name: name,
    description: '',
    content: '# 在此输入 hosts 配置\n# 格式: IP地址 域名\n\n127.0.0.1 localhost\n::1 localhost\n',
    isActive: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  configs.value.push(newConfig)
  selectedConfigId.value = newConfig.id
  saveConfigs()
  showNewConfigDialog.value = false
  ElMessage.success('创建成功')
}

const deleteConfig = async (config: HostConfig) => {
  try {
    // 如果配置已激活，先提醒用户会从系统 hosts 中移除
    if (config.isActive) {
      await ElMessageBox.confirm(
        `"${config.name}" 当前已激活，删除后会从系统 hosts 中移除相关配置。\n\n确定删除吗？`,
        '确认删除',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      
      // 先停用配置，从系统 hosts 中移除
      loading.value = true
      await deactivateConfig(config)
      loading.value = false
    } else {
      // 未激活的配置，普通确认
      await ElMessageBox.confirm(
        `确定删除 "${config.name}" 吗？`,
        '确认删除',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
      )
    }
    
    const index = configs.value.findIndex(c => c.id === config.id)
    if (index > -1) {
      configs.value.splice(index, 1)
      await saveConfigs()
      
      if (selectedConfigId.value === config.id) {
        selectedConfigId.value = configs.value[0]?.id || 'system'
      }
      
      ElMessage.success('已删除')
    }
  } catch {}
}

const handleConfigToggle = async (config: HostConfig, newValue: boolean) => {
  loading.value = true
  try {
    await createBackupBeforeChange()
    
    if (newValue) {
      await activateConfig(config)
    } else {
      await deactivateConfig(config)
    }
  } finally {
    loading.value = false
  }
}

const toggleConfig = async (config: HostConfig) => {
  loading.value = true
  try {
    await createBackupBeforeChange()
    
    if (config.isActive) {
      await deactivateConfig(config)
    } else {
      await activateConfig(config)
    }
  } finally {
    loading.value = false
  }
}

const generateMergedHosts = (): string => {
  const lines: string[] = []
  
  configs.value
    .filter(c => c.isActive)
    .forEach(c => {
      lines.push(`# === ${c.name} ===`)
      lines.push(c.content)
      lines.push('')
    })
  
  return lines.join('\n')
}

// 从 hosts 内容中提取 (IP, 域名) 组合列表
const extractHostEntries = (content: string): Array<{ ip: string; domain: string }> => {
  const entries: Array<{ ip: string; domain: string }> = []
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const parts = trimmed.split(/\s+/)
    if (parts.length < 2) continue
    const ip = parts[0]
    // 跳过 IP 地址，后面的都是域名
    for (let i = 1; i < parts.length; i++) {
      if (parts[i] && !parts[i].startsWith('#')) {
        entries.push({ ip, domain: parts[i] })
      }
    }
  }
  return entries
}

const activateConfig = async (config: HostConfig) => {
  const result = validateHostsContent(config.content)
  if (!result.valid) {
    ElMessage.error(`无法启用: ${result.message}`)
    config.isActive = false
    return
  }
  
  // 检查系统 hosts 中是否有重复的 (IP, 域名) 组合
  const configEntries = extractHostEntries(config.content)
  const systemEntries = extractHostEntries(systemHosts.value.content)
  
  // 找出真正的重复项（相同的 IP + 域名）
  const duplicates: Array<{ ip: string; domain: string }> = []
  for (const configEntry of configEntries) {
    const isDuplicate = systemEntries.some(
      sysEntry => sysEntry.ip === configEntry.ip && sysEntry.domain === configEntry.domain
    )
    if (isDuplicate) {
      duplicates.push(configEntry)
    }
  }
  
  if (duplicates.length > 0) {
    // 只提示用户，不影响正常启用
    const duplicateList = duplicates.map(d => `${d.ip} ${d.domain}`).join('\n')
    ElMessageBox.alert(
      `以下配置在系统 hosts 中已存在，启用后将会覆盖：\n\n${duplicateList}`,
      '配置重复提示',
      { confirmButtonText: '知道了', type: 'info' }
    )
  }
  
  config.isActive = true
  config.updatedAt = Date.now()
  
  const content = generateMergedHosts()
  
  const success = await window.electronAPI.activateHostConfig(content)
  if (success) {
    await saveConfigs()
    await loadSystemHosts()
    ElMessage.success(`已启用: ${config.name}`)
  } else {
    config.isActive = false
    ElMessage.error('启用失败，可能需要管理员权限')
  }
}

const deactivateConfig = async (config: HostConfig) => {
  config.isActive = false
  config.updatedAt = Date.now()
  
  const content = generateMergedHosts()
  
  const success = await window.electronAPI.activateHostConfig(content)
  if (success) {
    await saveConfigs()
    await loadSystemHosts()
    ElMessage.success(`已停用: ${config.name}`)
  } else {
    config.isActive = true
    ElMessage.error('停用失败')
  }
}

const deactivateAll = async () => {
  loading.value = true
  try {
    await createBackupBeforeChange()
    
    configs.value.forEach(c => c.isActive = false)
    const success = await window.electronAPI.deactivateHostConfig()
    if (success) {
      await saveConfigs()
      await loadSystemHosts()
      ElMessage.success('已停用所有配置')
    }
  } catch {
    ElMessage.error('停用失败')
  } finally {
    loading.value = false
  }
}

const exportConfigs = () => {
  const data = JSON.stringify(userConfigs.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hosts-configs-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const importConfigs = async () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e: any) => {
    const file = e.target.files[0]
    if (!file) return
    
    try {
      const text = await file.text()
      const imported = JSON.parse(text)
      
      if (Array.isArray(imported)) {
        const existingIds = new Set(configs.value.map(c => c.id))
        const newConfigs = imported.filter(c => !existingIds.has(c.id))
        
        configs.value.push(...newConfigs)
        
        await saveConfigs()
        
        const activeImportedConfigs = newConfigs.filter(c => c.isActive)
        if (activeImportedConfigs.length > 0) {
          const systemContent = await window.electronAPI.getSystemHosts()
          const mergedContent = generateMergedHosts()
          
          const needsUpdate = activeImportedConfigs.some(c => !systemContent.includes(c.content.trim()))
          if (needsUpdate) {
            await window.electronAPI.activateHostConfig(mergedContent)
            await loadSystemHosts()
            ElMessage.success(`导入成功，已应用 ${activeImportedConfigs.length} 个激活配置到系统 hosts`)
          } else {
            ElMessage.success(`导入成功，添加了 ${newConfigs.length} 个配置`)
          }
        } else {
          ElMessage.success(`导入成功，添加了 ${newConfigs.length} 个配置`)
        }
        
        if (newConfigs.length > 0) {
          selectedConfigId.value = newConfigs[0].id
        }
      }
    } catch {
      ElMessage.error('导入失败')
    }
  }
  input.click()
}

const copyConfigContent = (content: string) => {
  navigator.clipboard.writeText(content)
  ElMessage.success('已复制到剪贴板')
}

const formatLastSyncTime = (timestamp?: number): string => {
  if (!timestamp) return '未同步'
  return new Date(timestamp).toLocaleString()
}
</script>

<template>
  <div class="host-manager">
    <!-- 左侧配置列表 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <h3>Host 配置</h3>
        <div class="header-actions">
          <el-dropdown>
            <el-button link :icon="Setting" />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="exportConfigs">导出配置</el-dropdown-item>
                <el-dropdown-item @click="importConfigs">导入配置</el-dropdown-item>
                <el-dropdown-item @click="openBackupHistory">
                  <el-icon><Collection /></el-icon>
                  备份历史
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
      
      <el-input
        v-model="searchQuery"
        placeholder="搜索配置..."
        clearable
        size="small"
        class="search-input"
      />
      
      <!-- 当前状态 -->
      <div class="status-bar">
        <el-tag v-if="activeConfigs.length > 0" type="success" effect="dark" size="small">
          已启用 {{ activeConfigs.length }} 个配置
        </el-tag>
        <el-tag v-else type="info" size="small">未启用任何配置</el-tag>
        <el-button v-if="activeConfigs.length > 0" link type="warning" size="small" @click="deactivateAll">
          全部停用
        </el-button>
      </div>
      
      <!-- 备份状态提示 -->
      <div v-if="backupStatus" class="backup-status-bar">
        <el-icon><InfoFilled /></el-icon>
        <span>{{ backupStatus }}</span>
      </div>
      
      <div class="config-list">
        <!-- 系统 Hosts -->
        <div
          class="config-item"
          :class="{ active: selectedConfigId === 'system', system: true }"
          @click="selectedConfigId = 'system'"
        >
          <el-icon class="config-icon"><FolderOpened /></el-icon>
          <div class="config-info">
            <div class="config-name">当前系统 Hosts</div>
            <div class="config-desc">查看当前生效内容</div>
          </div>
        </div>
        
        <el-divider />
        
        <!-- 用户配置 -->
        <div
          v-for="config in filteredConfigs"
          :key="config.id"
          class="config-item"
          :class="{ active: selectedConfigId === config.id, enabled: config.isActive }"
          @click="selectedConfigId = config.id"
        >
          <el-checkbox
            v-model="config.isActive"
            @click.stop
            @change="(val: boolean) => handleConfigToggle(config, val)"
            class="config-checkbox"
          />
          <div class="config-info">
            <div class="config-name">{{ config.name }}</div>
            <div class="config-desc">{{ config.description || '无描述' }}</div>
          </div>
          <div class="config-actions">
            <el-button
              v-if="selectedConfigId === config.id"
              type="danger"
              link
              :icon="Delete"
              size="small"
              @click.stop="deleteConfig(config)"
            />
          </div>
        </div>
      </div>
      
      <div class="sidebar-footer">
        <el-button type="primary" :icon="Plus" class="add-btn" @click="createConfig">
          新建配置
        </el-button>
      </div>
    </div>
    
    <!-- 右侧编辑器 -->
    <div class="editor" v-if="currentConfig">
      <div class="editor-header">
        <div class="header-left">
          <span v-if="currentConfig.isSystem" class="title-text">{{ currentConfig.name }}</span>
          <el-input
            v-else
            v-model="currentConfig.name"
            class="title-input"
            @change="saveConfigs"
          />
          <el-tag v-if="currentConfig.isActive" type="success" effect="dark">已启用</el-tag>
          <el-tag v-if="hasError" type="danger" effect="dark">
            <el-icon><Warning /></el-icon>
            格式错误
          </el-tag>
        </div>
        <div class="header-right">
          <el-button v-if="currentConfig.isSystem" :icon="DocumentCopy" @click="copySystemHosts">
            复制当前配置
          </el-button>
          <el-button v-else :icon="DocumentCopy" @click="copyConfigContent(currentConfig.content)">
            复制配置内容
          </el-button>
        </div>
      </div>
      
      <div class="editor-toolbar">
        <el-input
          v-if="!currentConfig.isSystem"
          v-model="currentConfig.description"
          placeholder="配置描述..."
          size="small"
          class="desc-input"
          @change="saveConfigs"
        />
        <div class="toolbar-actions" v-else></div>
      </div>
      
      <!-- 编辑器区域 -->
      <div class="editor-container">
        <!-- 语法高亮显示 -->
        <div 
          v-if="!currentConfig.isSystem"
          class="code-highlight"
          ref="highlightRef"
          :class="{ 'has-error': hasError }"
        >
          <div 
            v-for="(line, index) in highlightedLines" 
            :key="index"
            class="highlight-line"
            v-html="line.html"
          />
        </div>
        
        <!-- 编辑区域 -->
        <textarea
          v-if="!currentConfig.isSystem"
          ref="textareaRef"
          v-model="editorContent"
          class="code-editor"
          :class="{ 'has-error': hasError }"
          placeholder="# 在此输入 hosts 配置&#10;# 格式: IP地址 域名 [备注]&#10;&#10;127.0.0.1 localhost&#10;::1 localhost"
          @scroll="syncScroll"
          @input="onEditorInput"
          spellcheck="false"
        />
        
        <!-- 系统配置只读显示 -->
        <div 
          v-else
          class="code-display system-mode"
        >
          <pre>{{ currentConfig.content }}</pre>
        </div>
        
        <!-- 错误提示 -->
        <div v-if="hasError" class="error-bar">
          <el-icon><Warning /></el-icon>
          <span>{{ errorMessage }}</span>
        </div>
        
        <!-- 格式说明 -->
        <div class="format-help">
          <span v-if="currentConfig.isSystem">
            当前系统 hosts 文件内容（只读）
          </span>
          <span v-else class="syntax-help">
            <span class="ip-example">127.0.0.1</span>
            <span class="domain-example">localhost</span>
            <span class="comment-example"># 注释</span>
          </span>
        </div>
      </div>
    </div>
    
    <!-- 备份历史对话框 -->
    <el-dialog
      v-model="showBackupHistory"
      title="备份历史"
      width="700px"
    >
      <el-table :data="backupList" style="width: 100%" v-if="backupList.length > 0">
        <el-table-column prop="time" label="备份时间" width="180" />
        <el-table-column prop="name" label="文件名" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button 
              type="info" 
              size="small" 
              @click="viewBackupContent(row.path)"
            >
              查看
            </el-button>
            <el-button 
              type="primary" 
              size="small" 
              @click="restoreFromSpecificBackup(row.path)"
            >
              恢复
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="暂无备份记录" />
    </el-dialog>
    
    <!-- 备份内容查看对话框 -->
    <el-dialog
      v-model="showBackupContentDialog"
      title="备份内容"
      width="800px"
    >
      <div class="backup-content-viewer">
        <pre>{{ selectedBackupContent }}</pre>
      </div>
      <template #footer>
        <el-button @click="showBackupContentDialog = false">关闭</el-button>
      </template>
    </el-dialog>
    
    <!-- 新建配置对话框 -->
    <el-dialog
      v-model="showNewConfigDialog"
      title="新建配置"
      width="400px"
    >
      <el-form>
        <el-form-item label="配置名称" :error="newConfigNameError">
          <el-input 
            v-model="newConfigNameInput" 
            placeholder="请输入配置名称"
            @keyup.enter="confirmCreateConfig"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showNewConfigDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmCreateConfig">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.host-manager {
  display: flex;
  height: 100%;
  background: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
  transition: background-color 0.3s ease;
}

/* 侧边栏 */
.sidebar {
  width: 280px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  transition: border-color 0.3s ease;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.search-input {
  margin: 12px 16px 0;
}

.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
  transition: border-color 0.3s ease, color 0.3s ease;
}

.backup-status-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(103, 194, 58, 0.1);
  color: #67c23a;
  font-size: 12px;
  border-bottom: 1px solid var(--border-color);
  transition: border-color 0.3s ease;
}

.config-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.config-item:hover {
  background: var(--hover-bg);
}

.config-item.active {
  background: var(--hover-bg);
  border-left: 3px solid var(--primary-color);
}

.config-item.enabled:not(.active) {
  background: rgba(103, 194, 58, 0.15);
}

.config-item.system {
  background: var(--hover-bg);
}

.config-icon {
  font-size: 20px;
  color: var(--text-tertiary);
  transition: color 0.3s ease;
}

.config-info {
  flex: 1;
  min-width: 0;
}

.config-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.3s ease;
}

.config-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
  transition: color 0.3s ease;
}

.config-checkbox {
  transform: scale(1.2);
}

.config-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.config-item:hover .config-actions {
  opacity: 1;
}

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
  transition: border-color 0.3s ease;
}

.add-btn {
  width: 100%;
}

/* 编辑器 */
.editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
  min-width: 0;
  transition: background-color 0.3s ease;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  transition: border-color 0.3s ease;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-input {
  width: 200px;
}

.title-input :deep(.el-input__inner) {
  font-size: 18px;
  font-weight: 600;
  background: var(--card-bg);
  color: var(--text-primary);
  transition: background-color 0.3s ease, color 0.3s ease;
}

.title-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-color);
  gap: 16px;
  transition: border-color 0.3s ease;
}

.desc-input {
  flex: 1;
  max-width: 400px;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

/* 编辑器容器 */
.editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* 代码高亮层 */
.code-highlight {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 60px;
  padding: 16px 20px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.8;
  background: var(--code-bg);
  color: var(--code-text);
  overflow: auto;
  white-space: pre;
  pointer-events: none;
  z-index: 1;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.highlight-line {
  min-height: 25.2px;
}

/* 语法高亮颜色 */
:deep(.ip-address) {
  color: var(--code-ip);
  font-weight: 500;
}

:deep(.domain) {
  color: var(--code-domain);
}

:deep(.comment) {
  color: var(--code-comment);
  font-style: italic;
}

/* 编辑区域 */
.code-editor {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 60px;
  width: 100%;
  padding: 16px 20px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.8;
  background: transparent;
  color: transparent;
  caret-color: var(--text-primary);
  border: none;
  resize: none;
  outline: none;
  z-index: 2;
  overflow: auto;
  white-space: pre;
}

.code-editor::selection {
  background: rgba(0, 212, 170, 0.3);
  color: transparent;
}

.code-display {
  flex: 1;
  padding: 16px 20px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.8;
  background: var(--code-bg);
  color: var(--code-text);
  overflow: auto;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.code-display pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.code-editor.has-error {
  caret-color: #f56c6c;
}

.code-display.system-mode {
  background: var(--hover-bg);
}

/* 错误提示条 */
.error-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
  font-size: 13px;
  border-radius: 4px;
  margin: 8px 20px;
}

/* 格式帮助 */
.format-help {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  font-size: 12px;
  color: var(--text-tertiary);
  border-top: 1px solid var(--border-color);
  transition: color 0.3s ease, border-color 0.3s ease;
}

.syntax-help {
  display: flex;
  gap: 16px;
}

.syntax-help .ip-example {
  color: var(--code-ip);
  font-weight: 500;
}

.syntax-help .domain-example {
  color: var(--code-domain);
}

.syntax-help .comment-example {
  color: var(--code-comment);
  font-style: italic;
}

/* 备份内容查看器 */
.backup-content-viewer {
  max-height: 500px;
  overflow: auto;
  background: var(--code-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 16px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.backup-content-viewer pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.8;
  color: var(--code-text);
  white-space: pre-wrap;
  word-break: break-all;
  transition: color 0.3s ease;
}
</style>
