<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToolStore } from '../stores/toolStore'
import { useThemeStore } from '../stores/themeStore'
import { Sunny, Moon, EditPen, Setting, Minus, Close, Tools } from '@element-plus/icons-vue'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const router = useRouter()
const toolStore = useToolStore()
const themeStore = useThemeStore()

// 关闭行为设置
const closeBehavior = ref<'tray' | 'close'>('tray')
const showSettings = ref(false)

// 加载关闭行为设置
const loadCloseBehavior = async () => {
  try {
    const result = await window.electronAPI.getCloseBehavior()
    closeBehavior.value = result.behavior
  } catch (e) {
    console.error('加载关闭行为设置失败:', e)
  }
}

// 更新关闭行为
const updateCloseBehavior = async (behavior: 'tray' | 'close') => {
  try {
    await window.electronAPI.updateCloseBehavior(behavior)
    closeBehavior.value = behavior
  } catch (e) {
    console.error('更新关闭行为设置失败:', e)
  }
}

onMounted(() => {
  loadCloseBehavior()
})

const getIcon = (iconName: string) => {
  // 优先使用已导入的图标
  const localIcons: Record<string, any> = {
    Sunny,
    Moon,
    EditPen
  }
  
  if (localIcons[iconName]) {
    return localIcons[iconName]
  }
  
  // 否则从 ElementPlusIconsVue 查找
  const icon = (ElementPlusIconsVue as Record<string, any>)[iconName]
  if (!icon) {
    console.warn(`Icon not found: ${iconName}, using default`)
    return ElementPlusIconsVue.Tools
  }
  return icon
}

const handleToolClick = (toolId: string) => {
  console.log('Tool clicked:', toolId)
  const tool = toolStore.toolList.find(t => t.id === toolId)
  console.log('Found tool:', tool)
  if (tool && tool.isAvailable !== false) {
    toolStore.switchTool(toolId)
    router.push(`/tool/${toolId}`)
  }
}

const openLink = (url: string) => {
  window.electronAPI?.openExternal?.(url) || window.open(url, '_blank')
}
</script>

<template>
  <div class="tool-grid-page">
    <div class="grid-header">
      <div class="brand">
        <el-icon :size="40" color="#00d4aa"><Tools /></el-icon>
        <div class="brand-text">
          <h1>DevToolsBox</h1>
          <a href="https://www.mszlu.com" target="_blank" class="author-link" @click.prevent="openLink('https://www.mszlu.com')">by mszlu.com</a>
        </div>
      </div>
      <p class="subtitle">开发者工具箱 - 让开发更高效</p>
      <!-- 主题切换和设置按钮 -->
      <div class="theme-toggle">
        <el-button
          circle
          class="theme-btn"
          @click="themeStore.toggleTheme"
          :title="themeStore.theme === 'light' ? '切换到暗黑模式' : '切换到明亮模式'"
        >
          <el-icon :size="20">
            <Sunny v-if="themeStore.theme === 'dark'" />
            <Moon v-else />
          </el-icon>
        </el-button>
        <el-button
          circle
          class="theme-btn"
          @click="showSettings = true"
          title="设置"
        >
          <el-icon :size="20"><Setting /></el-icon>
        </el-button>
      </div>
    </div>
    
    <div class="tools-grid">
      <div
        v-for="tool in toolStore.toolList"
        :key="tool.id"
        class="tool-card"
        :class="{ unavailable: tool.isAvailable === false }"
        @click="handleToolClick(tool.id)"
      >
        <div class="tool-icon">
          <el-icon :size="40">
            <component :is="getIcon(tool.icon)" />
          </el-icon>
        </div>
        <h3 class="tool-name">{{ tool.name }}</h3>
        <p class="tool-desc">{{ tool.description }}</p>
        <el-tag v-if="tool.isAvailable === false" type="info" size="small" class="status-tag">
          开发中
        </el-tag>
      </div>
    </div>
    
    <!-- 广告条 -->
    <div class="ad-banner" @click="openLink('https://www.mszlu.com/docs/ai/msai/01.html')">
      <div class="ad-content">
        <el-icon :size="24" color="#ffd700"><StarFilled /></el-icon>
        <div class="ad-text">
          <span class="ad-title">AI Agent 实战项目</span>
          <span class="ad-desc">从零开始构建智能代理应用，掌握 LLM 应用开发核心技术</span>
        </div>
        <el-button type="warning" size="small" round>立即学习</el-button>
      </div>
    </div>
    
    <div class="grid-footer">
      <div class="footer-links">
        <a href="https://www.mszlu.com" @click.prevent="openLink('https://www.mszlu.com')">mszlu.com</a>
        <span class="divider">|</span>
        <span>DevToolsBox v1.0.0</span>
      </div>
    </div>
    
    <!-- 设置对话框 -->
    <el-dialog
      v-model="showSettings"
      title="应用设置"
      width="420px"
      align-center
      :close-on-click-modal="true"
      class="settings-dialog"
    >
      <div class="settings-content">
        <div class="setting-card">
          <div class="setting-header">
            <el-icon :size="20" color="#00d4aa"><Tools /></el-icon>
            <span>窗口行为</span>
          </div>
          <div class="setting-body">
            <div class="setting-option" 
                 :class="{ active: closeBehavior === 'tray' }"
                 @click="updateCloseBehavior('tray')">
              <div class="option-icon">
                <el-icon :size="24"><Minus /></el-icon>
              </div>
              <div class="option-info">
                <div class="option-title">最小化到托盘</div>
                <div class="option-desc">点击关闭按钮时最小化到系统托盘</div>
              </div>
              <el-radio v-model="closeBehavior" label="tray" />
            </div>
            <div class="setting-option" 
                 :class="{ active: closeBehavior === 'close' }"
                 @click="updateCloseBehavior('close')">
              <div class="option-icon">
                <el-icon :size="24"><Close /></el-icon>
              </div>
              <div class="option-info">
                <div class="option-title">直接退出</div>
                <div class="option-desc">点击关闭按钮时直接退出应用</div>
              </div>
              <el-radio v-model="closeBehavior" label="close" />
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.tool-grid-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 40px;
  display: flex;
  flex-direction: column;
}

