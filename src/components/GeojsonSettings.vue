<template>
  <div class="settings-panel">
    <div class="sections-wrap">
      <!-- 要素统计 -->
      <div class="section">
        <h3 class="section-title">📊 GeoJSON 信息</h3>
        <div class="summary">
          <span class="summary-total">{{ featureCount.total }} 个要素</span>
        </div>
        <div class="type-list">
          <div v-for="(count, type) in featureCount.byType" :key="type" class="type-item">
            <span class="type-icon">{{ typeIcons[type] || '📦' }}</span>
            <span class="type-name">{{ typeLabels[type] || type }}</span>
            <span class="type-count">{{ count }}</span>
          </div>
        </div>
      </div>

      <!-- 高度设置 -->
      <div class="section">
        <h3 class="section-title">📐 高度设置</h3>
        <div class="option-row">
          <label class="option-label">
            默认高度 <span class="option-value">{{ opts.defaultHeight.toFixed(2) }}</span>
          </label>
          <input type="range" class="slider" v-model.number="heightPercent" min="0" max="100" />
          <div class="range-labels"><span>0.01</span><span>2.00</span></div>
          <p class="hint">无 height 属性时的 fallback 挤出高度</p>
        </div>
        <div class="option-row">
          <label class="option-label">
            高度缩放 <span class="option-value">{{ opts.heightScale.toFixed(2) }}×</span>
          </label>
          <input type="range" class="slider" v-model.number="heightScalePct" min="0" max="100" />
          <div class="range-labels"><span>0.1×</span><span>5×</span></div>
          <p class="hint">所有高度统一乘以此倍数（含海拔坐标 + 挤出深度）</p>
        </div>
        <div class="option-row">
          <label class="option-label">高度属性名</label>
          <input type="text" class="text-input" v-model="opts.heightProperty" placeholder="height" />
          <p class="hint">GeoJSON properties 中读取高度的字段名</p>
        </div>
      </div>

      <!-- 颜色设置 -->
      <div class="section">
        <h3 class="section-title">🎨 颜色设置</h3>
        <div class="option-row">
          <label class="option-label">颜色属性名</label>
          <input type="text" class="text-input" v-model="opts.colorProperty" placeholder="color" />
          <p class="hint">GeoJSON properties 中读取颜色的字段（支持 #hex）</p>
        </div>
        <div class="color-grid">
          <div class="color-item">
            <label class="color-label">📍 点</label>
            <input type="color" class="color-input" v-model="opts.pointColor" />
            <span class="color-hex">{{ opts.pointColor }}</span>
          </div>
          <div class="color-item">
            <label class="color-label">📏 线</label>
            <input type="color" class="color-input" v-model="opts.lineColor" />
            <span class="color-hex">{{ opts.lineColor }}</span>
          </div>
          <div class="color-item">
            <label class="color-label">🔷 多边形</label>
            <input type="color" class="color-input" v-model="opts.polygonColor" />
            <span class="color-hex">{{ opts.polygonColor }}</span>
          </div>
        </div>
        <p class="hint" style="margin-top:6px">当 properties 中无颜色字段时，按类型使用此处 fallback 色</p>
      </div>

      <!-- 材质设置 -->
      <div class="section">
        <h3 class="section-title">✨ 材质设置</h3>
        <div class="option-row">
          <label class="option-label">
            粗糙度 <span class="option-value">{{ opts.roughness.toFixed(2) }}</span>
          </label>
          <input type="range" class="slider" v-model.number="roughnessPct" min="0" max="100" />
          <div class="range-labels"><span>光滑 0</span><span>粗糙 1</span></div>
        </div>
        <div class="option-row">
          <label class="option-label">
            金属度 <span class="option-value">{{ opts.metalness.toFixed(2) }}</span>
          </label>
          <input type="range" class="slider" v-model.number="metalnessPct" min="0" max="100" />
          <div class="range-labels"><span>非金属 0</span><span>金属 1</span></div>
        </div>
      </div>

      <!-- 倒角设置 -->
      <div class="section">
        <h3 class="section-title">🔲 多边形倒角</h3>
        <div class="option-row">
          <label class="option-label">
            倒角厚度 <span class="option-value">{{ opts.bevelThickness.toFixed(3) }}</span>
          </label>
          <input type="range" class="slider" v-model.number="bevelThickPct" min="0" max="100" />
          <div class="range-labels"><span>0（无）</span><span>0.10</span></div>
        </div>
        <div class="option-row">
          <label class="option-label">
            倒角宽度 <span class="option-value">{{ opts.bevelSize.toFixed(3) }}</span>
          </label>
          <input type="range" class="slider" v-model.number="bevelSizePct" min="0" max="100" />
          <div class="range-labels"><span>0（无）</span><span>0.10</span></div>
        </div>
        <div class="option-row">
          <label class="option-label">
            倒角分段 <span class="option-value">{{ opts.bevelSegments }}</span>
          </label>
          <input type="range" class="slider" v-model.number="bevelSegPct" min="0" max="100" />
          <div class="range-labels"><span>1（锐利）</span><span>10（圆滑）</span></div>
          <p class="hint">仅在高度 > 0.1 且倒角厚度/宽度 > 0 时生效</p>
        </div>
        <div class="option-row">
          <label class="toggle-row">
            <input type="checkbox" v-model="opts.showOutlines" class="toggle-input" />
            <span class="toggle-label">显示轮廓线</span>
          </label>
          <p class="hint">在多边形挤出体顶部绘制边线，方便区分相邻区域</p>
        </div>
      </div>

      <!-- 管线设置 -->
      <div class="section">
        <h3 class="section-title">📏 线段管线</h3>
        <div class="option-row">
          <label class="option-label">
            管线半径 <span class="option-value">{{ opts.tubeRadius.toFixed(3) }}</span>
          </label>
          <input type="range" class="slider" v-model.number="tubeRadiusPct" min="0" max="100" />
          <div class="range-labels"><span>0.005</span><span>0.15</span></div>
        </div>
        <div class="option-row">
          <label class="option-label">
            圆周分段 <span class="option-value">{{ opts.tubeRadialSegments }}</span>
          </label>
          <input type="range" class="slider" v-model.number="tubeRadialPct" min="0" max="100" />
          <div class="range-labels"><span>3面</span><span>16面</span></div>
          <p class="hint">值越大管线截面越圆滑</p>
        </div>
        <div class="option-row">
          <label class="option-label">
            路径分段因子 <span class="option-value">{{ opts.tubePathSegments }}×</span>
          </label>
          <input type="range" class="slider" v-model.number="tubePathPct" min="0" max="100" />
          <div class="range-labels"><span>1×</span><span>8×</span></div>
          <p class="hint">每点数 × 此值 = 总段数（上限 128），越大曲线越平滑</p>
        </div>
      </div>

      <!-- 样式设置 -->
      <div class="section">
        <h3 class="section-title">🎯 点标记 &amp; 尺寸</h3>
        <div class="option-row">
          <label class="option-label">
            点标记大小 <span class="option-value">{{ opts.pointRadius.toFixed(3) }}</span>
          </label>
          <input type="range" class="slider" v-model.number="pointRadiusPct" min="0" max="100" />
          <div class="range-labels"><span>0.01</span><span>0.30</span></div>
        </div>
        <div class="option-row">
          <label class="option-label">
            模型尺寸 <span class="option-value">{{ opts.targetSize.toFixed(1) }}</span>
          </label>
          <input type="range" class="slider" v-model.number="targetSizePct" min="0" max="100" />
          <div class="range-labels"><span>1</span><span>10</span></div>
          <p class="hint">模型在 3D 场景中的目标边界尺寸</p>
        </div>
      </div>
    </div>

    <!-- 应用按钮（吸底，始终可见） -->
    <button class="btn-apply" @click="handleApply">🔄 应用设置</button>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { GeoJsonConversionOptions } from '../builder/geoJsonTypes'
