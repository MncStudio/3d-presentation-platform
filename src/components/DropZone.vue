<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  'file-selected': [file: File]
}>()

const isDragOver = ref(false)
const fileInput = ref<HTMLInputElement>()

function onDragOver(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false

  const file = e.dataTransfer?.files?.[0]
  if (!file) return

  if (!file.name.toLowerCase().endsWith('.glb')) {
    alert('请拖入 .glb 格式的模型文件')
    return
  }

  emit('file-selected', file)
}

async function onClickSelect() {
  // Electron 环境：使用原生文件对话框 + IPC 读取
  if (window.electronAPI) {
    const filePath = await window.electronAPI.openGlb()
    if (filePath) {
      const buffer = await window.electronAPI.readFile(filePath)
      if (buffer) {
        const fileName = filePath.split(/[/\\]/).pop() || 'model.glb'
        const file = new File([buffer], fileName, { type: 'model/gltf-binary' })
        emit('file-selected', file)
      }
    }
    return
  }

  // 浏览器环境：使用原生 file input
  fileInput.value?.click()
}

function onFileInputChange() {
  const file = fileInput.value?.files?.[0]
  if (!file) return
  emit('file-selected', file)
  // 重置以便重复选择同一文件
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <div
    class="dropzone"
    :class="{ 'drag-over': isDragOver }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @click="onClickSelect"
  >
    <input
      ref="fileInput"
      type="file"
      accept=".glb"
      hidden
      @change="onFileInputChange"
    />
    <div class="dropzone-icon">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path
          d="M24 4L4 16L24 28L44 16L24 4Z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linejoin="round"
        />
        <path
          d="M4 32L24 44L44 32"
          stroke="currentColor"
          stroke-width="2"
          stroke-linejoin="round"
        />
        <path
          d="M4 24L24 36L44 24"
          stroke="currentColor"
          stroke-width="2"
          stroke-linejoin="round"
        />
      </svg>
    </div>
    <p class="dropzone-text">拖入 GLB 文件</p>
    <p class="dropzone-hint">或点击选择文件</p>
  </div>
</template>

<style scoped>
.dropzone {
  width: 360px;
  height: 220px;
  border: 2px dashed #0f3460;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
  background: rgba(15, 52, 96, 0.15);
}

.dropzone:hover {
  border-color: #e94560;
  background: rgba(233, 69, 96, 0.08);
}

.dropzone.drag-over {
  border-color: #e94560;
  background: rgba(233, 69, 96, 0.15);
  transform: scale(1.02);
}

.dropzone-icon {
  color: #7a7a8a;
  transition: color 0.25s;
}

.dropzone:hover .dropzone-icon {
  color: #e94560;
}

.dropzone-text {
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
}

.dropzone-hint {
  font-size: 12px;
  color: #7a7a8a;
}
</style>