.grid-header {
  text-align: center;
  margin-bottom: 48px;
  position: relative;
}

.theme-toggle {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  gap: 8px;
}

.theme-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  transition: all 0.3s ease;
}

.theme-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
}

.brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 12px;
}

.brand-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.brand h1 {
  margin: 0;
  font-size: 36px;
  font-weight: 700;
  background: linear-gradient(135deg, #00d4aa 0%, #00a884 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.author-link {
  font-size: 14px;
  color: #00d4aa;
  text-decoration: none;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.author-link:hover {
  opacity: 1;
  text-decoration: underline;
}

.subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 16px;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  flex: 1;
}

.tool-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.tool-card:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: #00d4aa;
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 212, 170, 0.2);
}

.tool-card.unavailable {
  opacity: 0.6;
  cursor: not-allowed;
}

.tool-card.unavailable:hover {
  transform: none;
  box-shadow: none;
  border-color: rgba(255, 255, 255, 0.1);
}

.tool-icon {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #00d4aa 0%, #00a884 100%);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
  color: #fff;
}

.tool-card.unavailable .tool-icon {
  background: rgba(255, 255, 255, 0.1);
}

.tool-name {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.tool-desc {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.status-tag {
  position: absolute;
  top: 12px;
  right: 12px;
}

/* 广告条 */
.ad-banner {
  max-width: 1200px;
  margin: 32px auto;
  padding: 16px 24px;
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.15) 0%, rgba(255, 152, 0, 0.15) 100%);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.ad-banner:hover {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.25) 0%, rgba(255, 152, 0, 0.25) 100%);
  border-color: rgba(255, 193, 7, 0.5);
  transform: translateY(-2px);
}

.ad-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.ad-text {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.ad-title {
  font-size: 16px;
  font-weight: 600;
  color: #ffd700;
}

.ad-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 4px;
}

.grid-footer {
  text-align: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.footer-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.footer-links a {
  color: #00d4aa;
  text-decoration: none;
  transition: opacity 0.2s;
}

.footer-links a:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.divider {
  opacity: 0.3;
}

/* 设置对话框样式 - 与页面主题一致 */
:deep(.settings-dialog) {
  background: transparent;
}

:deep(.settings-dialog .el-dialog) {
  background: #1a1a2e;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
}

:deep(.settings-dialog .el-dialog__header) {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin: 0;
}

:deep(.settings-dialog .el-dialog__title) {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
}

:deep(.settings-dialog .el-dialog__headerbtn) {
  top: 20px;
  right: 20px;
}

:deep(.settings-dialog .el-dialog__headerbtn .el-icon) {
  color: rgba(255, 255, 255, 0.6);
}

:deep(.settings-dialog .el-dialog__headerbtn:hover .el-icon) {
  color: #fff;
}

:deep(.settings-dialog .el-dialog__body) {
  padding: 0;
}

:deep(.settings-dialog .el-dialog__footer) {
  display: none;
}

.settings-content {
  padding: 20px 24px 24px;
}

.setting-card {
  background: #141428;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
}

.setting-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: rgba(0, 212, 170, 0.08);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.setting-header span {
  color: #fff;
  font-size: 15px;
  font-weight: 500;
}

.setting-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #1a1a2e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.setting-option:hover {
  background: #202038;
  border-color: rgba(255, 255, 255, 0.2);
}

.setting-option.active {
  background: rgba(0, 212, 170, 0.1);
  border-color: #00d4aa;
}

.option-icon {
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.3s ease;
}

.setting-option.active .option-icon {
  background: rgba(0, 212, 170, 0.15);
  color: #00d4aa;
}

.option-info {
  flex: 1;
  min-width: 0;
}

.option-title {
  font-size: 15px;
  font-weight: 500;
  color: #fff;
  margin-bottom: 4px;
}

.option-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.setting-option :deep(.el-radio) {
  margin: 0;
}

.setting-option :deep(.el-radio__label) {
  display: none;
}

.setting-option :deep(.el-radio__input.is-checked .el-radio__inner) {
  border-color: #00d4aa;
  background: #00d4aa;
}
</style>