import { DEFAULT_CONVERSION_OPTIONS } from '../builder/geoJsonTypes'

const props = defineProps<{
  geojson: object
  options: GeoJsonConversionOptions
}>()

const emit = defineEmits<{
  'apply': [options: GeoJsonConversionOptions]
}>()

// ---- 要素统计 ----
interface FeatureCount {
  total: number
  byType: Record<string, number>
}

function countFeatures(geojson: object): FeatureCount {
  const byType: Record<string, number> = {}
  let features: any[] = []

  if ((geojson as any).type === 'FeatureCollection') {
    features = (geojson as any).features || []
  } else if ((geojson as any).type === 'Feature') {
    features = [(geojson as any)]
  }

  for (const f of features) {
    const t = f.geometry?.type || 'Unknown'
    byType[t] = (byType[t] || 0) + 1
  }

  return { total: features.length, byType }
}

const featureCount = ref<FeatureCount>({ total: 0, byType: {} })

watch(() => props.geojson, (gj) => {
  try { featureCount.value = countFeatures(gj) } catch { featureCount.value = { total: 0, byType: {} } }
}, { immediate: true })

// ---- 本地编辑中的选项 ----
const opts = reactive({ ...DEFAULT_CONVERSION_OPTIONS })

// 从 props 同步
watch(() => props.options, (o) => {
  Object.assign(opts, DEFAULT_CONVERSION_OPTIONS, o)
}, { immediate: true })

// 百分比辅助
function pct(get: () => number, set: (v: number) => void, min: number, max: number) {
  return computed({
    get: () => Math.round((get() - min) / (max - min) * 100),
    set: (v: number) => set(min + (v / 100) * (max - min)),
  })
}

