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

    <!-- 有模型时：预览 -->
    <div v-else class="preview-section">
      <PreviewPanel :glb-data="glbData" :file-name="glbFileName" />
    </div>

    <!-- 底部操作栏 -->
    <footer v-if="glbData" class="action-bar">
      <span class="file-info">{{ outputGlbName }}</span>
      <div class="actions">
        <button class="btn btn-clear" @click="handleClear">清除</button>
        <button class="btn btn-download" @click="handleDownloadGlb">下载 GLB</button>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import DropZone from "../components/DropZone.vue";
import PreviewPanel from "../components/PreviewPanel.vue";
import { geojsonToGlb } from "../builder/geoJsonProcessor";

const glbData = ref<ArrayBuffer | null>(null);
const glbFileName = ref<string>("");
const outputGlbName = ref<string>("");

const isLoading = ref(false);
const loadingMessage = ref("");
const loadError = ref<string | null>(null);

async function handleFileSelected(file: File) {
  glbFileName.value = file.name;
  outputGlbName.value = file.name.replace(/\.(geojson|json)$/i, "") + ".glb";
  isLoading.value = true;
  loadError.value = null;

  try {
    loadingMessage.value = "正在解析 GeoJSON...";
    const text = await readFileAsText(file);
    let geojson: object;
    try {
      geojson = JSON.parse(text);
    } catch {
      throw new Error("JSON 解析失败，请确认文件为有效的 GeoJSON 格式");
    }
    loadingMessage.value = "正在生成 3D 模型...";
    const glbBuffer = await geojsonToGlb(geojson);
    glbData.value = glbBuffer;
  } catch (e: any) {
    loadError.value = e.message || "文件加载失败";
    glbData.value = null;
  } finally {
    isLoading.value = false;
  }
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsText(file);
  });
}

function handleDownloadGlb() {
  if (!glbData.value) return;
  const blob = new Blob([glbData.value], { type: "model/gltf-binary" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = outputGlbName.value;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function handleClear() {
  glbData.value = null;
  glbFileName.value = "";
  outputGlbName.value = "";
  loadError.value = null;
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

.preview-section {
  flex: 1;
  width: 100%;
  min-height: 0;
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
