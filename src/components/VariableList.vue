<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEnvStore } from '../stores/envStore'
import { Delete, Edit, View, Hide, CopyDocument, SetUp } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { EnvVariable } from '../types'

const envStore = useEnvStore()
const emit = defineEmits<{
  editVariable: [variable: EnvVariable]
}>()
const showValues = ref<Set<string>>(new Set())

const emptyText = computed(() => {
  if (envStore.searchQuery) {
    return '没有找到匹配的环境变量'
  }
  if (envStore.selectedGroupId !== 'all') {
    return '该分组暂无环境变量'
  }
  return '暂无环境变量，点击右上角添加'
})

const maskedValue = (value: string) => {
  if (value.length <= 10) {
    return value
  }
  return value.substring(0, 5) + '***' + value.substring(value.length - 5)
}

const toggleShowValue = (id: string) => {
  if (showValues.value.has(id)) {
    showValues.value.delete(id)
  } else {
    showValues.value.add(id)
  }
}

const copyValue = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

const getGroupName = (groupId: string) => {
  const group = envStore.getGroupById(groupId)
  return group?.name || '未知分组'
}

const getGroupColor = (groupId: string) => {
  const group = envStore.getGroupById(groupId)
  return group?.color || '#909399'
}

const handleEdit = (row: EnvVariable) => {
  // 通过 emit 通知父组件打开编辑对话框
  emit('editVariable', row)
}

const handleDelete = async (row: EnvVariable) => {
  try {
    // 检查变量是否存在于系统中
    const isInSystem = await envStore.isVariableInSystem(row.name)
    
    let deleteFromSystem = false
    
    // 如果是系统变量，或变量存在于系统中
    if (row.isSystem) {
      await ElMessageBox.confirm(
        `确定要删除系统环境变量 "${row.name}" 吗？这将从系统中永久删除。`,
        '确认删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      deleteFromSystem = true
    } else if (isInSystem) {
      // 变量存在于系统中，询问是否同时删除
      const result = await ElMessageBox.confirm(
        `变量 "${row.name}" 已应用到系统环境变量。\n\n是否同时从系统中删除？`,
        '确认删除',
        {
          confirmButtonText: '同时删除系统变量',
          cancelButtonText: '仅删除本地记录',
          type: 'warning',
          distinguishCancelAndClose: true
        }
      ).catch((action) => {
        if (action === 'cancel') {
          return 'cancel' // 用户选择仅删除本地
        }
        throw action // 用户关闭对话框，取消操作
      })
      
      if (result === 'cancel') {
        deleteFromSystem = false
      } else {
        deleteFromSystem = true
      }
    } else {
      // 普通变量，不在系统中
      await ElMessageBox.confirm(
        `确定要删除环境变量 "${row.name}" 吗？`,
        '确认删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    }
    
    const success = await envStore.deleteVariable(row.id, deleteFromSystem)
    if (success) {
      ElMessage.success('删除成功')
    } else {
      ElMessage.error('删除失败')
    }
  } catch {
    // 用户取消
  }
}

const handleApply = async (row: EnvVariable) => {
  try {
    await ElMessageBox.confirm(
      `确定要将 "${row.name}" 应用到系统环境变量吗？`,
      '确认应用',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    const success = await envStore.applyToSystem(row)
    if (success) {
      ElMessage.success('已成功应用到系统环境变量')
    } else {
      ElMessage.error('应用失败，可能需要管理员权限')
    }
  } catch {
    // 用户取消
  }
}
</script>

<template>
  <div class="variable-list">
    <el-table
      :data="envStore.filteredVariables"
      style="width: 100%"
      v-loading="envStore.loading"
      :empty-text="emptyText"
    >
      <el-table-column type="index" width="50" />
      
      <el-table-column label="变量名称" min-width="180">
        <template #default="{ row }">
          <div class="var-name">
            <el-tag v-if="row.isSystem" size="small" type="danger" effect="plain">系统</el-tag>
            <el-tag v-if="row.isMachine" size="small" type="warning" effect="plain">机器</el-tag>
            <span :class="{ 'system-var': row.isSystem }">{{ row.name }}</span>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column label="变量值" min-width="250">
        <template #default="{ row }">
          <div class="var-value">
            <el-tooltip :content="row.value" placement="top" :show-after="500">
              <span class="value-text">
                {{ showValues.has(row.id) ? row.value : maskedValue(row.value) }}
              </span>
            </el-tooltip>
            <el-button
              link
              :icon="showValues.has(row.id) ? Hide : View"
              @click="toggleShowValue(row.id)"
            />
            <el-button
              link
              :icon="CopyDocument"
              @click="copyValue(row.value)"
            />
          </div>
        </template>
      </el-table-column>
      
      <el-table-column label="所属分组" width="150">
        <template #default="{ row }">
          <el-tag
            size="small"
            :color="getGroupColor(row.groupId)"
            effect="dark"
          >
            {{ getGroupName(row.groupId) }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button
            link
            type="primary"
            :icon="Edit"
            @click="handleEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            v-if="!row.isSystem"
            link
            type="success"
            :icon="SetUp"
            @click="handleApply(row)"
          >
            应用到系统
          </el-button>
          <el-button
            link
            type="danger"
            :icon="Delete"
            @click="handleDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.variable-list {
  flex: 1;
  padding: 20px;
  overflow: auto;
}

.var-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Courier New', monospace;
  font-weight: 500;
}

.system-var {
  color: #f56c6c;
}

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

.var-value {
  display: flex;
  align-items: center;
  gap: 8px;
}

.value-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'Courier New', monospace;
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
  transition: background-color 0.3s ease, color 0.3s ease;
}
</style>
