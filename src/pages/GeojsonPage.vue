<template>
  <div class="geojson-page">
    <!-- 无模型时显示拖拽区 -->
    <div v-if="!glbData" class="upload-section">
      <DropZone
        :accept-extensions="['.geojson', '.json']"
        description="GeoJSON"
        @file-selected="handleFileSelected"
      />
      <p v-if="loadError" class="error-msg">{{ loadError }}</p>
      <p v-if="isLoading" class="loading-msg">{{ loadingMessage }}</p>
    </div>

    <!-- 有模型时：预览 + 设置侧边栏 -->
    <div v-else class="main-content">
      <div class="preview-section">
        <PreviewPanel :glb-data="glbData" :file-name="glbFileName" />
      </div>
      <aside class="sidebar">
        <GeojsonSettings
          v-if="rawGeojson"
          :geojson="rawGeojson"
          :options="conversionOpts"
          @apply="handleApplySettings"
        />
      </aside>
    </div>

    <!-- 底部操作栏 -->
    <footer v-if="glbData" class="action-bar">
      <span class="file-info">{{ outputGlbName }}</span>
      <span v-if="isConverting" class="converting-hint">转换中...</span>
      <span v-if="loadError" class="error-inline">{{ loadError }}</span>
      <div class="actions">
        <button class="btn btn-clear" @click="handleClear">清除</button>
        <button class="btn btn-download" @click="handleDownloadGlb">下载 GLB</button>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import DropZone from '../components/DropZone.vue'
import PreviewPanel from '../components/PreviewPanel.vue'
import GeojsonSettings from '../components/GeojsonSettings.vue'
import { geojsonToGlb } from '../builder/geoJsonProcessor'
import { DEFAULT_CONVERSION_OPTIONS } from '../builder/geoJsonTypes'
import type { GeoJsonConversionOptions } from '../builder/geoJsonTypes'

const glbData = ref<ArrayBuffer | null>(null)
const glbFileName = ref<string>('')
const outputGlbName = ref<string>('')

const rawGeojson = ref<object | null>(null)
const conversionOpts = reactive<GeoJsonConversionOptions>({ ...DEFAULT_CONVERSION_OPTIONS })

const isLoading = ref(false)
const isConverting = ref(false)
const loadingMessage = ref('')
const loadError = ref<string | null>(null)

async function doConvert(geojson: object, opts: GeoJsonConversionOptions) {
  isConverting.value = true
  try {
    loadingMessage.value = '正在生成 3D 模型...'
    const glbBuffer = await geojsonToGlb(geojson, opts)
    glbData.value = glbBuffer
  } catch (e: any) {
    loadError.value = e.message || '转换失败'
    glbData.value = null
  } finally {
    isConverting.value = false
  }
}

async function handleFileSelected(file: File) {
  glbFileName.value = file.name
  outputGlbName.value = file.name.replace(/\.(geojson|json)$/i, '') + '.glb'
  isLoading.value = true
  loadError.value = null
  Object.assign(conversionOpts, DEFAULT_CONVERSION_OPTIONS)

  try {
    loadingMessage.value = '正在解析 GeoJSON...'
    const text = await readFileAsText(file)
    let geojson: object
    try {
      geojson = JSON.parse(text)
    } catch {
      throw new Error('JSON 解析失败，请确认文件为有效的 GeoJSON 格式')
    }
    rawGeojson.value = geojson
    await doConvert(geojson, conversionOpts)
  } catch (e: any) {
    loadError.value = e.message || '文件加载失败'
    glbData.value = null
  } finally {
    isLoading.value = false
  }
}

async function handleApplySettings(opts: GeoJsonConversionOptions) {
  Object.assign(conversionOpts, opts)
  if (rawGeojson.value) {
    loadError.value = null
    await doConvert(rawGeojson.value, conversionOpts)
  }
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}

function handleDownloadGlb() {
  if (!glbData.value) return
  const blob = new Blob([glbData.value], { type: 'model/gltf-binary' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = outputGlbName.value
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function handleClear() {
  glbData.value = null
  rawGeojson.value = null
  glbFileName.value = ''
  outputGlbName.value = ''
  loadError.value = null
}
</script>

<style scoped>
.geojson-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.upload-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.preview-section {
  flex: 1;
  height: 100%;
}

.sidebar {
  width: 280px;
  height: 100%;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-left: 1px solid #0f3460;
  overflow-y: auto;
  flex-shrink: 0;
}

.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: #16213e;
  border-top: 1px solid #0f3460;
  gap: 16px;
  flex-shrink: 0;
}

.file-info {
  font-size: 12px;
  color: #7a7a8a;
}

.converting-hint {
  font-size: 11px;
  color: #ff9800;
}

.error-inline {
  font-size: 11px;
  color: #e94560;
}

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-left: auto;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-download {
  background: #009688;
  color: #fff;
}

.btn-download:hover {
  background: #00796b;
}

.btn-clear {
  background: transparent;
  color: #888;
  border: 1px solid #333;
}

.btn-clear:hover {
  color: #e94560;
  border-color: #e94560;
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
