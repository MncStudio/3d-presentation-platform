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

## 下载

### macOS (Apple Silicon)

| 版本 | 类型 | 下载 |
|------|------|------|
| v0.1.0 | 便携版 | [3D-Presenter-macOS-arm64.zip](https://github.com/MncStudio/3d-presentation-platform/releases/download/v0.1.0/3D-Presenter-macOS-arm64.zip) |

> 下载后解压，将 `3D Presenter.app` 拖入 Applications 文件夹即可。首次打开若提示"无法验证开发者"，前往 **系统设置 → 隐私与安全性 → 仍要打开**。

### Windows (ARM64)

| 版本 | 类型 | 下载 |
|------|------|------|
| v0.1.0 | 安装包 | [3D Presenter Setup 0.1.0.exe](https://github.com/MncStudio/3d-presentation-platform/releases/download/v0.1.0/3D.Presenter.Setup.0.1.0.exe) |
| v0.1.0 | 便携版 | [3D-Presenter-win-arm64.zip](https://github.com/MncStudio/3d-presentation-platform/releases/download/v0.1.0/3D.Presenter-0.1.0-arm64-win.zip) |

> **安装包**：双击安装，自动创建桌面快捷方式。**便携版**：解压即用，无需安装。
>
> ⚠️ 当前仅构建了 ARM64 架构。x64 版本即将支持。

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

### 规划中
- 5 套视觉模板切换（已预制：深色/白色/产品/工业/科技蓝）
- HDR 环境贴图
- 自定义 Logo / 水印
- 自动截图 / 缩略图生成
- Windows / Linux 桌面端

---

## 使用

```
1. 打开 3D Presenter
2. 拖入 .glb 文件（或点击选择）
3. （可选）在右侧面板调整压缩参数
4. 点击「生成 HTML」
5. 选择保存位置 → 完成
6. 双击生成的 HTML 即可在浏览器中查看
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
# 克隆项目
git clone https://github.com/MncStudio/3d-presentation-platform.git
cd 3d-presentation-platform

# 安装依赖
npm install

# 启动开发模式
npm run dev

# 构建生产版本
npm run build

# 打包 macOS 应用
npm run dist:mac
```

### 技术栈

| 层 | 技术 |
|----|------|
| 桌面框架 | Electron |
| 前端 | Vue 3 + TypeScript |
| 3D 引擎 | Three.js |
| 模型处理 | @gltf-transform |
| 构建工具 | electron-vite + Vite |
| 打包 | electron-builder |

### 项目结构

```
├── electron/           # Electron 主进程
│   ├── main/index.ts   # 窗口管理 + IPC
│   └── preload/index.ts
├── src/
│   ├── pages/          # 页面
│   ├── components/     # Vue 组件
│   ├── builder/        # 构建引擎（核心）
│   │   ├── htmlBuilder.ts   # HTML 生成
│   │   ├── glbProcessor.ts  # 模型压缩
│   │   ├── glbReader.ts     # GLB 解析
│   │   └── assetEncoder.ts  # Base64 编码
│   └── template/       # HTML 模板
├── electron.vite.config.ts
└── package.json
```

---

## 许可

MIT License
