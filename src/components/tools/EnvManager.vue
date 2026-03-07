<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useEnvStore } from '../../stores/envStore'
import type { EnvVariable } from '../../types'
import { Search, Plus, Folder, FolderOpened, Refresh, Edit, Delete, Upload, Download, MoreFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const envStore = useEnvStore()
const showAddGroup = ref(false)
const showEditGroup = ref(false)
const showAddVariable = ref(false)
const showEditVariable = ref(false)

const groupForm = ref({
  name: '',
  description: '',
  color: '#409EFF'
})

const editGroupForm = ref({
  id: '',
  name: '',
  description: '',
  color: '#409EFF'
})

const variableForm = ref({
  name: '',
  value: '',
  groupId: 'default',
  applyToSystem: false
})

const editVariableForm = ref({
  id: '',
  name: '',
  value: '',
  groupId: ''
})

onMounted(() => {
  envStore.loadData()
})

// 分组操作
const handleAddGroup = async () => {
  if (!groupForm.value.name.trim()) {
    ElMessage.warning('请输入分组名称')
    return
  }
  const success = await envStore.addGroup({
    name: groupForm.value.name.trim(),
    description: groupForm.value.description.trim(),
    color: groupForm.value.color
  })
  if (success) {
    ElMessage.success('分组创建成功')
    showAddGroup.value = false
    groupForm.value = { name: '', description: '', color: '#409EFF' }
  }
}

const openEditGroup = (group: any) => {
  if (group.id === 'system' || group.id === 'default') return
  editGroupForm.value = { ...group }
  showEditGroup.value = true
}

const handleEditGroup = async () => {
  if (!editGroupForm.value.name.trim()) {
    ElMessage.warning('请输入分组名称')
    return
  }
  const success = await envStore.updateGroup(editGroupForm.value.id, {
    name: editGroupForm.value.name.trim(),
    description: editGroupForm.value.description.trim(),
    color: editGroupForm.value.color
  })
  if (success) {
    ElMessage.success('分组更新成功')
    showEditGroup.value = false
  }
}

const handleDeleteGroup = async (group: any) => {
  if (group.id === 'system' || group.id === 'default') return
  try {
    await ElMessageBox.confirm(
      `确定要删除分组 "${group.name}" 吗？该分组下的变量将被移动到默认分组。`,
      '确认删除',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    const success = await envStore.deleteGroup(group.id)
    if (success) ElMessage.success('分组删除成功')
  } catch {}
}

// 变量操作
const openAddVariable = () => {
  variableForm.value = { name: '', value: '', groupId: envStore.selectedGroupId === 'all' ? 'default' : envStore.selectedGroupId, applyToSystem: false }
  showAddVariable.value = true
}

const handleAddVariable = async () => {
  if (!variableForm.value.name.trim() || !variableForm.value.value.trim()) {
    ElMessage.warning('请输入变量名称和值')
    return
  }
  const success = await envStore.addVariable({
    name: variableForm.value.name.trim(),
    value: variableForm.value.value,
    groupId: variableForm.value.groupId
  })
  if (success) {
    if (variableForm.value.applyToSystem) {
      const variable = envStore.variables.find(v => v.name === variableForm.value.name.trim())
      if (variable) await envStore.applyToSystem(variable)
    }
    ElMessage.success('变量添加成功')
    showAddVariable.value = false
  }
}

const openEditVariable = (variable: EnvVariable) => {
  editVariableForm.value = { ...variable }
  showEditVariable.value = true
}

const handleEditVariable = async () => {
  const success = await envStore.updateVariable(editVariableForm.value.id, {
    name: editVariableForm.value.name.trim(),
    value: editVariableForm.value.value,
    groupId: editVariableForm.value.groupId
  })
  if (success) {
    ElMessage.success('变量更新成功')
    showEditVariable.value = false
  }
}

const handleDeleteVariable = async (variable: EnvVariable) => {
  try {
    const isInSystem = await envStore.isVariableInSystem(variable.name)
    let deleteFromSystem = false
    
    if (variable.isSystem) {
      await ElMessageBox.confirm(
        `确定要删除系统环境变量 "${variable.name}" 吗？这将从系统中永久删除。`,
        '确认删除', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
      )
      deleteFromSystem = true
    } else if (isInSystem) {
      const result = await ElMessageBox.confirm(
        `变量 "${variable.name}" 已应用到系统环境变量。\n\n是否同时从系统中删除？`,
        '确认删除',
        { confirmButtonText: '同时删除系统变量', cancelButtonText: '仅删除本地记录', type: 'warning', distinguishCancelAndClose: true }
      ).catch((action) => action === 'cancel' ? 'cancel' : Promise.reject(action))
      deleteFromSystem = result !== 'cancel'
    } else {
      await ElMessageBox.confirm(`确定要删除环境变量 "${variable.name}" 吗？`, '确认删除', {
        confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
      })
    }
    
    const success = await envStore.deleteVariable(variable.id, deleteFromSystem)
    if (success) ElMessage.success('删除成功')
  } catch {}
}

const handleApplyToSystem = async (variable: EnvVariable) => {
  try {
    await ElMessageBox.confirm(`确定要将 "${variable.name}" 应用到系统环境变量吗？`, '确认应用', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'info'
    })
    const success = await envStore.applyToSystem(variable)
    if (success) ElMessage.success('已成功应用到系统环境变量')
    else ElMessage.error('应用失败，可能需要管理员权限')
  } catch {}
}

const handleSync = async () => {
  await envStore.syncSystemEnv()
  ElMessage.success('系统环境变量同步完成')
}

const handleExport = () => {
  const data = { groups: envStore.groups, variables: envStore.variables }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `env-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('导出成功')
}

const handleImport = async () => {
  try {
    const result = await window.electronAPI.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'JSON 文件', extensions: ['json'] }, { name: '所有文件', extensions: ['*'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return
    
    const content = await window.electronAPI.readFile(result.filePaths[0])
    const data = JSON.parse(content)
    
    if (!data.groups || !Array.isArray(data.groups) || !data.variables || !Array.isArray(data.variables)) {
      ElMessage.error('文件格式不正确')
      return
    }
    
    const confirmResult = await window.electronAPI.showMessageBox({
      type: 'question', title: '确认导入',
      message: `确定要导入数据吗？这将覆盖现有的 ${envStore.groups.length} 个分组和 ${envStore.variables.length} 个变量。`,
      buttons: ['确定', '取消'], defaultId: 0, cancelId: 1
    })
    
    if (confirmResult.response !== 0) return
    
    const success = await envStore.importData(data)
    if (success) ElMessage.success('导入成功')
    else ElMessage.error('导入失败')
  } catch {
    ElMessage.error('导入失败，请检查文件格式')
  }
}

const maskedValue = (value: string) => value.length <= 10 ? value : value.substring(0, 5) + '***' + value.substring(value.length - 5)
const getGroupName = (groupId: string) => envStore.getGroupById(groupId)?.name || '未知分组'
const getGroupColor = (groupId: string) => envStore.getGroupById(groupId)?.color || '#909399'
</script>

<template>
  <div class="env-manager">
    <!-- 左侧分组侧边栏 -->
    <div class="env-sidebar">
      <div class="search-box">
        <el-input v-model="envStore.searchQuery" placeholder="搜索环境变量..." clearable :prefix-icon="Search" />
      </div>
      
      <div class="menu-header">
        <span>分组</span>
        <el-button type="primary" link :icon="Plus" @click="showAddGroup = true">新建</el-button>
      </div>
      
      <div class="menu-list">
        <div class="menu-item" :class="{ active: envStore.selectedGroupId === 'all' }" @click="envStore.selectedGroupId = 'all'">
          <el-icon><Folder /></el-icon>
          <span class="menu-text">全部变量</span>
          <el-tag size="small" type="info">{{ envStore.variables.length }}</el-tag>
        </div>
        <div v-for="group in envStore.groups" :key="group.id" class="menu-item"
             :class="{ active: envStore.selectedGroupId === group.id }"
             :style="{ borderLeftColor: group.color }" @click="envStore.selectedGroupId = group.id">
          <el-icon><FolderOpened /></el-icon>
          <span class="menu-text">{{ group.name }}</span>
          <el-tag size="small" :color="group.color" effect="dark">{{ envStore.getVariableCount(group.id) }}</el-tag>
          <el-dropdown v-if="group.id !== 'system' && group.id !== 'default'" @command="(cmd: string) => cmd === 'edit' ? openEditGroup(group) : handleDeleteGroup(group)">
            <el-icon class="group-more" @click.stop><MoreFilled /></el-icon>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="edit" :icon="Edit">编辑</el-dropdown-item>
                <el-dropdown-item command="delete" :icon="Delete" divided>删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
      
      <div class="sidebar-footer">
        <el-button type="primary" :icon="Refresh" @click="handleSync" :loading="envStore.loading" size="small">同步系统变量</el-button>
      </div>
    </div>
    
    <!-- 右侧变量列表 -->
    <div class="env-content">
      <div class="env-header">
        <div class="header-left">
          <h3>{{ envStore.selectedGroupId === 'all' ? '全部变量' : getGroupName(envStore.selectedGroupId) }}</h3>
        </div>
        <div class="header-right">
          <el-button type="primary" :icon="Plus" @click="openAddVariable">添加变量</el-button>
          <el-button :icon="Upload" @click="handleImport">导入</el-button>
          <el-button :icon="Download" @click="handleExport">导出</el-button>
        </div>
      </div>
      
      <el-table :data="envStore.filteredVariables" v-loading="envStore.loading" style="flex: 1;">
        <el-table-column type="index" width="50" />
        <el-table-column label="变量名称" min-width="180">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 8px;">
              <el-tag v-if="row.isSystem" size="small" type="danger" effect="plain">系统</el-tag>
              <span :style="{ color: row.isSystem ? '#f56c6c' : '#303133' }">{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="变量值" min-width="250">
          <template #default="{ row }">
            <span class="value-text">{{ maskedValue(row.value) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="所属分组" width="150">
          <template #default="{ row }">
            <el-tag size="small" :color="getGroupColor(row.groupId)" effect="dark">{{ getGroupName(row.groupId) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="Edit" @click="openEditVariable(row)">编辑</el-button>
            <el-button v-if="!row.isSystem" link type="success" @click="handleApplyToSystem(row)">应用到系统</el-button>
            <el-button link type="danger" :icon="Delete" @click="handleDeleteVariable(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <!-- 添加分组对话框 -->
    <el-dialog v-model="showAddGroup" title="新建分组" width="400px" destroy-on-close>
      <el-form :model="groupForm" label-width="80px">
        <el-form-item label="分组名称"><el-input v-model="groupForm.name" placeholder="请输入分组名称" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="groupForm.description" placeholder="请输入描述（可选）" /></el-form-item>
        <el-form-item label="颜色"><el-color-picker v-model="groupForm.color" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddGroup = false">取消</el-button>
        <el-button type="primary" @click="handleAddGroup">确定</el-button>
      </template>
    </el-dialog>
    
    <!-- 编辑分组对话框 -->
    <el-dialog v-model="showEditGroup" title="编辑分组" width="400px" destroy-on-close>
      <el-form :model="editGroupForm" label-width="80px">
        <el-form-item label="分组名称"><el-input v-model="editGroupForm.name" placeholder="请输入分组名称" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="editGroupForm.description" placeholder="请输入描述（可选）" /></el-form-item>
        <el-form-item label="颜色"><el-color-picker v-model="editGroupForm.color" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditGroup = false">取消</el-button>
        <el-button type="primary" @click="handleEditGroup">确定</el-button>
      </template>
    </el-dialog>
    
    <!-- 添加变量对话框 -->
    <el-dialog v-model="showAddVariable" title="添加环境变量" width="500px" destroy-on-close>
      <el-form :model="variableForm" label-width="100px">
        <el-form-item label="变量名称"><el-input v-model="variableForm.name" placeholder="请输入变量名称" /></el-form-item>
        <el-form-item label="变量值"><el-input v-model="variableForm.value" type="textarea" :rows="3" placeholder="请输入变量值" /></el-form-item>
        <el-form-item label="所属分组">
          <el-select v-model="variableForm.groupId" placeholder="选择分组" style="width: 100%">
            <el-option v-for="group in envStore.groups" :key="group.id" :label="group.name" :value="group.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="应用到系统">
          <el-switch v-model="variableForm.applyToSystem" />
          <span style="margin-left: 10px; color: #909399; font-size: 12px;">开启后将同时设置到系统环境变量</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddVariable = false">取消</el-button>
        <el-button type="primary" @click="handleAddVariable">确定</el-button>
      </template>
    </el-dialog>
    
    <!-- 编辑变量对话框 -->
    <el-dialog v-model="showEditVariable" title="编辑环境变量" width="500px" destroy-on-close>
      <el-form :model="editVariableForm" label-width="100px">
        <el-form-item label="变量名称"><el-input v-model="editVariableForm.name" placeholder="请输入变量名称" /></el-form-item>
        <el-form-item label="变量值"><el-input v-model="editVariableForm.value" type="textarea" :rows="3" placeholder="请输入变量值" /></el-form-item>
        <el-form-item label="所属分组">
          <el-select v-model="editVariableForm.groupId" placeholder="选择分组" style="width: 100%">
            <el-option v-for="group in envStore.groups" :key="group.id" :label="group.name" :value="group.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditVariable = false">取消</el-button>
        <el-button type="primary" @click="handleEditVariable">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.env-manager {
  display: flex;
  height: 100%;
  background: var(--card-bg);
  border-radius: 8px;
  overflow: hidden;
  transition: background-color 0.3s ease;
}

.env-sidebar {
  width: 240px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.search-box {
  padding: 12px;
}

.menu-header {
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--text-tertiary);
  transition: color 0.3s ease;
}

.menu-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 3px solid transparent;
  color: var(--text-secondary);
}

.menu-item:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.menu-item.active {
  background: var(--hover-bg);
  border-left-color: var(--primary-color);
  color: var(--text-primary);
}

.menu-text {
  flex: 1;
  font-size: 14px;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--border-color);
  transition: border-color 0.3s ease;
}

.env-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--card-bg);
  transition: background-color 0.3s ease;
}

.env-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid var(--border-color);
  transition: border-color 0.3s ease;
}

.header-left h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.header-right {
  display: flex;
  gap: 8px;
}

.value-text {
  font-family: 'Courier New', monospace;
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.group-more {
  opacity: 0;
  transition: opacity 0.2s;
  padding: 4px;
  border-radius: 4px;
  color: var(--text-secondary);
}

.menu-item:hover .group-more {
  opacity: 1;
}

.group-more:hover {
  background: var(--hover-bg);
}

/* Element Plus 表格暗黑模式适配 */
:deep(.el-table) {
  background-color: var(--card-bg);
}

:deep(.el-table__header-wrapper th) {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

:deep(.el-table__row) {
  background-color: var(--card-bg);
  color: var(--text-secondary);
}

:deep(.el-table__row:hover > td) {
  background-color: var(--hover-bg) !important;
}

:deep(.el-table__empty-block) {
  background-color: var(--card-bg);
}

:deep(.el-table__empty-text) {
  color: var(--text-tertiary);
}
</style>
