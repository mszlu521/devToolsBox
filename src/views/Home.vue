<script setup lang="ts">
import ToolContent from '../components/ToolContent.vue'
</script>

<template>
  <div class="home">
    <ToolContent />
  </div>
</template>

<style scoped>
.home {
  display: flex;
  height: 100vh;
  background: var(--bg-secondary);
  transition: background-color 0.3s ease;
}
</style>
