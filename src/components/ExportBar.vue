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

const autoRotate = ref(true)
const autoPlay = ref(true)
const autoCenter = ref(true)
const orbitControl = ref(true)

const isExporting = ref(false)
const exportDone = ref(false)

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

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    exportDone.value = true
  } catch (e: any) {
    alert('导出失败: ' + (e.message || '未知错误'))
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <footer class="export-bar">
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

    <div class="actions">
      <button class="btn btn-clear" @click="emit('clear')">清除</button>
      <button
        class="btn btn-export"
        :disabled="isExporting"
        @click="handleExport"
      >
        {{ isExporting ? '生成中...' : '生成 HTML' }}
      </button>
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
</style>
