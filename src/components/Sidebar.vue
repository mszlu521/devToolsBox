<template>
  <div class="sidebar">
    <div class="logo">
      <el-icon :size="28" color="#409EFF"><Setting /></el-icon>
      <span>环境变量管理器</span>
    </div>

    <div class="search-box">
      <el-input
        v-model="envStore.searchQuery"
        placeholder="搜索环境变量..."
        clearable
        :prefix-icon="Search"
      />
    </div>

    <div class="menu-header">
      <span>分组</span>
      <el-button type="primary" link :icon="Plus" @click="showAddGroup = true">
        新建分组
      </el-button>
    </div>

    <div class="menu-list">
      <div
        class="menu-item"
        :class="{ active: envStore.selectedGroupId === 'all' }"
        @click="envStore.selectedGroupId = 'all'"
      >
        <el-icon><Folder /></el-icon>
        <span class="menu-text">全部变量</span>
        <el-tag size="small" type="info">{{ envStore.variables.length }}</el-tag>
      </div>

      <div
        v-for="group in envStore.groups"
        :key="group.id"
        class="menu-item"
        :class="{ active: envStore.selectedGroupId === group.id }"
        :style="{ borderLeftColor: group.color }"
        @click="envStore.selectedGroupId = group.id"
        @contextmenu.prevent="handleContextMenu($event, group)"
      >
        <el-icon><FolderOpened /></el-icon>
        <span class="menu-text">{{ group.name }}</span>
        <el-tag size="small" :color="group.color" effect="dark">
          {{ envStore.getVariableCount(group.id) }}
        </el-tag>
      </div>
    </div>

    <div class="sidebar-footer">
      <el-button type="primary" :icon="Refresh" @click="handleSync" :loading="envStore.loading">
        同步系统变量
      </el-button>
    </div>

    <!-- 添加分组对话框 -->
    <el-dialog
      v-model="showAddGroup"
      title="新建分组"
      width="400px"
      destroy-on-close
    >
      <el-form :model="groupForm" label-width="80px">
        <el-form-item label="分组名称">
          <el-input v-model="groupForm.name" placeholder="请输入分组名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="groupForm.description" placeholder="请输入描述（可选）" />
        </el-form-item>
        <el-form-item label="颜色">
          <el-color-picker v-model="groupForm.color" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddGroup = false">取消</el-button>
        <el-button type="primary" @click="handleAddGroup">确定</el-button>
      </template>
    </el-dialog>

    <!-- 编辑分组对话框 -->
    <el-dialog
      v-model="showEditGroup"
      title="编辑分组"
      width="400px"
      destroy-on-close
    >
      <el-form :model="editGroupForm" label-width="80px">
        <el-form-item label="分组名称">
          <el-input v-model="editGroupForm.name" placeholder="请输入分组名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editGroupForm.description" placeholder="请输入描述（可选）" />
        </el-form-item>
        <el-form-item label="颜色">
          <el-color-picker v-model="editGroupForm.color" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditGroup = false">取消</el-button>
        <el-button type="primary" @click="handleEditGroup">确定</el-button>
      </template>
    </el-dialog>

    <!-- 右键菜单 -->
    <el-dropdown
      ref="contextMenuRef"
      trigger="contextmenu"
      @visible-change="onContextMenuVisibleChange"
    >
      <div style="position: fixed;" :style="contextMenuStyle"></div>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item :icon="Edit" @click="openEditGroup">编辑分组</el-dropdown-item>
          <el-dropdown-item :icon="Delete" @click="handleDeleteGroup" divided>删除分组</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useEnvStore } from '../stores/envStore'
import { Search, Plus, Folder, FolderOpened, Refresh, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { EnvGroup } from '../types'

const envStore = useEnvStore()
const showAddGroup = ref(false)
const showEditGroup = ref(false)
const contextMenuRef = ref()
const selectedGroup = ref<EnvGroup | null>(null)

const contextMenuStyle = reactive({
  left: '0px',
  top: '0px'
})

const groupForm = reactive({
  name: '',
  description: '',
  color: '#409EFF'
})

const editGroupForm = reactive({
  id: '',
  name: '',
  description: '',
  color: '#409EFF'
})

const handleAddGroup = async () => {
  if (!groupForm.name.trim()) {
    ElMessage.warning('请输入分组名称')
    return
  }
  
  const success = await envStore.addGroup({
    name: groupForm.name.trim(),
    description: groupForm.description.trim(),
    color: groupForm.color
  })
  
  if (success) {
    ElMessage.success('分组创建成功')
    showAddGroup.value = false
    groupForm.name = ''
    groupForm.description = ''
    groupForm.color = '#409EFF'
  } else {
    ElMessage.error('创建失败')
  }
}

const handleContextMenu = (e: MouseEvent, group: EnvGroup) => {
  if (group.id === 'system' || group.id === 'default') {
    return
  }
  selectedGroup.value = group
  contextMenuStyle.left = e.clientX + 'px'
  contextMenuStyle.top = e.clientY + 'px'
  contextMenuRef.value?.handleOpen()
}

const onContextMenuVisibleChange = (visible: boolean) => {
  if (!visible) {
    selectedGroup.value = null
  }
}

const openEditGroup = () => {
  if (selectedGroup.value) {
    editGroupForm.id = selectedGroup.value.id
    editGroupForm.name = selectedGroup.value.name
    editGroupForm.description = selectedGroup.value.description || ''
    editGroupForm.color = selectedGroup.value.color || '#409EFF'
    showEditGroup.value = true
  }
}

const handleEditGroup = async () => {
  if (!editGroupForm.name.trim()) {
    ElMessage.warning('请输入分组名称')
    return
  }
  
  const success = await envStore.updateGroup(editGroupForm.id, {
    name: editGroupForm.name.trim(),
    description: editGroupForm.description.trim(),
    color: editGroupForm.color
  })
  
  if (success) {
    ElMessage.success('分组更新成功')
    showEditGroup.value = false
  } else {
    ElMessage.error('更新失败')
  }
}

const handleDeleteGroup = async () => {
  if (!selectedGroup.value) return
  
  try {
    await ElMessageBox.confirm(
      `确定要删除分组 "${selectedGroup.value.name}" 吗？该分组下的变量将被移动到默认分组。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const success = await envStore.deleteGroup(selectedGroup.value.id)
    if (success) {
      ElMessage.success('分组删除成功')
    } else {
      ElMessage.error('删除失败')
    }
  } catch {
    // 用户取消
  }
}

const handleSync = async () => {
  await envStore.syncSystemEnv()
  ElMessage.success('系统环境变量同步完成')
}
</script>

<style scoped>
.sidebar {
  width: 260px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid #e4e7ed;
  gap: 12px;
}

.logo span {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.search-box {
  padding: 15px;
}

.menu-header {
  padding: 10px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #909399;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.menu-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 10px;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  border-left: 3px solid transparent;
  gap: 10px;
}

.menu-item:hover {
  background: #f5f7fa;
}

.menu-item.active {
  background: #ecf5ff;
  color: #409EFF;
}

.menu-text {
  flex: 1;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-footer {
  padding: 15px;
  border-top: 1px solid #e4e7ed;
}

.sidebar-footer .el-button {
  width: 100%;
}
</style>
