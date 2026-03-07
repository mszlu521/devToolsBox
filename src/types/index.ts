// 环境变量
export interface EnvVariable {
  id: string
  name: string
  value: string
  groupId: string
  isSystem?: boolean
  isMachine?: boolean
}

// 环境变量分组
export interface EnvGroup {
  id: string
  name: string
  description?: string
  color?: string
}

// 应用数据
export interface EnvData {
  groups: EnvGroup[]
  variables: EnvVariable[]
}

// 编辑状态
export interface EditState {
  isEditing: boolean
  editId: string | null
  form: {
    name: string
    value: string
    groupId: string
  }
}
