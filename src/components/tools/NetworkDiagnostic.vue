<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  Monitor, Warning, CircleClose, Check,
  Search, Connection, OfficeBuilding,
  Position, Link, Timer, Refresh,
  CircleCheck, Location, InfoFilled
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// ========== 端口检测 ==========
const portInput = ref('')
const portLoading = ref(false)
const portResult = ref<{ pid: number; name: string; protocol: string; localAddress: string }[] | null>(null)

const checkPort = async () => {
  const port = parseInt(portInput.value, 10)
  if (isNaN(port) || port < 1 || port > 65535) {
    ElMessage.warning('请输入有效的端口号 (1-65535)')
    return
  }
  
  portLoading.value = true
  portResult.value = null
  
  try {
    const result = await window.electronAPI.checkPort(port)
    if (result.success) {
      portResult.value = result.processes
      if (result.processes.length === 0) {
        ElMessage.success(`端口 ${port} 未被占用`)
      }
    } else {
      ElMessage.error(result.error || '检测失败')
    }
  } catch (error) {
    ElMessage.error('检测端口失败')
  } finally {
    portLoading.value = false
  }
}

const killProcess = async (pid: number) => {
  try {
    await ElMessageBox.confirm(
      `确定要终止进程 PID ${pid} 吗？`,
      '确认终止',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const result = await window.electronAPI.killProcess(pid)
    if (result.success) {
      ElMessage.success(result.message)
      // 刷新端口检测结果
      checkPort()
    } else {
      ElMessage.error(result.message)
    }
  } catch {
    // 用户取消
  }
}

// ========== DNS 查询 ==========
const domainInput = ref('')
const dnsType = ref('A')
const dnsServer = ref('')
const dnsLoading = ref(false)
const dnsResult = ref<any[] | null>(null)

const dnsTypes = [
  { label: 'A 记录', value: 'A' },
  { label: 'AAAA 记录', value: 'AAAA' },
  { label: 'CNAME 记录', value: 'CNAME' },
  { label: 'MX 记录', value: 'MX' },
  { label: 'TXT 记录', value: 'TXT' },
  { label: 'NS 记录', value: 'NS' }
]

const dnsServers = [
  { label: '系统默认', value: '' },
  { label: '阿里云 DNS', value: '223.5.5.5' },
  { label: '腾讯云 DNS', value: '119.29.29.29' },
  { label: '114 DNS', value: '114.114.114.114' },
  { label: 'Google DNS', value: '8.8.8.8' },
  { label: 'Cloudflare DNS', value: '1.1.1.1' }
]

const dnsLookup = async () => {
  if (!domainInput.value.trim()) {
    ElMessage.warning('请输入域名')
    return
  }
  
  dnsLoading.value = true
  dnsResult.value = null
  
  try {
    const result = await window.electronAPI.dnsLookup(
      domainInput.value.trim(),
      dnsType.value,
      dnsServer.value || undefined
    )
    if (result.success) {
      dnsResult.value = result.records
      if (result.records.length === 0) {
        ElMessage.info('未找到记录')
      }
    } else {
      ElMessage.error(result.error || '查询失败')
    }
  } catch (error) {
    ElMessage.error('DNS 查询失败')
  } finally {
    dnsLoading.value = false
  }
}

// ========== IP 信息 ==========
const ipLoading = ref(false)
const ipInfo = ref<{ localIp: string; publicIp: string; location: string } | null>(null)

const getIpInfo = async () => {
  ipLoading.value = true
  
  try {
    const result = await window.electronAPI.getIpInfo()
    if (result.success) {
      ipInfo.value = {
        localIp: result.localIp,
        publicIp: result.publicIp,
        location: result.location
      }
    } else {
      ElMessage.error(result.error || '获取 IP 信息失败')
    }
  } catch (error) {
    ElMessage.error('获取 IP 信息失败')
  } finally {
    ipLoading.value = false
  }
}

// ========== Ping / TCP 测试 ==========
const pingHost = ref('')
const pingCount = ref(4)
const pingLoading = ref(false)
const pingResults = ref<{ host: string; time: number; success: boolean }[]>([])
const pingStats = ref<{ avgTime: number; lossRate: number } | null>(null)

const tcpHost = ref('')
const tcpPort = ref(80)
const tcpTimeout = ref(5000)
const tcpLoading = ref(false)
const tcpResult = ref<{ connected: boolean; time: number; error?: string } | null>(null)

const doPing = async () => {
  if (!pingHost.value.trim()) {
    ElMessage.warning('请输入目标主机')
    return
  }
  
  pingLoading.value = true
  pingResults.value = []
  pingStats.value = null
  
  try {
    const result = await window.electronAPI.pingHost(pingHost.value.trim(), pingCount.value)
    
    if (result.success) {
      pingResults.value = result.results
      pingStats.value = { avgTime: result.avgTime, lossRate: result.lossRate }
    } else {
      ElMessage.error(result.error || 'Ping 失败')
    }
  } catch (error) {
    ElMessage.error('Ping 失败: ' + (error as Error).message)
  } finally {
    pingLoading.value = false
  }
}

const doTcpConnect = async () => {
  if (!tcpHost.value.trim()) {
    ElMessage.warning('请输入目标主机')
    return
  }
  
  tcpLoading.value = true
  tcpResult.value = null
  
  try {
    const result = await window.electronAPI.tcpConnect(
      tcpHost.value.trim(),
      tcpPort.value,
      tcpTimeout.value
    )
    if (result.success) {
      tcpResult.value = {
        connected: result.connected,
        time: result.time,
        error: result.error
      }
    } else {
      ElMessage.error(result.error || '连接测试失败')
    }
  } catch (error) {
    ElMessage.error('连接测试失败')
  } finally {
    tcpLoading.value = false
  }
}

// 获取延迟颜色 - 使用 Element Plus 主题变量
const getLatencyColor = (time: number) => {
  if (time < 0) return 'var(--el-color-danger)'
  if (time < 50) return 'var(--el-color-success)'
  if (time < 100) return 'var(--el-color-warning)'
  return 'var(--el-color-danger)'
}

// 页面加载时获取 IP 信息
onMounted(() => {
  getIpInfo()
})
</script>

<template>
  <div class="network-diagnostic">
    <!-- IP 信息卡片 -->
    <el-card class="ip-info-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon><Monitor /></el-icon>
            <span>IP 地址信息</span>
          </div>
          <el-button link :loading="ipLoading" @click="getIpInfo">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
      </template>
      
      <div v-if="ipInfo" class="ip-info-content">
        <div class="ip-item">
          <div class="ip-label">
            <el-icon><OfficeBuilding /></el-icon>
            <span>本机 IP</span>
          </div>
          <div class="ip-value">{{ ipInfo.localIp || '未获取' }}</div>
        </div>
        <div class="ip-item">
          <div class="ip-label">
            <el-icon><Position /></el-icon>
            <span>公网 IP</span>
          </div>
          <div class="ip-value">{{ ipInfo.publicIp || '未获取' }}</div>
        </div>
        <div class="ip-item">
          <div class="ip-label">
            <el-icon><Location /></el-icon>
            <span>归属地</span>
          </div>
          <div class="ip-value">{{ ipInfo.location || '未知' }}</div>
        </div>
      </div>
      <el-empty v-else description="加载中..." />
    </el-card>

    <el-row :gutter="20" class="main-content">
      <!-- 端口检测 -->
      <el-col :xs="24" :lg="12">
        <el-card class="tool-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <el-icon><Search /></el-icon>
                <span>端口占用检测</span>
              </div>
            </div>
          </template>
          
          <div class="tool-content">
            <el-input
              v-model="portInput"
              placeholder="输入端口号 (1-65535)"
              type="number"
              :min="1"
              :max="65535"
            >
              <template #append>
                <el-button :loading="portLoading" @click="checkPort">
                  检测
                </el-button>
              </template>
            </el-input>
            
            <div v-if="portResult !== null" class="result-section">
              <el-divider />
              <div v-if="portResult.length === 0" class="empty-result">
                <el-icon class="status-success" :size="40"><Check /></el-icon>
                <span>端口未被占用</span>
              </div>
              <div v-else>
                <div class="result-title">
                  <el-icon class="status-warning"><Warning /></el-icon>
                  <span>发现 {{ portResult.length }} 个进程占用此端口</span>
                </div>
                <el-table :data="portResult" size="small" stripe>
                  <el-table-column prop="pid" label="PID" width="80" />
                  <el-table-column prop="name" label="进程名" />
                  <el-table-column prop="protocol" label="协议" width="80" />
                  <el-table-column label="操作" width="80">
                    <template #default="{ row }">
                      <el-button
                        type="danger"
                        link
                        size="small"
                        @click="killProcess(row.pid)"
                      >
                        Kill
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- DNS 查询 -->
      <el-col :xs="24" :lg="12">
        <el-card class="tool-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <el-icon><Connection /></el-icon>
                <span>DNS 查询</span>
              </div>
            </div>
          </template>
          
          <div class="tool-content">
            <el-input
              v-model="domainInput"
              placeholder="输入域名，如: google.com"
              @keyup.enter="dnsLookup"
            >
              <template #append>
                <el-button :loading="dnsLoading" @click="dnsLookup">
                  查询
                </el-button>
              </template>
            </el-input>
            
            <div class="dns-options">
              <el-select v-model="dnsType" size="small" style="width: 120px">
                <el-option
                  v-for="type in dnsTypes"
                  :key="type.value"
                  :label="type.label"
                  :value="type.value"
                />
              </el-select>
              <el-select v-model="dnsServer" size="small" style="width: 140px; margin-left: 10px">
                <el-option
                  v-for="server in dnsServers"
                  :key="server.value"
                  :label="server.label"
                  :value="server.value"
                />
              </el-select>
            </div>
            
            <div v-if="dnsResult !== null" class="result-section">
              <el-divider />
              <div v-if="dnsResult.length === 0" class="empty-result">
                <el-icon class="status-info" :size="40"><InfoFilled /></el-icon>
                <span>未找到记录</span>
              </div>
              <div v-else>
                <div class="result-title">
                  <el-icon class="status-primary"><Check /></el-icon>
                  <span>找到 {{ dnsResult.length }} 条记录</span>
                </div>
                <el-table :data="dnsResult" size="small" stripe>
                  <el-table-column prop="type" label="类型" width="80" />
                  <el-table-column prop="value" label="记录值" show-overflow-tooltip />
                </el-table>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="main-content">
      <!-- Ping 测试 -->
      <el-col :xs="24" :lg="12">
        <el-card class="tool-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <el-icon><Timer /></el-icon>
                <span>Ping 测试</span>
              </div>
            </div>
          </template>
          
          <div class="tool-content">
            <el-input
              v-model="pingHost"
              placeholder="输入主机地址，如: baidu.com"
              @keyup.enter="doPing"
            >
              <template #prepend>
                <el-select v-model="pingCount" size="small" style="width: 80px">
                  <el-option :value="4" label="4 次" />
                  <el-option :value="8" label="8 次" />
                  <el-option :value="16" label="16 次" />
                </el-select>
              </template>
              <template #append>
                <el-button :loading="pingLoading" @click="doPing">
                  Ping
                </el-button>
              </template>
            </el-input>
            
            <div v-if="pingResults.length > 0" class="result-section">
              <el-divider />
              <div v-if="pingStats" class="ping-stats">
                <el-statistic title="平均延迟" :value="pingStats.avgTime" suffix="ms" />
                <el-statistic title="丢包率" :value="pingStats.lossRate" suffix="%" />
              </div>
              
              <div class="ping-chart">
                <div
                  v-for="(result, index) in pingResults"
                  :key="index"
                  class="ping-bar"
                  :style="{
                    height: result.success ? Math.min(result.time / 2, 100) + 'px' : '4px',
                    backgroundColor: getLatencyColor(result.time)
                  }"
                  :title="result.success ? `${result.time}ms` : '超时'"
                />
              </div>
              
              <div class="ping-legend">
                <span
                  v-for="(result, index) in pingResults"
                  :key="index"
                  class="ping-dot"
                  :style="{ backgroundColor: getLatencyColor(result.time) }"
                  :title="result.success ? `${index + 1}: ${result.time}ms` : `${index + 1}: 超时`"
                />
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- TCP 连通测试 -->
      <el-col :xs="24" :lg="12">
        <el-card class="tool-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <el-icon><Link /></el-icon>
                <span>TCP 连通测试</span>
              </div>
            </div>
          </template>
          
          <div class="tool-content">
            <el-input
              v-model="tcpHost"
              placeholder="输入主机地址"
              @keyup.enter="doTcpConnect"
            >
              <template #prepend>
                <el-input-number
                  v-model="tcpPort"
                  :min="1"
                  :max="65535"
                  controls-position="right"
                  style="width: 100px"
                />
              </template>
              <template #append>
                <el-button :loading="tcpLoading" @click="doTcpConnect">
                  测试
                </el-button>
              </template>
            </el-input>
            
            <div class="tcp-options">
              <span>超时:</span>
              <el-radio-group v-model="tcpTimeout" size="small">
                <el-radio-button :value="3000">3s</el-radio-button>
                <el-radio-button :value="5000">5s</el-radio-button>
                <el-radio-button :value="10000">10s</el-radio-button>
              </el-radio-group>
            </div>
            
            <div v-if="tcpResult" class="result-section">
              <el-divider />
              <div class="tcp-result">
                <div v-if="tcpResult.connected" class="tcp-success">
                  <el-icon class="tcp-success-icon" :size="50"><CircleCheck /></el-icon>
                  <div class="tcp-status">连接成功</div>
                  <div class="tcp-time">{{ tcpResult.time }}ms</div>
                </div>
                <div v-else class="tcp-fail">
                  <el-icon class="tcp-fail-icon" :size="50"><CircleClose /></el-icon>
                  <div class="tcp-status">连接失败</div>
                  <div class="tcp-error">{{ tcpResult.error || '无法连接到目标' }}</div>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.network-diagnostic {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.ip-info-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
}

