<template>
  <div class="header">
    <div class="header-left">
      <h2>{{ pageTitle }}</h2>
      <el-tag v-if="envStore.selectedGroupId !== 'all'" :color="currentGroup?.color" effect="dark">
        {{ currentGroup?.name }}
      </el-tag>
    </div>
    <div class="header-right">
      <el-button type="primary" :icon="Plus" @click="showAddVariable = true">
        添加变量
      </el-button>
      <el-button :icon="Upload" @click="handleImport">
        导入
      </el-button>
      <el-button :icon="Download" @click="handleExport">
        导出
      </el-button>
    </div>
  </div>

  <!-- 添加变量对话框 -->
  <el-dialog
    v-model="showAddVariable"
    title="添加环境变量"
    width="500px"
    destroy-on-close
  >
    <el-form :model="variableForm" label-width="100px" :rules="rules" ref="formRef">
      <el-form-item label="变量名称" prop="name">
        <el-input v-model="variableForm.name" placeholder="请输入变量名称" />
      </el-form-item>
      <el-form-item label="变量值" prop="value">
        <el-input
          v-model="variableForm.value"
          type="textarea"
          :rows="3"
          placeholder="请输入变量值"
        />
      </el-form-item>
      <el-form-item label="所属分组" prop="groupId">
        <el-select v-model="variableForm.groupId" placeholder="选择分组" style="width: 100%">
          <el-option
            v-for="group in envStore.groups"
            :key="group.id"
            :label="group.name"
            :value="group.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="应用到系统">
        <el-switch v-model="variableForm.applyToSystem" />
        <span class="form-tip">开启后将同时设置到系统环境变量</span>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="showAddVariable = false">取消</el-button>
      <el-button type="primary" @click="handleAddVariable" :loading="loading">
        确定
      </el-button>
    </template>
  </el-dialog>

  <!-- 编辑变量对话框 -->
  <el-dialog
    v-model="showEditVariable"
    title="编辑环境变量"
    width="500px"
    destroy-on-close
  >
    <el-form :model="editVariableForm" label-width="100px" :rules="rules" ref="editFormRef">
      <el-form-item label="变量名称" prop="name">
        <el-input v-model="editVariableForm.name" placeholder="请输入变量名称" />
      </el-form-item>
      <el-form-item label="变量值" prop="value">
        <el-input
          v-model="editVariableForm.value"
          type="textarea"
          :rows="3"
          placeholder="请输入变量值"
        />
      </el-form-item>
      <el-form-item label="所属分组" prop="groupId">
        <el-select v-model="editVariableForm.groupId" placeholder="选择分组" style="width: 100%">
          <el-option
            v-for="group in envStore.groups"
            :key="group.id"
            :label="group.name"
            :value="group.id"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="showEditVariable = false">取消</el-button>
      <el-button type="primary" @click="handleEditVariable" :loading="loading">
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useEnvStore } from '../stores/envStore'
import { Plus, Upload, Download } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import type { EnvVariable } from '../types'

const envStore = useEnvStore()
const showAddVariable = ref(false)
const showEditVariable = ref(false)
const loading = ref(false)
const formRef = ref<FormInstance>()
const editFormRef = ref<FormInstance>()

const variableForm = reactive({
  name: '',
  value: '',
  groupId: envStore.selectedGroupId === 'all' ? 'default' : envStore.selectedGroupId,
  applyToSystem: false
})

const editVariableForm = reactive({
  id: '',
  name: '',
  value: '',
  groupId: ''
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入变量名称', trigger: 'blur' },
    { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '变量名称格式不正确', trigger: 'blur' }
  ],
  value: [
    { required: true, message: '请输入变量值', trigger: 'blur' }
  ],
  groupId: [
    { required: true, message: '请选择分组', trigger: 'change' }
  ]
}

const pageTitle = computed(() => {
  if (envStore.selectedGroupId === 'all') {
    return '全部环境变量'
  }
  return '分组环境变量'
})

const currentGroup = computed(() => {
  return envStore.getGroupById(envStore.selectedGroupId)
})

const handleAddVariable = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      
      // 检查变量名是否已存在
      const exists = envStore.variables.some(
        v => v.name.toLowerCase() === variableForm.name.toLowerCase()
      )
      if (exists) {
        ElMessage.warning('变量名称已存在')
        loading.value = false
        return
      }
      
      const success = await envStore.addVariable({
        name: variableForm.name.trim(),
        value: variableForm.value,
        groupId: variableForm.groupId,
        isSystem: false
      })
      
      if (success) {
        // 如果选择了应用到系统
        if (variableForm.applyToSystem) {
          const newVar = envStore.variables.find(
            v => v.name === variableForm.name.trim()
          )
          if (newVar) {
            await envStore.applyToSystem(newVar)
          }
        }
        
        ElMessage.success('变量添加成功')
        showAddVariable.value = false
        variableForm.name = ''
        variableForm.value = ''
        variableForm.applyToSystem = false
      } else {
        ElMessage.error('添加失败')
      }
      
      loading.value = false
    }
  })
}

const handleEditVariable = async () => {
  if (!editFormRef.value) return
  
  await editFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      
      const success = await envStore.updateVariable(editVariableForm.id, {
        name: editVariableForm.name.trim(),
        value: editVariableForm.value,
        groupId: editVariableForm.groupId
      })
      
      if (success) {
        ElMessage.success('变量更新成功')
        showEditVariable.value = false
      } else {
        ElMessage.error('更新失败')
      }
      
      loading.value = false
    }
  })
}

const handleImport = async () => {
  try {
    const result = await window.electronAPI.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'JSON 文件', extensions: ['json'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    })
    
    if (result.canceled || result.filePaths.length === 0) {
      return
    }
    
    const filePath = result.filePaths[0]
    const content = await window.electronAPI.readFile(filePath)
    const data = JSON.parse(content)
    
    // 验证数据格式
    if (!data.groups || !Array.isArray(data.groups) || !data.variables || !Array.isArray(data.variables)) {
      ElMessage.error('文件格式不正确')
      return
    }
    
    // 确认导入
    const confirmResult = await window.electronAPI.showMessageBox({
      type: 'question',
      title: '确认导入',
      message: `确定要导入数据吗？这将覆盖现有的 ${envStore.groups.length} 个分组和 ${envStore.variables.length} 个变量。`,
      buttons: ['确定', '取消'],
      defaultId: 0,
      cancelId: 1
    })
    
    if (confirmResult.response !== 0) {
      return
    }
    
    // 导入数据
    const success = await envStore.importData(data)
    if (success) {
      ElMessage.success('导入成功')
    } else {
      ElMessage.error('导入失败')
    }
  } catch (error) {
    console.error('导入失败:', error)
    ElMessage.error('导入失败，请检查文件格式')
  }
}

const handleExport = () => {
  const data = {
    groups: envStore.groups,
    variables: envStore.variables
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `env-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('导出成功')
}

// 暴露编辑方法给父组件
defineExpose({
  openEdit: (variable: EnvVariable) => {
    editVariableForm.id = variable.id
    editVariableForm.name = variable.name
    editVariableForm.value = variable.value
    editVariableForm.groupId = variable.groupId
    showEditVariable.value = true
  }
})
</script>

<style scoped>
.header {
  height: 60px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.header-right {
  display: flex;
  gap: 10px;
}

.form-tip {
  margin-left: 10px;
  color: var(--text-tertiary);
  font-size: 12px;
  transition: color 0.3s ease;
}
</style>
