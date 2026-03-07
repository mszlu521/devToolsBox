<script setup lang="ts">
import { ref, computed } from 'vue'
import { DocumentChecked, CopyDocument, Delete, Rank, CircleClose } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const input = ref('')
const output = ref('')
const error = ref('')
const indentSize = ref(2)
const sortKeys = ref(false)
const escapeUnicode = ref(false)

const formatJson = () => {
  if (!input.value.trim()) {
    output.value = ''
    error.value = ''
    return
  }
  
  try {
    let obj = JSON.parse(input.value)
    
    // 按键排序
    if (sortKeys.value && typeof obj === 'object' && obj !== null) {
      obj = sortObjectKeys(obj)
    }
    
    // 格式化输出
    let formatted = JSON.stringify(obj, null, indentSize.value)
    
    // 转义 Unicode
    if (escapeUnicode.value) {
      formatted = formatted.replace(/[\u007f-\uffff]/g, (ch) => 
        '\\u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4)
      )
    }
    
    output.value = formatted
    error.value = ''
  } catch (e: any) {
    error.value = e.message || 'JSON 格式错误'
    output.value = ''
  }
}

const compressJson = () => {
  if (!input.value.trim()) return
  
  try {
    const obj = JSON.parse(input.value)
    output.value = JSON.stringify(obj)
    error.value = ''
  } catch (e: any) {
    error.value = e.message || 'JSON 格式错误'
  }
}

const escapeJson = () => {
  if (!input.value.trim()) return
  
  try {
    const str = JSON.stringify(input.value)
    output.value = str.slice(1, -1) // 去掉外层引号
    error.value = ''
  } catch (e: any) {
    error.value = '转义失败'
  }
}

const unescapeJson = () => {
  if (!input.value.trim()) return
  
  try {
    const str = '"' + input.value + '"'
    output.value = JSON.parse(str)
    error.value = ''
  } catch (e: any) {
    error.value = '反转义失败'
  }
}

const copyOutput = async () => {
  if (!output.value) return
  try {
    await navigator.clipboard.writeText(output.value)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

const copyInput = async () => {
  if (!input.value) return
  try {
    await navigator.clipboard.writeText(input.value)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

const clearAll = () => {
  input.value = ''
  output.value = ''
  error.value = ''
}

const sortObjectKeys = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys)
  } else if (typeof obj === 'object' && obj !== null) {
    return Object.keys(obj)
      .sort()
      .reduce((result: any, key) => {
        result[key] = sortObjectKeys(obj[key])
        return result
      }, {})
  }
  return obj
}

const inputStats = computed(() => {
  const lines = input.value.split('\n').length
  const chars = input.value.length
  const bytes = new Blob([input.value]).size
  return { lines, chars, bytes }
})

const outputStats = computed(() => {
  const lines = output.value.split('\n').length
  const chars = output.value.length
  const bytes = new Blob([output.value]).size
  return { lines, chars, bytes }
})
</script>

<template>
  <div class="json-formatter">
    <div class="toolbar">
      <div class="toolbar-group">
        <el-button type="primary" :icon="DocumentChecked" @click="formatJson">
          格式化
        </el-button>
        <el-button :icon="Rank" @click="compressJson">
          压缩
        </el-button>
        <el-button @click="escapeJson">
          转义
        </el-button>
        <el-button @click="unescapeJson">
          反转义
        </el-button>
      </div>
      
      <div class="toolbar-group options">
        <el-checkbox v-model="sortKeys">按键排序</el-checkbox>
        <el-checkbox v-model="escapeUnicode">转义 Unicode</el-checkbox>
        <el-select v-model="indentSize" size="small" style="width: 80px">
          <el-option label="2空格" :value="2" />
          <el-option label="4空格" :value="4" />
          <el-option label="Tab" :value="'\t'" />
        </el-select>
      </div>
      
      <div class="toolbar-group">
        <el-button :icon="CopyDocument" @click="copyInput">复制输入</el-button>
        <el-button type="danger" :icon="Delete" @click="clearAll">清空</el-button>
      </div>
    </div>
    
    <div class="editor-container">
      <div class="editor-panel">
        <div class="panel-header">
          <span>输入</span>
          <span class="stats">行: {{ inputStats.lines }} | 字符: {{ inputStats.chars }} | 字节: {{ inputStats.bytes }}</span>
        </div>
        <el-input
          v-model="input"
          type="textarea"
          :rows="20"
          placeholder="在此粘贴 JSON 数据..."
          class="code-editor"
          @input="formatJson"
        />
      </div>
      
      <div class="editor-panel">
        <div class="panel-header">
          <span>输出</span>
          <div class="panel-actions">
            <span class="stats">行: {{ outputStats.lines }} | 字符: {{ outputStats.chars }} | 字节: {{ outputStats.bytes }}</span>
            <el-button link :icon="CopyDocument" @click="copyOutput" :disabled="!output">
              复制结果
            </el-button>
          </div>
        </div>
        <el-input
          v-model="output"
          type="textarea"
          :rows="20"
          readonly
          placeholder="格式化后的 JSON 将显示在这里..."
          class="code-editor"
          :class="{ 'has-error': error }"
        />
        <div v-if="error" class="error-message">
          <el-icon><CircleClose /></el-icon>
          {{ error }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.json-formatter {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
  transition: background-color 0.3s ease;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
  gap: 16px;
  flex-wrap: wrap;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-group.options {
  gap: 16px;
  color: var(--text-primary);
}

.editor-container {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding: 20px;
  overflow: hidden;
}

.editor-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--card-bg);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stats {
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: normal;
  transition: color 0.3s ease;
}

.code-editor :deep(.el-textarea__inner) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  border: none;
  resize: none;
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 16px;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.code-editor :deep(.el-textarea__inner:focus) {
  background: var(--card-bg);
}

.code-editor.has-error :deep(.el-textarea__inner) {
  background: rgba(245, 108, 108, 0.1);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
  font-size: 13px;
  border-top: 1px solid rgba(245, 108, 108, 0.2);
}

@media (max-width: 1024px) {
  .editor-container {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }
}
</style>
