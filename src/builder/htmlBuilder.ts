/**
 * HTML 构建器（核心引擎）
 * 负责将 GLB 数据和用户配置注入到 Viewer 模板中，生成最终的独立 HTML 文件
 */

import { encodeToBase64 } from './assetEncoder'

export interface BuildOptions {
  glbData: ArrayBuffer
  autoRotate: boolean
  autoPlay: boolean
  autoCenter: boolean
  orbitControl: boolean
}

/**
 * 生成完整的独立 HTML 文件内容
 */
export async function buildHtml(options: BuildOptions): Promise<string> {
  const { glbData, autoRotate, autoPlay, autoCenter, orbitControl } = options
  const glbBase64 = encodeToBase64(glbData)

  return generateTemplate({
    glbBase64,
    autoRotate,
    autoPlay,
    autoCenter,
    orbitControl,
  })
}

/**
 * 生成内嵌的 Three.js Viewer HTML
 * 使用 importmap 从 CDN 加载 Three.js，GLB 数据以 Base64 内嵌
 */
function generateTemplate(config: {
  glbBase64: string
  autoRotate: boolean
  autoPlay: boolean
  autoCenter: boolean
  orbitControl: boolean
}): string {
  const { glbBase64, autoRotate, autoPlay, autoCenter, orbitControl } = config

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>3D Viewer</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#1a1a2e;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
#info{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,0.4);font-size:11px;pointer-events:none}
</style>
</head>
<body>
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.170.0/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.170.0/examples/jsm/"
  }
}
</script>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// ====== Draco 解码器 ======
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

// ====== 场景初始化 ======
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#1a1a2e');

const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(5, 3, 5);

// ====== OrbitControls ======
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1;
controls.maxDistance = 20;
controls.autoRotate = ${autoRotate};
controls.autoRotateSpeed = 1.5;
controls.target.set(0, 0, 0);
controls.update();

// ====== 灯光系统 ======
scene.add(new THREE.AmbientLight('#ffffff', 0.6));

const keyLight = new THREE.DirectionalLight('#ffffff', 1.5);
keyLight.position.set(5, 10, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 1024;
keyLight.shadow.mapSize.height = 1024;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 50;
scene.add(keyLight);

scene.add(new THREE.DirectionalLight('#8899cc', 0.4)).position.set(-3, 2, -3);
scene.add(new THREE.DirectionalLight('#ffffff', 0.8)).position.set(0, 0, 5);

// ====== 地面网格（可删除） ======
// scene.add(new THREE.GridHelper(10, 10, '#333355', '#222244'));

// ====== 加载 GLB 模型 ======
const glbBase64 = "${glbBase64}";
const glbBinary = Uint8Array.from(atob(glbBase64), c => c.charCodeAt(0));
const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);
let mixer = null;

loader.parse(glbBinary.buffer, '', (gltf) => {
  const model = gltf.scene;
  scene.add(model);

  // 自动居中
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  model.position.set(-center.x, -center.y + maxDim * 0.5, -center.z);

  // 调整相机
  const fitDistance = maxDim / Math.tan((camera.fov * 0.5) * Math.PI / 180);
  camera.position.set(fitDistance * 0.8, fitDistance * 0.5, fitDistance * 0.8);
  camera.lookAt(0, maxDim * 0.2, 0);
  controls.target.set(0, maxDim * 0.2, 0);
  controls.update();

  // 播放动画
  ${autoPlay ? `
  if (gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(model);
    gltf.animations.forEach(clip => mixer.clipAction(clip).play());
  }
  ` : ''}
});

// ====== 渲染循环 ======
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// ====== 响应式 ======
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ====== 键盘快捷键 ======
window.addEventListener('keydown', (e) => {
  switch(e.key.toLowerCase()) {
    case 'f': controls.reset().target.set(0,0,0); camera.position.set(5,3,5); break;
    case 'r': controls.autoRotate = !controls.autoRotate; break;
    case 'g': renderer.shadowMap.enabled = !renderer.shadowMap.enabled; break;
    case '0': controls.reset(); break;
  }
});
</script>
<div id="info">拖拽旋转 | 滚轮缩放 | 右键平移 | F 复位 | R 旋转</div>
</body>
</html>`
}
