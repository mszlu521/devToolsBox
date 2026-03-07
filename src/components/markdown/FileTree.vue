<script setup lang="ts">
import { Folder, FolderOpened, Document } from '@element-plus/icons-vue'

export interface FileItem {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modifiedTime: number
  children?: FileItem[]
  isExpanded?: boolean
}

interface Props {
  items: FileItem[]
  level?: number
}

const props = withDefaults(defineProps<Props>(), {
  level: 0
})

const emit = defineEmits<{
  itemClick: [item: FileItem]
  contextMenu: [e: MouseEvent, item: FileItem]
}>()

const handleClick = (item: FileItem) => {
  emit('itemClick', item)
}

const handleContextMenu = (e: MouseEvent, item: FileItem) => {
  e.preventDefault()
  emit('contextMenu', e, item)
}

const formatFileSize = (size: number): string => {
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  return (size / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<template>
  <div class="file-tree">
    <template v-for="item in items" :key="item.path">
      <!-- 文件/文件夹项 -->
      <div
        class="file-tree-item"
        :class="{
          'is-folder': item.isDirectory,
          'is-expanded': item.isExpanded,
          'is-file': !item.isDirectory
        }"
        :style="{ paddingLeft: level * 16 + 8 + 'px' }"
        @click="handleClick(item)"
        @contextmenu="handleContextMenu($event, item)"
      >
        <!-- 文件夹展开/折叠指示器 -->
        <span v-if="item.isDirectory" class="expand-indicator">
          <span class="arrow" :class="{ expanded: item.isExpanded }">▶</span>
        </span>
        <span v-else class="expand-placeholder"></span>
        
        <!-- 图标 -->
        <el-icon class="item-icon" :size="16">
          <Folder v-if="item.isDirectory && !item.isExpanded" />
          <FolderOpened v-else-if="item.isDirectory && item.isExpanded" />
          <Document v-else />
        </el-icon>
        
        <!-- 文件名 -->
        <span class="file-name" :title="item.name">{{ item.name }}</span>
        
        <!-- 文件大小（仅文件显示） -->
        <span v-if="!item.isDirectory && item.size > 0" class="file-size">
          {{ formatFileSize(item.size) }}
        </span>
      </div>
      
      <!-- 递归渲染子文件夹内容 - 紧跟在文件夹项后面 -->
      <FileTree
        v-if="item.isDirectory && item.isExpanded && item.children?.length"
        :items="item.children"
        :level="level + 1"
        @item-click="(childItem: FileItem) => emit('itemClick', childItem)"
        @context-menu="(e: MouseEvent, childItem: FileItem) => emit('contextMenu', e, childItem)"
      />
    </template>
  </div>
</template>

<style scoped>
.file-tree {
  width: 100%;
}

.file-tree-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-primary);
  font-size: 13px;
  min-height: 32px;
}

.file-tree-item:hover {
  background: var(--bg-hover);
}

.file-tree-item.is-folder {
  font-weight: 500;
}

.expand-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  cursor: pointer;
  transition: transform 0.2s;
}

.expand-indicator .arrow {
  font-size: 10px;
  color: var(--text-secondary);
  transition: transform 0.2s;
  user-select: none;
}

.expand-indicator .arrow.expanded {
  transform: rotate(90deg);
}

.expand-placeholder {
  width: 16px;
}

.item-icon {
  color: var(--primary-color);
  flex-shrink: 0;
}

.file-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 11px;
  color: var(--text-secondary);
  margin-left: auto;
  padding-left: 8px;
}
</style>
