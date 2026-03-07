import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Electron API 类型声明
const electronAPI = (window as any).electronAPI

export interface Project {
  id: string
  name: string
  description: string
  color: string
  createdAt: number
  updatedAt: number
}

export interface Category {
  id: string
  name: string
  color: string
}

export interface Todo {
  id: string
  projectId: string
  title: string
  description: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  category: string
  createdAt: number
  completedAt?: number
  dueDate?: number
}

const DEFAULT_PROJECTS: Project[] = [
  { id: 'inbox', name: '收件箱', description: '未分类的任务', color: '#909399', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'work', name: '工作', description: '工作任务', color: '#409EFF', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'personal', name: '个人', description: '个人事务', color: '#67C23A', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'study', name: '学习', description: '学习计划', color: '#E6A23C', createdAt: Date.now(), updatedAt: Date.now() }
]

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'feature', name: '功能', color: '#409EFF' },
  { id: 'bug', name: 'Bug', color: '#F56C6C' },
  { id: 'improvement', name: '优化', color: '#67C23A' },
  { id: 'docs', name: '文档', color: '#909399' },
  { id: 'other', name: '其他', color: '#E6A23C' }
]

export const useTodoStore = defineStore('todo', () => {
  // 状态
  const projects = ref<Project[]>([...DEFAULT_PROJECTS])
  const categories = ref<Category[]>([...DEFAULT_CATEGORIES])
  const todos = ref<Todo[]>([])
  const currentProjectId = ref<string>('inbox')
  const searchKeyword = ref('')
  const filterCategory = ref<string>('all')
  const activeTab = ref<'active' | 'completed'>('active')

  // 当前项目
  const currentProject = computed(() => {
    return projects.value.find(p => p.id === currentProjectId.value)
  })

  // 当前项目的待办 - 按完成状态分组
  const currentProjectActiveTodos = computed(() => {
    let result = todos.value.filter(t => t.projectId === currentProjectId.value && !t.completed)

    // 按分类筛选
    if (filterCategory.value !== 'all') {
      result = result.filter(t => t.category === filterCategory.value)
    }

    // 按关键词搜索
    if (searchKeyword.value.trim()) {
      const keyword = searchKeyword.value.toLowerCase()
      result = result.filter(t =>
        t.title.toLowerCase().includes(keyword) ||
        t.description.toLowerCase().includes(keyword)
      )
    }

    // 排序：高优先级在前，创建时间倒序
    return result.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      return b.createdAt - a.createdAt
    })
  })

  // 当前项目已完成的待办
  const currentProjectCompletedTodos = computed(() => {
    let result = todos.value.filter(t => t.projectId === currentProjectId.value && t.completed)

    // 按分类筛选
    if (filterCategory.value !== 'all') {
      result = result.filter(t => t.category === filterCategory.value)
    }

    // 按关键词搜索
    if (searchKeyword.value.trim()) {
      const keyword = searchKeyword.value.toLowerCase()
      result = result.filter(t =>
        t.title.toLowerCase().includes(keyword) ||
        t.description.toLowerCase().includes(keyword)
      )
    }

    // 排序：完成时间倒序
    return result.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
  })

  // 获取分类名称
  const getCategoryName = (categoryId: string) => {
    return categories.value.find(c => c.id === categoryId)?.name || categoryId
  }

  // 获取分类颜色
  const getCategoryColor = (categoryId: string) => {
    return categories.value.find(c => c.id === categoryId)?.color || '#909399'
  }

  // 分类统计（当前项目）
  const categoryStats = computed(() => {
    const projectTodos = todos.value.filter(t => t.projectId === currentProjectId.value)
    return categories.value.map(cat => ({
      ...cat,
      activeCount: projectTodos.filter(t => t.category === cat.id && !t.completed).length,
      completedCount: projectTodos.filter(t => t.category === cat.id && t.completed).length
    }))
  })

  // 统计信息
  const stats = computed(() => {
    const projectTodos = todos.value.filter(t => t.projectId === currentProjectId.value)
    const total = projectTodos.length
    const completed = projectTodos.filter(t => t.completed).length
    const active = total - completed
    const highPriority = projectTodos.filter(t => t.priority === 'high' && !t.completed).length
    return { total, completed, active, highPriority }
  })

  // 项目统计
  const projectStats = computed(() => {
    return projects.value.map(p => {
      const projectTodos = todos.value.filter(t => t.projectId === p.id)
      const total = projectTodos.length
      const completed = projectTodos.filter(t => t.completed).length
      return { projectId: p.id, total, completed, active: total - completed }
    })
  })

  // 获取项目任务数量
  const getProjectTaskCount = (projectId: string) => {
    return todos.value.filter(t => t.projectId === projectId && !t.completed).length
  }

  // 加载数据
  const loadData = async () => {
    try {
      if (electronAPI?.getTodoData) {
        const result = await electronAPI.getTodoData()
        if (result.success) {
          todos.value = result.data.todos || []
          if (result.data.projects?.length > 0) {
            projects.value = result.data.projects
          }
          if (result.data.categories?.length > 0) {
            categories.value = result.data.categories
          }
        }
      } else {
        // 降级到 localStorage
        const saved = localStorage.getItem('dev-tools-todos-v3')
        if (saved) {
          const data = JSON.parse(saved)
          todos.value = data.todos || []
          if (data.projects?.length > 0) {
            projects.value = data.projects
          }
          if (data.categories?.length > 0) {
            categories.value = data.categories
          }
        }
      }
    } catch (e) {
      console.error('Failed to load todos:', e)
    }
  }

  // 保存数据
  const saveData = async () => {
    try {
      // 转换为普通对象，避免 IPC 克隆错误
      const dataToSave = {
        todos: JSON.parse(JSON.stringify(todos.value)),
        projects: JSON.parse(JSON.stringify(projects.value)),
        categories: JSON.parse(JSON.stringify(categories.value))
      }
      
      if (electronAPI?.saveTodoData) {
        await electronAPI.saveTodoData(dataToSave)
      } else {
        // 降级到 localStorage
        localStorage.setItem('dev-tools-todos-v3', JSON.stringify(dataToSave))
      }
    } catch (e) {
      console.error('Failed to save todos:', e)
    }
  }

  // 切换项目
  const switchProject = (projectId: string) => {
    currentProjectId.value = projectId
  }

  // 添加项目
  const addProject = async (name: string, description: string = '', color: string = '#409EFF') => {
    const id = 'proj-' + Date.now().toString(36)
    const newProject: Project = {
      id,
      name: name.trim(),
      description: description.trim(),
      color,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    projects.value.push(newProject)
    await saveData()
    return id
  }

  // 更新项目
  const updateProject = async (id: string, updates: Partial<Project>) => {
    const index = projects.value.findIndex(p => p.id === id)
    if (index === -1) return false
    if (['inbox', 'work', 'personal', 'study'].includes(id)) {
      // 默认项目只能更新名称和描述
      const allowedUpdates: Partial<Project> = {}
      if (updates.name) allowedUpdates.name = updates.name
      if (updates.description !== undefined) allowedUpdates.description = updates.description
      projects.value[index] = { ...projects.value[index], ...allowedUpdates, updatedAt: Date.now() }
    } else {
      projects.value[index] = { ...projects.value[index], ...updates, updatedAt: Date.now() }
    }
    await saveData()
    return true
  }

  // 删除项目
  const deleteProject = async (id: string) => {
    // 不能删除默认项目
    if (['inbox', 'work', 'personal', 'study'].includes(id)) return false

    const index = projects.value.findIndex(p => p.id === id)
    if (index === -1) return false

    // 将该项目的任务移到收件箱
    todos.value.forEach(t => {
      if (t.projectId === id) t.projectId = 'inbox'
    })

    projects.value.splice(index, 1)

    // 如果当前项目被删除，切换到收件箱
    if (currentProjectId.value === id) {
      currentProjectId.value = 'inbox'
    }

    await saveData()
    return true
  }

  // 添加待办
  const addTodo = async (todo: Omit<Todo, 'id' | 'createdAt'>) => {
    const newTodo: Todo = {
      ...todo,
      id: 'todo-' + Date.now().toString(36),
      createdAt: Date.now()
    }
    todos.value.push(newTodo)
    await saveData()
    return newTodo.id
  }

  // 更新待办
  const updateTodo = async (id: string, updates: Partial<Todo>) => {
    const index = todos.value.findIndex(t => t.id === id)
    if (index === -1) return false

    todos.value[index] = { ...todos.value[index], ...updates }
    await saveData()
    return true
  }

  // 切换完成状态
  const toggleComplete = async (id: string) => {
    const todo = todos.value.find(t => t.id === id)
    if (!todo) return false

    todo.completed = !todo.completed
    todo.completedAt = todo.completed ? Date.now() : undefined
    await saveData()
    return true
  }

  // 删除待办
  const deleteTodo = async (id: string) => {
    const index = todos.value.findIndex(t => t.id === id)
    if (index === -1) return false

    todos.value.splice(index, 1)
    await saveData()
    return true
  }

  // 清理已完成的待办（当前项目）
  const clearCompleted = async () => {
    todos.value = todos.value.filter(t => !(t.projectId === currentProjectId.value && t.completed))
    await saveData()
    return true
  }

  // 添加分类
  const addCategory = async (name: string, color: string) => {
    const id = 'cat-' + Date.now().toString(36)
    categories.value.push({ id, name: name.trim(), color })
    await saveData()
    return id
  }

  // 更新分类
  const updateCategory = async (id: string, updates: Partial<Category>) => {
    const index = categories.value.findIndex(c => c.id === id)
    if (index === -1) return false
    categories.value[index] = { ...categories.value[index], ...updates }
    await saveData()
    return true
  }

  // 删除分类
  const deleteCategory = async (id: string) => {
    // 不能删除默认分类
    const defaultCategories = ['feature', 'bug', 'improvement', 'docs', 'other']
    if (defaultCategories.includes(id)) return false

    const index = categories.value.findIndex(c => c.id === id)
    if (index === -1) return false

    // 将该分类下的任务移到 "other"
    todos.value.forEach(t => {
      if (t.category === id) t.category = 'other'
    })

    categories.value.splice(index, 1)
    await saveData()
    return true
  }

  return {
    projects,
    categories,
    todos,
    currentProjectId,
    currentProject,
    currentProjectActiveTodos,
    currentProjectCompletedTodos,
    stats,
    projectStats,
    categoryStats,
    searchKeyword,
    filterCategory,
    activeTab,
    getProjectTaskCount,
    getCategoryName,
    getCategoryColor,
    loadData,
    saveData,
    switchProject,
    addProject,
    updateProject,
    deleteProject,
    addTodo,
    updateTodo,
    toggleComplete,
    deleteTodo,
    clearCompleted,
    addCategory,
    updateCategory,
    deleteCategory
  }
})