const heightPercent = pct(() => opts.defaultHeight, (v) => { opts.defaultHeight = v }, 0.01, 2)
const heightScalePct = pct(() => opts.heightScale, (v) => { opts.heightScale = v }, 0.1, 5)
const pointRadiusPct = pct(() => opts.pointRadius, (v) => { opts.pointRadius = v }, 0.01, 0.3)
const tubeRadiusPct = pct(() => opts.tubeRadius, (v) => { opts.tubeRadius = v }, 0.005, 0.15)
const targetSizePct = pct(() => opts.targetSize, (v) => { opts.targetSize = v }, 1, 10)
const roughnessPct = pct(() => opts.roughness, (v) => { opts.roughness = v }, 0, 1)
const metalnessPct = pct(() => opts.metalness, (v) => { opts.metalness = v }, 0, 1)
const bevelThickPct = pct(() => opts.bevelThickness, (v) => { opts.bevelThickness = v }, 0, 0.1)
const bevelSizePct = pct(() => opts.bevelSize, (v) => { opts.bevelSize = v }, 0, 0.1)
const tubeRadialPct = pct(() => opts.tubeRadialSegments, (v) => { opts.tubeRadialSegments = Math.round(v) }, 3, 16)
const tubePathPct = pct(() => opts.tubePathSegments, (v) => { opts.tubePathSegments = Math.round(v) }, 1, 8)
const bevelSegPct = pct(() => opts.bevelSegments, (v) => { opts.bevelSegments = Math.round(v) }, 1, 10)

// 类型中文名映射
const typeLabels: Record<string, string> = {
  Point: '点', MultiPoint: '多点',
  LineString: '线段', MultiLineString: '多线段',
  Polygon: '多边形', MultiPolygon: '多多边形',
}

const typeIcons: Record<string, string> = {
  Point: '📍', MultiPoint: '📍',
  LineString: '📏', MultiLineString: '📏',
  Polygon: '🔷', MultiPolygon: '🔷',
}

function handleApply() {
  emit('apply', { ...opts })
}
</script>


<style scoped>
.settings-panel {
  background: rgba(15, 52, 96, 0.2);
  border: 1px solid rgba(15, 52, 96, 0.5);
  border-radius: 10px;
  padding: 16px;
  font-size: 12px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.sections-wrap {
  flex: 1 0 auto;
}

.section {
  margin-bottom: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(15, 52, 96, 0.3);
}

.section:last-of-type {
  border-bottom: none;
}

.section-title {
  font-size: 12px;
  font-weight: 700;
  color: #aaa;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* ---- 要素统计 ---- */
.summary { margin-bottom: 6px; }
.summary-total { color: #4fc3f7; font-weight: 700; }

.type-list { display: flex; flex-direction: column; gap: 3px; }
.type-item {
  display: flex; align-items: center; gap: 6px;
  padding: 3px 8px; background: rgba(0, 0, 0, 0.2); border-radius: 4px;
}
.type-icon { font-size: 10px; }
.type-name { flex: 1; color: #aaa; }
.type-count { color: #ccc; font-weight: 600; }

/* ---- 选项 ---- */
.option-row { margin-bottom: 10px; }
.option-label {
  display: flex; justify-content: space-between;
  color: #aaa; margin-bottom: 4px;
}
.option-value { color: #009688; font-weight: 700; }

.slider { width: 100%; accent-color: #009688; cursor: pointer; }
.range-labels {
  display: flex; justify-content: space-between;
  font-size: 10px; color: #555; margin-top: 2px;
}

.text-input {
  width: 100%; padding: 5px 8px;
  background: rgba(0, 0, 0, 0.3); border: 1px solid #333; border-radius: 4px;
  color: #ccc; font-size: 12px; outline: none; transition: border-color 0.2s;
}
.text-input:focus { border-color: #009688; }

.hint { font-size: 10px; color: #555; margin-top: 3px; }

/* ---- 开关 ---- */
.toggle-row {
  display: flex; align-items: center; gap: 8px; cursor: pointer;
}
.toggle-input {
  width: 14px; height: 14px; accent-color: #009688; cursor: pointer; margin: 0;
}
.toggle-label { color: #aaa; font-size: 12px; user-select: none; }

/* ---- 颜色网格 ---- */
.color-grid {
  display: flex; flex-direction: column; gap: 4px;
}
.color-item {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 8px; background: rgba(0, 0, 0, 0.2); border-radius: 4px;
}
.color-label { width: 50px; color: #aaa; font-size: 11px; }
.color-input {
  width: 28px; height: 22px; border: none; border-radius: 3px;
  cursor: pointer; background: transparent; padding: 0;
}
.color-input::-webkit-color-swatch-wrapper { padding: 0; }
.color-input::-webkit-color-swatch { border: 1px solid #333; border-radius: 3px; }
.color-hex { color: #666; font-size: 11px; font-family: monospace; }

/* ---- 按钮（吸底） ---- */
.btn-apply {
  width: 100%; padding: 8px 16px; border: none; border-radius: 6px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: all 0.2s; background: #009688; color: #fff;
  position: sticky; bottom: 0;
  margin-top: 8px; flex-shrink: 0;
}
.btn-apply:hover { background: #00796b; }
</style>
