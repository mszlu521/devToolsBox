<script setup lang="ts">
/**
 * Typora 编辑器测试页面
 * 
 * 用于测试和展示新的 Typora 风格 Markdown 编辑器
 */
import TyporaEditorDemo from '../components/markdown/TyporaEditor/demo/TyporaEditorDemo.vue'
</script>

<template>
  <TyporaEditorDemo />
</template>

<style scoped>
/* 让页面占满全屏 */
:deep(.typora-demo) {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
}
</style>
