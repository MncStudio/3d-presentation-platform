<script setup lang="ts">
import { ref, computed } from 'vue'
import { buildHtml } from '../builder/htmlBuilder'

const props = defineProps<{
  glbData: ArrayBuffer
  fileName: string
}>()

const emit = defineEmits<{
  clear: []
}>()

// 导出选项
const autoRotate = ref(true)
const autoPlay = ref(true)
const autoCenter = ref(true)
const orbitControl = ref(true)

const isExporting = ref(false)
const exportDone = ref(false)
const outputPath = ref<string | null>(null)

const defaultOutputName = computed(() => {
  const base = props.fileName.replace(/\.glb$/i, '')
  return `${base}-demo.html`
})

async function handleExport() {
  isExporting.value = true
  exportDone.value = false

  try {
    const html = await buildHtml({
      glbData: props.glbData,
      autoRotate: autoRotate.value,
      autoPlay: autoPlay.value,
      autoCenter: autoCenter.value,
      orbitControl: orbitControl.value,
    })

    const fileName = defaultOutputName.value

    // Electron 环境：使用原生保存对话框
    if (window.electronAPI) {
      const savePath = await window.electronAPI.saveHtml(fileName)
      if (!savePath) {
        isExporting.value = false
        return
      }

      // 通过 IPC 让主进程写文件（暂时用 download 方案）
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = savePath.split(/[/\\]/).pop() || fileName
      a.click()
      URL.revokeObjectURL(url)

      outputPath.value = savePath
    } else {
      // 浏览器环境：直接触发下载
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    exportDone.value = true
  } catch (e: any) {
    alert('导出失败: ' + (e.message || '未知错误'))
  } finally {
    isExporting.value = false
  }
}

function handleOpenFolder() {
  if (outputPath.value && window.electronAPI) {
    window.electronAPI.showItemInFolder(outputPath.value)
  }
}

function handleOpenPreview() {
  if (outputPath.value && window.electronAPI) {
    window.electronAPI.openPath(outputPath.value)
  }
}
</script>

<template>
  <footer class="export-bar">
    <!-- 导出选项 -->
    <div class="options">
      <label class="option" title="自动旋转模型">
        <input type="checkbox" v-model="autoRotate" />
        <span>自动旋转</span>
      </label>
      <label class="option" title="自动播放骨骼动画">
        <input type="checkbox" v-model="autoPlay" />
        <span>自动播放动画</span>
      </label>
      <label class="option" title="自动居中模型">
        <input type="checkbox" v-model="autoCenter" />
        <span>自动居中</span>
      </label>
      <label class="option" title="鼠标旋转/缩放/平移">
        <input type="checkbox" v-model="orbitControl" />
        <span>OrbitControls</span>
      </label>
    </div>

    <!-- 操作按钮 -->
    <div class="actions">
      <button class="btn btn-clear" @click="emit('clear')">清除</button>
      <button
        class="btn btn-export"
        :disabled="isExporting"
        @click="handleExport"
      >
        {{ isExporting ? '生成中...' : '生成 HTML' }}
      </button>

      <!-- 导出成功后的快捷操作（仅 Electron 环境） -->
      <template v-if="exportDone && window.electronAPI">
        <button class="btn btn-outline" @click="handleOpenFolder">📂 打开目录</button>
        <button class="btn btn-outline" @click="handleOpenPreview">🌍 打开预览</button>
      </template>
    </div>
  </footer>
</template>

<style scoped>
.export-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: #16213e;
  border-top: 1px solid #0f3460;
  gap: 16px;
  flex-wrap: wrap;
}

.options {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.option {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #aaa;
  cursor: pointer;
}

.option input[type="checkbox"] {
  accent-color: #e94560;
}

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-export {
  background: #e94560;
  color: #fff;
}

.btn-export:hover:not(:disabled) {
  background: #c73652;
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

.btn-outline {
  background: transparent;
  color: #4fc3f7;
  border: 1px solid #4fc3f7;
}

.btn-outline:hover {
  background: rgba(79, 195, 247, 0.1);
}
</style>
