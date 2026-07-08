<script setup lang="ts">
import { ref } from 'vue'
import DropZone from '../components/DropZone.vue'
import PreviewPanel from '../components/PreviewPanel.vue'
import CompressPanel from '../components/CompressPanel.vue'
import ExportBar from '../components/ExportBar.vue'

const glbData = ref<ArrayBuffer | null>(null)
const originalGlbData = ref<ArrayBuffer | null>(null)
const glbFileName = ref<string>('')
const isCompressed = ref(false)

const isLoading = ref(false)
const loadError = ref<string | null>(null)

async function handleFileSelected(file: File) {
  glbFileName.value = file.name
  isLoading.value = true
  loadError.value = null
  isCompressed.value = false

  try {
    const data = await readFileAsArrayBuffer(file)
    glbData.value = data
    originalGlbData.value = data
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
  <div class="glb-page">
    <!-- 无模型时显示拖拽区 -->
    <div v-if="!glbData" class="upload-section">
      <DropZone
        :accept-extensions="['.glb']"
        description="GLB"
        @file-selected="handleFileSelected"
      />
      <p v-if="loadError" class="error-msg">{{ loadError }}</p>
      <p v-if="isLoading" class="loading-msg">正在读取模型...</p>
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
.glb-page {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  min-height: 0;
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
