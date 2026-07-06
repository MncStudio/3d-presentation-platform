<script setup lang="ts">
import { ref } from 'vue'
import DropZone from '../components/DropZone.vue'
import PreviewPanel from '../components/PreviewPanel.vue'
import ExportBar from '../components/ExportBar.vue'

const glbData = ref<ArrayBuffer | null>(null)
const glbFileName = ref<string>('')

// 模型加载状态
const isLoading = ref(false)
const loadError = ref<string | null>(null)

async function handleFileSelected(file: File) {
  glbFileName.value = file.name
  isLoading.value = true
  loadError.value = null

  try {
    // FileReader 读取文件，兼容 Electron 和浏览器环境
    glbData.value = await readFileAsArrayBuffer(file)
  } catch (e: any) {
    loadError.value = e.message || '文件加载失败'
    glbData.value = null
  } finally {
    isLoading.value = false
  }
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

// 清除当前模型
function handleClear() {
  glbData.value = null
  glbFileName.value = ''
  loadError.value = null
}
</script>

<template>
  <div class="home">
    <header class="titlebar">
      <h1 class="logo">3D Presenter</h1>
      <span class="subtitle">GLB → 单文件 HTML 演示</span>
    </header>

    <main class="main-area">
      <!-- 无模型时显示拖拽区 -->
      <div v-if="!glbData" class="upload-section">
        <DropZone
          @file-selected="handleFileSelected"
        />
        <p v-if="loadError" class="error-msg">{{ loadError }}</p>
        <p v-if="isLoading" class="loading-msg">正在读取模型...</p>
      </div>

      <!-- 有模型时显示预览 -->
      <div v-else class="preview-section">
        <PreviewPanel
          :glb-data="glbData"
          :file-name="glbFileName"
        />
      </div>
    </main>

    <!-- 底部导出栏 -->
    <ExportBar
      v-if="glbData"
      :glb-data="glbData"
      :file-name="glbFileName"
      @clear="handleClear"
    />
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.titlebar {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 12px 20px;
  background: #16213e;
  border-bottom: 1px solid #0f3460;
  -webkit-app-region: drag;
}

.logo {
  font-size: 16px;
  font-weight: 700;
  color: #e94560;
  letter-spacing: 0.5px;
}

.subtitle {
  font-size: 11px;
  color: #7a7a8a;
}

.main-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.upload-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.preview-section {
  width: 100%;
  height: 100%;
}

.error-msg {
  color: #e94560;
  font-size: 13px;
}

.loading-msg {
  color: #7a7a8a;
  font-size: 13px;
}
</style>
