# 3D Presenter

> 任何一个三维模型，一键生成无需服务器、无需安装、无需部署、双击即可打开的高质量 HTML 演示文件。

---

## 在线使用

🌐 **浏览器直接打开，无需下载安装：**

👉 **[mncstudio.github.io/3d-presentation-platform](https://mncstudio.github.io/3d-presentation-platform/)**

---

## 这是什么

3D Presenter 是一个 **3D 演示生成器**，不是格式转换工具。

拖入一个 GLB 模型 → 自动场景搭建 → 导出单个 HTML 文件 → 发给客户，双击打开。

**5 秒钟，一个可以交付的成品。**

---

## 功能

### 已实现
- 🖱️ **拖拽上传** GLB 模型，自动加载预览
- 🎮 **OrbitControls** — 旋转、缩放、平移
- 💡 **自动灯光** — 三点光源系统，自动阴影
- 📐 **自动居中** — 模型自适应相机位置
- 🎬 **自动动画** — 检测并播放骨骼动画
- 📦 **模型压缩** — 减面、纹理缩放、顶点量化
- 🔍 **实时对比** — 原始 vs 压缩版本切换预览
- 📄 **导出单文件 HTML** — 所有资源 Base64 内嵌，零依赖
- 🧩 **Draco 支持** — 自动解码 Draco 压缩的 GLB
- 🗺️ **GeoJSON → 3D** — 矢量地理数据一键生成挤出体 3D 模型
- 🖼️ **纹理贴图** — 上传 PNG/JPEG 按地理坐标映射到多边形顶面
- 🎛️ **实时参数调节** — 高度、颜色、倒角、材质全部可调

### 规划中
- 5 套视觉模板切换（已预制：深色/白色/产品/工业/科技蓝）
- HDR 环境贴图
- 自定义 Logo / 水印
- 自动截图 / 缩略图生成

---

## 使用

```
1. 打开网页
2. 拖入 .glb 文件（或点击选择）
3. （可选）调整压缩参数
4. 点击「生成 HTML」→ 自动下载
5. 双击生成的 HTML 即可在浏览器中查看
```

导出选项：

| 选项 | 说明 |
|------|------|
| 自动旋转 | 模型缓慢自转 |
| 自动播放动画 | 播放骨骼/变形动画 |
| 自动居中 | 自适应相机取景 |
| OrbitControls | 鼠标交互控制 |

压缩选项：

| 选项 | 说明 |
|------|------|
| 减面比例 | 10%~100%，减少三角形数量 |
| 纹理尺寸 | 限制贴图最大分辨率 |
| 顶点焊接 | 合并重复顶点 |
| 资源去重 | 移除重复纹理/资源 |
| 顶点量化 | 降低顶点精度减小体积 |

---

## 开发

### 环境要求
- Node.js >= 18
- npm >= 9

### 快速开始

```bash
git clone https://github.com/MncStudio/3d-presentation-platform.git
cd 3d-presentation-platform
npm install
npm run dev
```

### 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Vue 3 + TypeScript |
| 3D 引擎 | Three.js |
| 模型处理 | @gltf-transform |
| 构建工具 | Vite |
| 部署 | GitHub Pages |

### 项目结构

```
├── src/
│   ├── pages/          # 页面
│   │   ├── HomePage.vue       # GLB 模型预览 & 压缩
│   │   └── GeojsonPage.vue    # GeoJSON → 3D 转换
│   ├── components/     # Vue 组件
│   │   ├── PreviewPanel.vue   # 3D 预览渲染器
│   │   ├── DropZone.vue       # 拖拽上传组件
│   │   ├── GeojsonSettings.vue # GeoJSON 参数调节面板
│   │   └── CompressSettings.vue # 压缩参数面板
│   ├── builder/        # 构建引擎（核心）
│   │   ├── htmlBuilder.ts       # HTML 生成
│   │   ├── glbProcessor.ts      # 模型压缩
│   │   ├── glbReader.ts         # GLB 解析
│   │   ├── assetEncoder.ts      # Base64 编码
│   │   ├── geoJsonProcessor.ts  # GeoJSON → GLB 转换引擎
│   │   └── geoJsonTypes.ts      # GeoJSON 类型 & 配置定义
│   └── template/       # HTML 模板
├── .github/workflows/  # CI/CD 自动部署
├── vite.config.ts
└── package.json
```

---

## 许可

MIT License
