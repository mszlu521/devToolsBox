import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { EnvVariable, EnvGroup, EnvData } from '../types'

export const useEnvStore = defineStore('env', () => {
  // 状态
  const groups = ref<EnvGroup[]>([
    { id: 'system', name: '系统环境变量', description: '从系统读取的环境变量', color: '#F56C6C' },
    { id: 'default', name: '默认分组', description: '自定义环境变量', color: '#409EFF' }
  ])
  const variables = ref<EnvVariable[]>([])
  const loading = ref(false)
  const selectedGroupId = ref<string>('all')
  const searchQuery = ref('')

  // 计算属性
  const filteredVariables = computed(() => {
    let result = variables.value

    // 按分组筛选
    if (selectedGroupId.value !== 'all') {
      result = result.filter(v => v.groupId === selectedGroupId.value)
    }

    // 按搜索关键词筛选
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(v => 
        v.name.toLowerCase().includes(query) || 
        v.value.toLowerCase().includes(query)
      )
    }

    return result
  })

  const getGroupById = computed(() => (id: string) => {
    return groups.value.find(g => g.id === id)
  })

  const getVariableCount = computed(() => (groupId: string) => {
    return variables.value.filter(v => v.groupId === groupId).length
  })

  // 加载数据
  const loadData = async () => {
    loading.value = true
    try {
      const data = await window.electronAPI.getData()
      if (data.groups.length > 0) {
        groups.value = data.groups
      }
      variables.value = data.variables || []
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      loading.value = false
    }
  }

  // 保存数据
  const saveData = async () => {
    try {
      // 使用 structuredClone 将响应式对象转换为纯对象，避免 IPC 克隆错误
      const data: EnvData = {
        groups: JSON.parse(JSON.stringify(groups.value)),
        variables: JSON.parse(JSON.stringify(variables.value))
      }
      return await window.electronAPI.saveData(data)
    } catch (error) {
      console.error('保存数据失败:', error)
      return false
    }
  }

  // 同步系统环境变量
  const syncSystemEnv = async () => {
    loading.value = true
    try {
      const systemVars = await window.electronAPI.getSystemEnv()
      // 移除旧的系统变量
      variables.value = variables.value.filter(v => !v.isSystem)
      // 添加新的系统变量
      variables.value.push(...systemVars)
      await saveData()
    } catch (error) {
      console.error('同步系统环境变量失败:', error)
    } finally {
      loading.value = false
    }
  }

  // 添加环境变量
  const addVariable = async (variable: Omit<EnvVariable, 'id'>) => {
    const newVar: EnvVariable = {
      ...variable,
      id: `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    variables.value.push(newVar)
    return await saveData()
  }

  // 更新环境变量
  const updateVariable = async (id: string, updates: Partial<EnvVariable>) => {
    const index = variables.value.findIndex(v => v.id === id)
    if (index !== -1) {
      variables.value[index] = { ...variables.value[index], ...updates }
      return await saveData()
    }
    return false
  }

  // 删除环境变量
  const deleteVariable = async (id: string, deleteFromSystem = false) => {
    const variable = variables.value.find(v => v.id === id)
    
    // 如果是系统变量，或用户选择同时删除系统变量
    if (variable?.isSystem || deleteFromSystem) {
      // 删除系统环境变量
      const success = await window.electronAPI.deleteSystemEnv(
        variable!.name,
        variable!.isMachine
      )
      if (!success) return false
    }
    variables.value = variables.value.filter(v => v.id !== id)
    return await saveData()
  }

  // 检查变量是否存在于系统环境变量中
  const isVariableInSystem = async (name: string): Promise<boolean> => {
    try {
      const systemVars = await window.electronAPI.getSystemEnv()
      return systemVars.some(v => v.name === name)
    } catch {
      return false
    }
  }

  // 添加分组
  const addGroup = async (group: Omit<EnvGroup, 'id'>) => {
    const newGroup: EnvGroup = {
      ...group,
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    groups.value.push(newGroup)
    return await saveData()
  }

  // 更新分组
  const updateGroup = async (id: string, updates: Partial<EnvGroup>) => {
    const index = groups.value.findIndex(g => g.id === id)
    if (index !== -1) {
      groups.value[index] = { ...groups.value[index], ...updates }
      return await saveData()
    }
    return false
  }

  // 删除分组
  const deleteGroup = async (id: string) => {
    if (id === 'system' || id === 'default') {
      return false // 不能删除默认分组
    }
    // 将该分组下的变量移动到默认分组
    variables.value.forEach(v => {
      if (v.groupId === id) {
        v.groupId = 'default'
      }
    })
    groups.value = groups.value.filter(g => g.id !== id)
    return await saveData()
  }

  // 应用到系统
  const applyToSystem = async (variable: EnvVariable) => {
    return await window.electronAPI.setSystemEnv(
      variable.name,
      variable.value,
      false // 默认应用到用户环境变量
    )
  }

  // 导入数据
  const importData = async (data: EnvData) => {
    try {
      // 合并分组，保留 system 和 default
      const existingGroupIds = new Set(groups.value.map(g => g.id))
      data.groups.forEach((group: EnvGroup) => {
        if (!existingGroupIds.has(group.id)) {
          groups.value.push(group)
        }
      })
      
      // 合并变量，避免重复（根据 name 判断）
      const existingVarNames = new Set(variables.value.map(v => v.name))
      data.variables.forEach((variable: EnvVariable) => {
        if (!existingVarNames.has(variable.name)) {
          variables.value.push(variable)
        }
      })
      
      return await saveData()
    } catch (error) {
      console.error('导入数据失败:', error)
      return false
    }
  }

  return {
    groups,
    variables,
    loading,
    selectedGroupId,
    searchQuery,
    filteredVariables,
    getGroupById,
    getVariableCount,
    loadData,
    saveData,
    syncSystemEnv,
    addVariable,
    updateVariable,
    deleteVariable,
    addGroup,
    updateGroup,
    deleteGroup,
    applyToSystem,
    importData,
    isVariableInSystem
  }
})
