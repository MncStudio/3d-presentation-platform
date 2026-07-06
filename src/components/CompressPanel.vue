<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  analyzeGlb as analyzeGlbAdvanced,
  compressGlb,
  DEFAULT_COMPRESS_OPTIONS,
} from '../builder/glbProcessor'
import type { GlbStats, CompressResult } from '../builder/glbProcessor'

const props = defineProps<{
  glbData: ArrayBuffer
}>()

const emit = defineEmits<{
  'compressed': [data: ArrayBuffer]
  'restore': []
}>()

// ========== 状态 ==========

const stats = ref<GlbStats | null>(null)
const isAnalyzing = ref(false)
const isCompressing = ref(false)
const errorMsg = ref<string | null>(null)
const result = ref<CompressResult | null>(null)

// 压缩选项
const simplifyRatio = ref(DEFAULT_COMPRESS_OPTIONS.simplifyRatio)
const simplifyError = ref(DEFAULT_COMPRESS_OPTIONS.simplifyError)
const enableWeld = ref(DEFAULT_COMPRESS_OPTIONS.weld)
const enableDedup = ref(DEFAULT_COMPRESS_OPTIONS.dedup)
const textureMaxSize = ref(DEFAULT_COMPRESS_OPTIONS.textureMaxSize)
const enableQuantize = ref(DEFAULT_COMPRESS_OPTIONS.quantize)

// 是否使用压缩版本预览
const useCompressedPreview = ref(false)

// 减面比例百分比显示
const simplifyPercent = computed({
  get: () => Math.round(simplifyRatio.value * 100),
  set: (v: number) => { simplifyRatio.value = v / 100 },
})

// 压缩率颜色
const ratioClass = computed(() => {
  if (!result.value) return ''
  const r = result.value.compressionRatio
  if (r >= 30) return 'ratio-good'
  if (r >= 10) return 'ratio-ok'
  return 'ratio-low'
})

// ========== 分析模型 ==========

watch(() => props.glbData, async (data) => {
  if (!data) return
  isAnalyzing.value = true
  errorMsg.value = null
  result.value = null
  useCompressedPreview.value = false

  try {
    stats.value = await analyzeGlbAdvanced(data)
  } catch (e: any) {
    errorMsg.value = '分析失败: ' + (e.message || '未知错误')
    stats.value = null
  } finally {
    isAnalyzing.value = false
  }
}, { immediate: true })

// ========== 执行压缩 ==========

async function handleCompress() {
  if (!props.glbData) return
  isCompressing.value = true
  errorMsg.value = null

  try {
    result.value = await compressGlb(props.glbData, {
      simplifyRatio: simplifyRatio.value,
      simplifyError: simplifyError.value,
      weld: enableWeld.value,
      dedup: enableDedup.value,
      textureMaxSize: textureMaxSize.value,
      quantize: enableQuantize.value,
    })
  } catch (e: any) {
    errorMsg.value = '压缩失败: ' + (e.message || '未知错误')
  } finally {
    isCompressing.value = false
  }
}

// ========== 切换预览 ==========

function togglePreview() {
  useCompressedPreview.value = !useCompressedPreview.value
  if (useCompressedPreview.value && result.value) {
    emit('compressed', result.value.data)
  } else {
    emit('restore')
  }
}

// ========== 还原 ==========

function handleRestore() {
  result.value = null
  useCompressedPreview.value = false
  emit('restore')
}
</script>

