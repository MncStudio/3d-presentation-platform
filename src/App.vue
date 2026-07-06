<script setup lang="ts">
import HomePage from './pages/HomePage.vue'
</script>

<template>
  <HomePage />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, sans-serif;
  background: #1a1a2e;
  color: #e0e0e0;
  overflow: hidden;
  user-select: none;
}

#app {
  width: 100vw;
  height: 100vh;
}
</style>
