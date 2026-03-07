<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useTodoStore } from '../../stores/todoStore'
import {
  Plus, Delete, Edit, CircleCheck, CircleCheckFilled, Search,
  Folder, FolderOpened, Calendar, Warning, MoreFilled,
  Grid, List, ArrowRight, Check
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const todoStore = useTodoStore()

// 项目表单
const showProjectDialog = ref(false)
const isEditProject = ref(false)
const projectForm = ref({
  id: '',
  name: '',
  description: '',
  color: '#409EFF'
})

// 任务表单
const showTodoDialog = ref(false)
const isEditTodo = ref(false)
const todoForm = ref({
  id: '',
  title: '',
  description: '',
  priority: 'medium' as 'low' | 'medium' | 'high',
  category: 'feature',
  dueDate: ''
})

// 分类管理
const showCategoryDialog = ref(false)
const isEditCategory = ref(false)
const categoryForm = ref({
  id: '',
  name: '',
  color: '#409EFF'
})

onMounted(() => {
  todoStore.loadData()
})

// 当前 Tab 显示的任务
const currentTabTodos = computed(() => {
  if (todoStore.activeTab === 'active') {
    return todoStore.currentProjectActiveTodos
  } else {
    return todoStore.currentProjectCompletedTodos
  }
})

// 重置表单
const resetProjectForm = () => {
  projectForm.value = { id: '', name: '', description: '', color: '#409EFF' }
}

const resetTodoForm = () => {
  todoForm.value = { id: '', title: '', description: '', priority: 'medium', category: 'feature', dueDate: '' }
}

const resetCategoryForm = () => {
  categoryForm.value = { id: '', name: '', color: '#409EFF' }
}

// 打开分类管理
const openCategoryManager = () => {
  showCategoryDialog.value = true
}

// 打开添加分类
const openAddCategory = () => {
  isEditCategory.value = false
  resetCategoryForm()
}

// 打开编辑分类
const openEditCategory = (category: any) => {
  isEditCategory.value = true
  categoryForm.value = { ...category }
}

// 保存分类
const handleSaveCategory = async () => {
  if (!categoryForm.value.name.trim()) {
    ElMessage.warning('请输入分类名称')
    return
  }

  if (isEditCategory.value) {
    const success = await todoStore.updateCategory(categoryForm.value.id, {
      name: categoryForm.value.name.trim(),
      color: categoryForm.value.color
    })
    if (success) {
      ElMessage.success('分类更新成功')
      resetCategoryForm()
    }
  } else {
    await todoStore.addCategory(categoryForm.value.name.trim(), categoryForm.value.color)
    ElMessage.success('分类添加成功')
    resetCategoryForm()
  }
}

// 删除分类
const handleDeleteCategory = async (category: any) => {
  const defaultCategories = ['feature', 'bug', 'improvement', 'docs', 'other']
  if (defaultCategories.includes(category.id)) {
    ElMessage.warning('默认分类不能删除')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除分类 "${category.name}" 吗？其中的任务将移到"其他"。`,
      '确认删除',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    const success = await todoStore.deleteCategory(category.id)
    if (success) ElMessage.success('分类删除成功')
  } catch {}
}

// 打开添加项目
const openAddProject = () => {
  isEditProject.value = false
  resetProjectForm()
  showProjectDialog.value = true
}

// 打开编辑项目
const openEditProject = (project: any) => {
  if (['inbox'].includes(project.id)) {
    ElMessage.warning('默认项目不能编辑')
    return
  }
  isEditProject.value = true
  projectForm.value = { ...project }
  showProjectDialog.value = true
}

// 保存项目
const handleSaveProject = async () => {
  if (!projectForm.value.name.trim()) {
    ElMessage.warning('请输入项目名称')
    return
  }

  if (isEditProject.value) {
    const success = await todoStore.updateProject(projectForm.value.id, {
      name: projectForm.value.name.trim(),
      description: projectForm.value.description.trim(),
      color: projectForm.value.color
    })
    if (success) {
      ElMessage.success('项目更新成功')
      showProjectDialog.value = false
    }
  } else {
    await todoStore.addProject(
      projectForm.value.name.trim(),
      projectForm.value.description.trim(),
      projectForm.value.color
    )
    ElMessage.success('项目创建成功')
    showProjectDialog.value = false
    resetProjectForm()
  }
}

// 删除项目
const handleDeleteProject = async (project: any) => {
  if (['inbox', 'work', 'personal', 'study'].includes(project.id)) {
    ElMessage.warning('默认项目不能删除')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除项目 "${project.name}" 吗？其中的任务将移到收件箱。`,
      '确认删除',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    const success = await todoStore.deleteProject(project.id)
    if (success) ElMessage.success('项目删除成功')
  } catch {}
}

// 打开添加任务
const openAddTodo = () => {
  isEditTodo.value = false
  resetTodoForm()
  showTodoDialog.value = true
}

// 打开编辑任务
const openEditTodo = (todo: any) => {
  isEditTodo.value = true
  todoForm.value = {
    id: todo.id,
    title: todo.title,
    description: todo.description,
    priority: todo.priority,
    category: todo.category,
    dueDate: todo.dueDate ? new Date(todo.dueDate).toISOString().slice(0, 16) : ''
  }
  showTodoDialog.value = true
}

// 保存任务
const handleSaveTodo = async () => {
  if (!todoForm.value.title.trim()) {
    ElMessage.warning('请输入任务标题')
    return
  }

  if (isEditTodo.value) {
    const success = await todoStore.updateTodo(todoForm.value.id, {
      title: todoForm.value.title.trim(),
      description: todoForm.value.description.trim(),
      priority: todoForm.value.priority,
      category: todoForm.value.category,
      dueDate: todoForm.value.dueDate ? new Date(todoForm.value.dueDate).getTime() : undefined
    })
    if (success) {
      ElMessage.success('任务更新成功')
      showTodoDialog.value = false
    }
  } else {
    await todoStore.addTodo({
      projectId: todoStore.currentProjectId,
      title: todoForm.value.title.trim(),
      description: todoForm.value.description.trim(),
      priority: todoForm.value.priority,
      category: todoForm.value.category,
      completed: false,
      dueDate: todoForm.value.dueDate ? new Date(todoForm.value.dueDate).getTime() : undefined
    })
    ElMessage.success('任务添加成功')
    showTodoDialog.value = false
    resetTodoForm()
  }
}

// 切换完成状态
const handleToggleComplete = async (todo: any) => {
  await todoStore.toggleComplete(todo.id)
  ElMessage.success(todo.completed ? '已标记为未完成' : '已完成')
}

// 删除任务
const handleDeleteTodo = async (todo: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除 "${todo.title}" 吗？`,
      '确认删除',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    const success = await todoStore.deleteTodo(todo.id)
    if (success) ElMessage.success('删除成功')
  } catch {}
}

// 清理已完成
const handleClearCompleted = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清理所有已完成的任务吗？',
      '确认清理',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    const success = await todoStore.clearCompleted()
    if (success) ElMessage.success('清理成功')
  } catch {}
}

// 获取优先级标签
const getPriorityLabel = (priority: string) => {
  const map: Record<string, string> = { low: '低', medium: '中', high: '高' }
  return map[priority] || priority
}

// 获取优先级颜色
const getPriorityColor = (priority: string) => {
  const map: Record<string, string> = { low: '#67C23A', medium: '#E6A23C', high: '#F56C6C' }
  return map[priority] || '#909399'
}

// 格式化日期
const formatDate = (timestamp: number) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric'
  })
}

// 是否逾期
const isOverdue = (todo: any) => {
  return !todo.completed && todo.dueDate && Date.now() > todo.dueDate
}

// 获取项目未完成任务数
const getProjectActiveCount = (projectId: string) => {
  return todoStore.todos.filter((t: Todo) => t.projectId === projectId && !t.completed).length
}

// 获取项目高优先级任务数
const getProjectHighPriorityCount = (projectId: string) => {
  return todoStore.todos.filter((t: Todo) => t.projectId === projectId && !t.completed && t.priority === 'high').length
}

// 获取项目总任务数
const getProjectTaskCount = (projectId: string) => {
  return todoStore.todos.filter((t: Todo) => t.projectId === projectId).length
}

interface Todo {
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
</script>

<template>
  <div class="todo-app">
    <!-- 左侧项目列表 -->
    <div class="project-sidebar">
      <div class="sidebar-header">
        <h3>项目列表</h3>
        <el-button type="primary" link :icon="Plus" @click="openAddProject">
          新建
        </el-button>
      </div>

      <div class="project-list">
        <div
          v-for="project in todoStore.projects"
          :key="project.id"
          class="project-item"
          :class="{ active: todoStore.currentProjectId === project.id }"
          @click="todoStore.switchProject(project.id)"
        >
          <div class="project-icon" :style="{ backgroundColor: project.color + '20', color: project.color }">
            <el-icon><Folder v-if="todoStore.currentProjectId !== project.id" /><FolderOpened v-else /></el-icon>
          </div>
          <div class="project-info">
            <div class="project-name">{{ project.name }}</div>
            <div class="project-stats">
              <span class="stat-item" v-if="getProjectHighPriorityCount(project.id) > 0">
                <span class="stat-dot" style="background: #f56c6c;"></span>
                {{ getProjectHighPriorityCount(project.id) }}
              </span>
              <span class="stat-item">
                <span class="stat-dot" style="background: #909399;"></span>
                {{ getProjectTaskCount(project.id) }}
              </span>
            </div>
          </div>
          <el-tag
            v-if="getProjectActiveCount(project.id) > 0"
            size="small"
            type="primary"
            effect="light"
          >
            {{ getProjectActiveCount(project.id) }}
          </el-tag>
          <el-dropdown
            v-if="!['inbox'].includes(project.id)"
            trigger="click"
            @command="(cmd: string) => cmd === 'edit' ? openEditProject(project) : handleDeleteProject(project)"
            @click.stop
          >
            <el-button link :icon="MoreFilled" class="project-menu-btn" />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="edit" :icon="Edit">编辑</el-dropdown-item>
                <el-dropdown-item command="delete" :icon="Delete" divided>删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>

    <!-- 右侧任务区域 -->
    <div class="task-main">
      <!-- 头部工具栏 -->
      <div class="task-header">
        <div class="header-left">
          <div class="current-project" :style="{ borderLeftColor: todoStore.currentProject?.color }">
            <h2>{{ todoStore.currentProject?.name }}</h2>
          </div>
        </div>
        <div class="header-actions">
          <el-select v-model="todoStore.filterCategory" placeholder="全部分类" style="width: 120px;" clearable>
            <el-option label="全部分类" value="all" />
            <el-option
              v-for="cat in todoStore.categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
          <el-button link :icon="Edit" @click="openCategoryManager" title="管理分类" />
          
          <el-input
            v-model="todoStore.searchKeyword"
            placeholder="搜索任务..."
            clearable
            :prefix-icon="Search"
            style="width: 180px;"
          />
          
          <el-button type="primary" :icon="Plus" @click="openAddTodo">
            添加任务
          </el-button>
        </div>
      </div>

      <!-- Tab 切换 -->
      <div class="task-tabs">
        <div
          class="tab-item"
          :class="{ active: todoStore.activeTab === 'active' }"
          @click="todoStore.activeTab = 'active'"
        >
          <span class="tab-dot" style="background: #409EFF;"></span>
          <span>未完成</span>
          <el-tag size="small" type="primary">{{ todoStore.currentProjectActiveTodos.length }}</el-tag>
        </div>
        <div
          class="tab-item"
          :class="{ active: todoStore.activeTab === 'completed' }"
          @click="todoStore.activeTab = 'completed'"
        >
          <span class="tab-dot" style="background: #67C23A;"></span>
          <span>已完成</span>
          <el-tag size="small" type="success">{{ todoStore.currentProjectCompletedTodos.length }}</el-tag>
        </div>
        <el-button
          v-if="todoStore.activeTab === 'completed' && todoStore.currentProjectCompletedTodos.length > 0"
          link
          type="danger"
          size="small"
          @click="handleClearCompleted"
          class="clear-btn"
        >
          清理已完成
        </el-button>
      </div>

      <!-- 标签纸任务墙 -->
      <div class="sticky-wall">
        <div v-if="currentTabTodos.length === 0" class="empty-wall">
          <el-empty :description="todoStore.searchKeyword ? '没有找到匹配的任务' : (todoStore.activeTab === 'active' ? '暂无待办任务' : '暂无已完成任务')">
            <el-button v-if="!todoStore.searchKeyword" type="primary" @click="openAddTodo">
              添加任务
            </el-button>
          </el-empty>
        </div>

        <div v-else class="sticky-grid">
          <div
            v-for="todo in currentTabTodos"
            :key="todo.id"
            class="sticky-note"
            :class="{ 
              completed: todo.completed, 
              overdue: isOverdue(todo),
              'priority-high': todo.priority === 'high',
              'priority-medium': todo.priority === 'medium',
              'priority-low': todo.priority === 'low'
            }"
            :style="{ 
              borderTopColor: todoStore.getCategoryColor(todo.category),
              transform: `rotate(${((todo.id.charCodeAt(todo.id.length - 1) % 6) - 3)}deg)`
            }"
          >
            <!-- 图钉 -->
            <div class="pin" :style="{ background: getPriorityColor(todo.priority) }"></div>
            
            <!-- 分类标签 -->
            <div class="note-category" :style="{ background: todoStore.getCategoryColor(todo.category) }">
              {{ todoStore.getCategoryName(todo.category) }}
            </div>
            
            <!-- 内容 -->
            <div class="note-content">
              <div class="note-title" :title="todo.title">{{ todo.title }}</div>
              <div v-if="todo.description" class="note-desc">{{ todo.description }}</div>
            </div>
            
            <!-- 底部信息 -->
            <div class="note-footer">
              <div class="note-meta">
                <span v-if="isOverdue(todo)" class="overdue-badge">已逾期</span>
                <span v-else-if="todo.dueDate" class="due-date">
                  <el-icon><Calendar /></el-icon>
                  {{ formatDate(todo.dueDate) }}
                </span>
                <span v-if="todo.completed && todo.completedAt" class="completed-date">
                  {{ formatDate(todo.completedAt) }}完成
                </span>
              </div>
              <div class="note-actions">
                <el-button 
                  v-if="!todo.completed" 
                  circle 
                  size="small" 
                  type="success" 
                  :icon="Check" 
                  @click="handleToggleComplete(todo)"
                  title="标记完成"
                />
                <el-button 
                  v-else
                  circle 
                  size="small" 
                  :icon="CircleCheck" 
                  @click="handleToggleComplete(todo)"
                  title="撤销完成"
                />
                <el-button circle size="small" :icon="Edit" @click="openEditTodo(todo)" />
                <el-button circle size="small" type="danger" :icon="Delete" @click="handleDeleteTodo(todo)" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 项目编辑弹窗 -->
    <el-dialog v-model="showProjectDialog" :title="isEditProject ? '编辑项目' : '新建项目'" width="450px">
      <el-form :model="projectForm" label-width="80px">
        <el-form-item label="名称" required>
          <el-input v-model="projectForm.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="projectForm.description" type="textarea" :rows="2" placeholder="请输入项目描述（可选）" />
        </el-form-item>
        <el-form-item label="颜色">
          <el-color-picker v-model="projectForm.color" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showProjectDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSaveProject">{{ isEditProject ? '保存' : '创建' }}</el-button>
      </template>
    </el-dialog>

    <!-- 任务编辑弹窗 -->
    <el-dialog v-model="showTodoDialog" :title="isEditTodo ? '编辑任务' : '添加任务'" width="500px">
      <el-form :model="todoForm" label-width="80px">
        <el-form-item label="标题" required>
          <el-input v-model="todoForm.title" placeholder="请输入任务标题" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="todoForm.description" type="textarea" :rows="3" placeholder="请输入任务描述（可选）" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="todoForm.category" style="width: 100%;">
            <el-option v-for="cat in todoStore.categories" :key="cat.id" :label="cat.name" :value="cat.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-radio-group v-model="todoForm.priority">
            <el-radio-button value="low">低</el-radio-button>
            <el-radio-button value="medium">中</el-radio-button>
            <el-radio-button value="high">高</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="截止时间">
          <el-date-picker v-model="todoForm.dueDate" type="datetime" placeholder="选择截止时间" style="width: 100%;" format="YYYY-MM-DD HH:mm" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showTodoDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSaveTodo">{{ isEditTodo ? '保存' : '添加' }}</el-button>
      </template>
    </el-dialog>

    <!-- 分类管理弹窗 -->
    <el-dialog v-model="showCategoryDialog" title="分类管理" width="500px">
      <div class="category-manager">
        <div class="category-form-inline">
          <el-input v-model="categoryForm.name" placeholder="新分类名称" style="flex: 1;">
            <template #append>
              <el-color-picker v-model="categoryForm.color" size="small" />
            </template>
          </el-input>
          <el-button type="primary" @click="handleSaveCategory">{{ isEditCategory ? '保存' : '添加' }}</el-button>
          <el-button v-if="isEditCategory" @click="openAddCategory">取消</el-button>
        </div>
        <el-divider />
        <div class="category-list-manager">
          <div v-for="cat in todoStore.categories" :key="cat.id" class="category-list-item">
            <div class="category-info">
              <span class="category-color-dot" :style="{ backgroundColor: cat.color }" />
              <span class="category-name">{{ cat.name }}</span>
              <el-tag size="small" type="info">{{ todoStore.todos.filter((t: Todo) => t.category === cat.id).length }}</el-tag>
            </div>
            <div class="category-actions">
              <el-button link type="primary" :icon="Edit" @click="openEditCategory(cat)">编辑</el-button>
              <el-button link type="danger" :icon="Delete" @click="handleDeleteCategory(cat)" :disabled="['feature', 'bug', 'improvement', 'docs', 'other'].includes(cat.id)">删除</el-button>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.todo-app {
  display: flex;
  height: 100%;
  background: #e8e8e8;
}

/* 左侧项目列表 */
.project-sidebar {
  width: 240px;
  background: #fff;
  border-right: 1px solid #dcdcdc;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  box-shadow: 2px 0 8px rgba(0,0,0,0.05);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e4e7ed;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.project-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.project-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.project-item:hover {
  background: #f5f7fa;
}

.project-item.active {
  background: #ecf5ff;
}

.project-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.project-info {
  flex: 1;
  min-width: 0;
}

.project-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-stats {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  font-size: 11px;
  color: #909399;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.project-menu-btn {
  opacity: 0;
  transition: opacity 0.2s;
}

.project-item:hover .project-menu-btn {
  opacity: 1;
}

/* 右侧任务区域 */
.task-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  gap: 16px;
}

.current-project {
  border-left: 4px solid #409eff;
  padding-left: 12px;
}

.current-project h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Tab 切换 */
.task-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
  background: #f5f7fa;
  font-size: 14px;
  color: #606266;
}

.tab-item:hover {
  background: #e4e7ed;
}

.tab-item.active {
  background: #ecf5ff;
  color: #409eff;
  font-weight: 500;
}

.tab-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.clear-btn {
  margin-left: auto;
}

/* 标签纸墙 */
.sticky-wall {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: 
    linear-gradient(90deg, rgba(200,200,200,0.1) 1px, transparent 1px),
    linear-gradient(rgba(200,200,200,0.1) 1px, transparent 1px),
    #f0f0f0;
  background-size: 20px 20px;
}

.empty-wall {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sticky-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 24px;
  padding-bottom: 40px;
}

/* 标签纸样式 */
.sticky-note {
  position: relative;
  background: #fff9c4;
  border-radius: 2px;
  padding: 16px;
  min-height: 160px;
  box-shadow: 
    2px 2px 8px rgba(0,0,0,0.15),
    0 0 40px rgba(0,0,0,0.05) inset;
  transition: all 0.3s ease;
  border-top: 4px solid #ffd93d;
  transform-origin: center top;
}

.sticky-note:hover {
  box-shadow: 
    4px 4px 12px rgba(0,0,0,0.2),
    0 0 40px rgba(0,0,0,0.05) inset;
  z-index: 10;
}

.sticky-note.completed {
  background: #e8f5e9;
  border-top-color: #81c784;
  opacity: 0.85;
}

.sticky-note.overdue {
  background: #ffebee;
  border-top-color: #ef5350;
}

.sticky-note.priority-high {
  background: #ffccbc;
}

.sticky-note.priority-medium {
  background: #fff59d;
}

.sticky-note.priority-low {
  background: #c8e6c9;
}

/* 图钉 */
.pin {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 16px;
  height: 16px;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  z-index: 1;
}

.pin::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 6px;
  height: 6px;
  background: rgba(255,255,255,0.5);
  border-radius: 50%;
}

/* 分类标签 */
.note-category {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  color: #fff;
  font-weight: 500;
}

/* 内容 */
.note-content {
  margin-top: 8px;
}

.note-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
  word-break: break-all;
  margin-bottom: 8px;
}

.note-desc {
  font-size: 12px;
  color: #666;
  line-height: 1.5;
  word-break: break-all;
}

/* 底部 */
.note-footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed rgba(0,0,0,0.1);
}

.note-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 11px;
}

.overdue-badge {
  background: #f44336;
  color: #fff;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.due-date {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #888;
}

.completed-date {
  color: #4caf50;
}

.note-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  opacity: 0;
  transition: opacity 0.2s;
}

.sticky-note:hover .note-actions {
  opacity: 1;
}

/* 分类管理弹窗样式 */
.category-manager {
  padding: 0 10px;
}

.category-form-inline {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
}

.category-list-manager {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.category-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  transition: all 0.2s;
}

.category-list-item:hover {
  background: #ecf5ff;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-color-dot {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.category-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.category-actions {
  display: flex;
  gap: 8px;
}

/* 滚动条样式 */
.sticky-wall::-webkit-scrollbar,
.project-list::-webkit-scrollbar {
  width: 8px;
}

.sticky-wall::-webkit-scrollbar-track,
.project-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.sticky-wall::-webkit-scrollbar-thumb,
.project-list::-webkit-scrollbar-thumb {
  background: #a0a0a0;
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.sticky-wall::-webkit-scrollbar-thumb:hover,
.project-list::-webkit-scrollbar-thumb:hover {
  background: #808080;
  border: 2px solid transparent;
  background-clip: padding-box;
}

/* Firefox 滚动条 */
.sticky-wall,
.project-list {
  scrollbar-width: thin;
  scrollbar-color: #a0a0a0 rgba(0, 0, 0, 0.05);
}
</style>