.ip-info-content {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
}

.ip-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ip-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.ip-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  font-family: 'Courier New', monospace;
}

.main-content {
  margin-bottom: 20px;
}

.tool-card {
  height: 100%;
  margin-bottom: 20px;
}

.tool-content {
  padding: 10px 0;
}

.dns-options {
  margin-top: 15px;
  display: flex;
  align-items: center;
}

.tcp-options {
  margin-top: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.tcp-options span {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.result-section {
  margin-top: 20px;
}

.empty-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 30px;
  color: var(--el-text-color-secondary);
}

.result-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
  font-size: 14px;
}

.ping-stats {
  display: flex;
  gap: 40px;
  margin-bottom: 20px;
}

.ping-chart {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 4px;
  height: 120px;
  padding: 10px;
  background-color: var(--el-fill-color-light);
  border-radius: 8px;
  margin-bottom: 10px;
}

.ping-bar {
  width: 16px;
  min-height: 4px;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.ping-legend {
  display: flex;
  justify-content: center;
  gap: 4px;
}

.ping-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.tcp-result {
  display: flex;
  justify-content: center;
  padding: 30px;
}

.tcp-success,
.tcp-fail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.tcp-success-icon {
  color: var(--el-color-success);
}

.tcp-fail-icon {
  color: var(--el-color-danger);
}

.tcp-status {
  font-size: 18px;
  font-weight: 600;
}

.tcp-time {
  font-size: 24px;
  color: var(--el-text-color-primary);
  font-family: 'Courier New', monospace;
}

.tcp-error {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

/* 状态图标颜色 */
.status-success {
  color: var(--el-color-success);
}

.status-warning {
  color: var(--el-color-danger);
}

.status-info {
  color: var(--el-text-color-secondary);
}

.status-primary {
  color: var(--el-color-primary);
}

:deep(.el-card__header) {
  padding: 15px 20px;
  background-color: var(--el-fill-color-light);
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-statistic__content) {
  font-size: 24px;
  font-weight: 600;
}
</style>