<template>
  <div class="compress-panel">
    <!-- 模型信息 -->
    <div class="section">
      <h3 class="section-title">📊 模型信息</h3>
      <div v-if="isAnalyzing" class="loading-text">分析中...</div>
      <div v-else-if="stats" class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">文件大小</span>
          <span class="stat-value">{{ stats.fileSizeFormatted }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">三角形</span>
          <span class="stat-value">{{ stats.triangleCount.toLocaleString() }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">顶点</span>
          <span class="stat-value">{{ stats.vertexCount.toLocaleString() }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">网格</span>
          <span class="stat-value">{{ stats.meshCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">材质</span>
          <span class="stat-value">{{ stats.materialCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">纹理</span>
          <span class="stat-value">{{ stats.textureCount }}</span>
        </div>
        <div class="stat-item" v-if="stats.animationCount > 0">
          <span class="stat-label">动画</span>
          <span class="stat-value">{{ stats.animationCount }}</span>
        </div>
      </div>
    </div>

    <!-- 压缩选项 -->
    <div class="section">
      <h3 class="section-title">🔧 压缩设置</h3>

      <!-- 减面比例 -->
      <div class="option-row">
        <label class="option-label">
          减面比例 <span class="option-value">{{ simplifyPercent }}%</span>
        </label>
        <input
          type="range"
          class="slider"
          v-model.number="simplifyPercent"
          min="10"
          max="100"
          step="5"
        />
        <div class="range-labels">
          <span>10%</span>
          <span>100%</span>
        </div>
      </div>

      <!-- 纹理尺寸 -->
      <div class="option-row">
        <label class="option-label">纹理最大尺寸</label>
        <select v-model.number="textureMaxSize" class="select-input">
          <option :value="0">不缩放</option>
          <option :value="2048">2048px</option>
          <option :value="1024">1024px</option>
          <option :value="512">512px</option>
          <option :value="256">256px</option>
        </select>
      </div>

      <!-- 开关选项 -->
      <div class="toggle-row">
        <label class="toggle-label" title="合并相近顶点，减少顶点数">
          <input type="checkbox" v-model="enableWeld" />
          <span>顶点焊接</span>
        </label>
        <label class="toggle-label" title="移除重复的纹理和资源">
          <input type="checkbox" v-model="enableDedup" />
          <span>资源去重</span>
        </label>
        <label class="toggle-label" title="降低顶点数据精度以减小体积">
          <input type="checkbox" v-model="enableQuantize" />
          <span>顶点量化</span>
        </label>
      </div>
    </div>

    <!-- 压缩按钮 -->
    <button
      class="btn btn-compress"
      :disabled="isCompressing || !stats"
      @click="handleCompress"
    >
      {{ isCompressing ? '压缩中...' : '⚡ 应用压缩' }}
    </button>

    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

    <!-- 压缩结果 -->
    <div v-if="result" class="section result-section">
      <h3 class="section-title">📦 压缩结果</h3>

      <div class="result-grid">
        <div class="result-item">
          <span class="result-label">原始大小</span>
          <span class="result-value">{{ result.originalStats.fileSizeFormatted }}</span>
        </div>
        <div class="result-item">
          <span class="result-label">压缩后</span>
          <span class="result-value highlight">{{ result.compressedSizeFormatted }}</span>
        </div>
        <div class="result-item">
          <span class="result-label">压缩率</span>
          <span class="result-value" :class="ratioClass">
            {{ result.compressionRatio >= 0 ? '↓' : '↑' }}
            {{ Math.abs(result.compressionRatio) }}%
          </span>
        </div>
        <div class="result-item">
          <span class="result-label">原始面数</span>
          <span class="result-value">{{ result.originalStats.triangleCount.toLocaleString() }}</span>
        </div>
        <div class="result-item">
          <span class="result-label">压缩后面数</span>
          <span class="result-value highlight">
            {{ result.compressedStats.triangleCount.toLocaleString() }}
          </span>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="result-actions">
        <button
          class="btn btn-compare"
          :class="{ active: useCompressedPreview }"
          @click="togglePreview"
        >
          {{ useCompressedPreview ? '👁 查看原始' : '👁 预览压缩效果' }}
        </button>
        <button class="btn btn-restore" @click="handleRestore">
          ↩ 还原
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.compress-panel {
  background: rgba(15, 52, 96, 0.2);
  border: 1px solid rgba(15, 52, 96, 0.5);
  border-radius: 10px;
  padding: 16px;
  overflow-y: auto;
  max-height: calc(100vh - 140px);
  font-size: 12px;
}

.section {
  margin-bottom: 14px;
}

.section-title {
  font-size: 12px;
  font-weight: 700;
  color: #aaa;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 模型信息 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.stat-label {
  color: #777;
}

.stat-value {
  color: #ccc;
  font-weight: 600;
}

/* 压缩选项 */
.option-row {
  margin-bottom: 10px;
}

.option-label {
  display: flex;
  justify-content: space-between;
  color: #aaa;
  margin-bottom: 4px;
}

.option-value {
  color: #e94560;
  font-weight: 700;
}

.slider {
  width: 100%;
  accent-color: #e94560;
  cursor: pointer;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #555;
  margin-top: 2px;
}

.select-input {
  width: 100%;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid #333;
  border-radius: 4px;
  color: #ccc;
  font-size: 12px;
}

/* 开关 */
.toggle-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #999;
  cursor: pointer;
  font-size: 12px;
}

.toggle-label input[type="checkbox"] {
  accent-color: #e94560;
}

/* 按钮 */
.btn {
  width: 100%;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 6px;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-compress {
  background: #e94560;
  color: #fff;
}

.btn-compress:hover:not(:disabled) {
  background: #c73652;
}

.btn-compare {
  background: transparent;
  color: #4fc3f7;
  border: 1px solid #4fc3f7;
}

.btn-compare:hover {
  background: rgba(79, 195, 247, 0.1);
}

.btn-compare.active {
  background: rgba(79, 195, 247, 0.2);
}

.btn-restore {
  background: transparent;
  color: #888;
  border: 1px solid #444;
}

.btn-restore:hover {
  color: #e94560;
  border-color: #e94560;
}

/* 压缩结果 */
.result-section {
  border-top: 1px solid rgba(15, 52, 96, 0.5);
  padding-top: 10px;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  margin-bottom: 10px;
}

.result-item {
  display: flex;
  flex-direction: column;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.result-label {
  color: #666;
  font-size: 10px;
}

.result-value {
  color: #ccc;
  font-weight: 600;
}

.result-value.highlight {
  color: #4fc3f7;
}

.ratio-good {
  color: #4caf50 !important;
}

.ratio-ok {
  color: #ff9800 !important;
}

.ratio-low {
  color: #f44336 !important;
}

.result-actions {
  display: flex;
  gap: 6px;
}

.result-actions .btn {
  flex: 1;
  margin-bottom: 0;
}

.error-msg {
  color: #e94560;
  font-size: 11px;
  margin-top: 4px;
}

.loading-text {
  color: #666;
  font-size: 12px;
}
</style>
