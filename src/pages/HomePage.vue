<script setup lang="ts">
import { ref } from 'vue'
import DropZone from '../components/DropZone.vue'
import PreviewPanel from '../components/PreviewPanel.vue'
import CompressPanel from '../components/CompressPanel.vue'
import ExportBar from '../components/ExportBar.vue'
import { geojsonToGlb } from '../builder/geoJsonProcessor'

const glbData = ref<ArrayBuffer | null>(null)
const originalGlbData = ref<ArrayBuffer | null>(null)
const glbFileName = ref<string>('')
const isCompressed = ref(false)

const isLoading = ref(false)
const loadingMessage = ref('')
const loadError = ref<string | null>(null)

const isGeoJson = (name: string) => {
  const lower = name.toLowerCase()
  return lower.endsWith('.geojson') || lower.endsWith('.json')
}

async function handleFileSelected(file: File) {
  glbFileName.value = file.name
  isLoading.value = true
  loadError.value = null
  isCompressed.value = false

  try {
    if (isGeoJson(file.name)) {
      loadingMessage.value = '正在解析 GeoJSON...'
      const text = await readFileAsText(file)
      let geojson: object
      try {
        geojson = JSON.parse(text)
      } catch {
        throw new Error('JSON 解析失败，请确认文件为有效的 GeoJSON 格式')
      }
      loadingMessage.value = '正在生成 3D 模型...'
      const glbBuffer = await geojsonToGlb(geojson)
      glbData.value = glbBuffer
      originalGlbData.value = glbBuffer
    } else {
      loadingMessage.value = '正在读取模型...'
      const data = await readFileAsArrayBuffer(file)
      glbData.value = data
      originalGlbData.value = data
    }
  } catch (e: any) {
    loadError.value = e.message || '文件加载失败'
    glbData.value = null
    originalGlbData.value = null
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

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}

// 切换到压缩版本预览
function handleCompressed(data: ArrayBuffer) {
  glbData.value = data
  isCompressed.value = true
}

// 还原到原始版本
function handleRestore() {
  glbData.value = originalGlbData.value
  isCompressed.value = false
}

// 清除当前模型
function handleClear() {
  glbData.value = null
  originalGlbData.value = null
  glbFileName.value = ''
  loadError.value = null
  isCompressed.value = false
}
</script>

<template>
  <div class="home">
    <header class="titlebar">
      <h1 class="logo">3D Presenter</h1>
      <span class="subtitle">GLB / GeoJSON → 单文件 HTML 演示</span>
    </header>

    <main class="main-area">
      <!-- 无模型时显示拖拽区 -->
      <div v-if="!glbData" class="upload-section">
        <DropZone
          @file-selected="handleFileSelected"
        />
        <p v-if="loadError" class="error-msg">{{ loadError }}</p>
        <p v-if="isLoading" class="loading-msg">{{ loadingMessage }}</p>
      </div>

      <!-- 有模型时：预览 + 侧边压缩面板 -->
      <template v-else>
        <div class="preview-section">
          <PreviewPanel
            :glb-data="glbData"
            :file-name="glbFileName"
          />
        </div>
        <aside class="sidebar">
          <CompressPanel
            :glb-data="originalGlbData!"
            @compressed="handleCompressed"
            @restore="handleRestore"
          />
        </aside>
      </template>
    </main>

    <!-- 底部导出栏（使用当前预览的数据） -->
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
  flex: 1;
  height: 100%;
}

.sidebar {
  width: 260px;
  height: 100%;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-left: 1px solid #0f3460;
  overflow-y: auto;
  flex-shrink: 0;
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
