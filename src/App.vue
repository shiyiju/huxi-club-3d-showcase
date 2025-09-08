<template>
  <!-- 这里可以放全局布局（如导航栏） -->
  <Home /> <!-- 直接引入 Home 组件 -->
</template>

<script setup>
import Home from './views/Home.vue' // 或 '@/pages/Home.vue'
</script>

<style>
/* 全局样式（可选） */
body {
  margin: 0;
}
</style>