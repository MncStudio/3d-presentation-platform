<script setup lang="ts">
import { ref } from 'vue'
import GlbPage from './pages/GlbPage.vue'
import GeojsonPage from './pages/GeojsonPage.vue'

const activeTab = ref<'glb' | 'geojson'>('glb')
</script>

<template>
  <div class="app-shell">
    <nav class="nav-bar">
      <div class="brand">
        <h1 class="logo">3D Presenter</h1>
      </div>
      <div class="tabs">
        <button
          class="tab"
          :class="{ active: activeTab === 'glb' }"
          @click="activeTab = 'glb'"
        >
          GLB → HTML
        </button>
        <button
          class="tab"
          :class="{ active: activeTab === 'geojson' }"
          @click="activeTab = 'geojson'"
        >
          GeoJSON → GLB
        </button>
      </div>
    </nav>
    <GlbPage v-if="activeTab === 'glb'" />
    <GeojsonPage v-else />
  </div>
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

.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 48px;
  background: #16213e;
  border-bottom: 1px solid #0f3460;
  flex-shrink: 0;
}

.brand {
  display: flex;
  align-items: center;
}

.logo {
  font-size: 15px;
  font-weight: 700;
  color: #e94560;
  letter-spacing: 0.5px;
}

.tabs {
  display: flex;
  gap: 4px;
}

.tab {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #7a7a8a;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.tab:hover {
  color: #e0e0e0;
  background: rgba(255, 255, 255, 0.05);
}

.tab.active {
  color: #fff;
  background: #e94560;
}
</style>
