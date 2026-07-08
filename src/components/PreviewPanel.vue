<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'

const props = defineProps<{
  glbData: ArrayBuffer
  fileName: string
}>()

const containerRef = ref<HTMLDivElement>()

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let animationId = 0
let mixer: THREE.AnimationMixer | null = null
let clock: THREE.Clock | null = null

// 共享 DRACOLoader（解码 Draco 压缩的 GLB）
let dracoLoader: DRACOLoader | null = null

function getDracoLoader(): DRACOLoader {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
  }
  return dracoLoader
}

onMounted(() => {
  initScene()
  loadModel(props.glbData)
})

onUnmounted(() => {
  dispose()
})

watch(() => props.glbData, (newData) => {
  // 清理旧模型
  if (scene) {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        ;(child as THREE.Mesh).geometry?.dispose()
        const material = (child as THREE.Mesh).material
        if (Array.isArray(material)) {
          material.forEach(m => disposeMaterial(m))
        } else {
          disposeMaterial(material as THREE.Material)
        }
      }
    })
    // 移除所有非基础对象
    const toRemove: THREE.Object3D[] = []
    scene.traverse((child) => {
      if (child !== scene && child.type !== 'AmbientLight' &&
          child.type !== 'DirectionalLight' && child.type !== 'GridHelper') {
        toRemove.push(child)
      }
    })
    toRemove.forEach(obj => scene!.remove(obj))
  }
  if (mixer) mixer.stopAllAction()
  loadModel(newData)
})

function disposeMaterial(material: THREE.Material) {
  if ('map' in material && material.map) material.map.dispose()
  if ('normalMap' in material && material.normalMap) material.normalMap.dispose()
  if ('roughnessMap' in material && material.roughnessMap) material.roughnessMap.dispose()
  if ('metalnessMap' in material && material.metalnessMap) material.metalnessMap.dispose()
  if ('aoMap' in material && material.aoMap) material.aoMap.dispose()
  if ('emissiveMap' in material && material.emissiveMap) material.emissiveMap.dispose()
  material.dispose()
}

function initScene() {
  if (!containerRef.value) return

  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight

  // 渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  containerRef.value.appendChild(renderer.domElement)

  // 场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#1a1a2e')

  // 相机
  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
  camera.position.set(5, 3, 5)
  camera.lookAt(0, 0, 0)

  // OrbitControls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minDistance = 1
  controls.maxDistance = 20
  controls.target.set(0, 0, 0)

  // 灯光
  const ambientLight = new THREE.AmbientLight('#ffffff', 0.6)
  scene.add(ambientLight)

  const keyLight = new THREE.DirectionalLight('#ffffff', 1.5)
  keyLight.position.set(5, 10, 5)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.width = 1024
  keyLight.shadow.mapSize.height = 1024
  keyLight.shadow.camera.near = 0.5
  keyLight.shadow.camera.far = 50
  keyLight.shadow.bias = -0.0001
  scene.add(keyLight)

  const fillLight = new THREE.DirectionalLight('#8899cc', 0.4)
  fillLight.position.set(-3, 2, -3)
  scene.add(fillLight)

  const rimLight = new THREE.DirectionalLight('#ffffff', 0.8)
  rimLight.position.set(0, 0, 5)
  scene.add(rimLight)

  // 地面参考网格
  const gridHelper = new THREE.GridHelper(10, 10, '#333355', '#222244')
  scene.add(gridHelper)

  // 动画循环
  clock = new THREE.Clock()
  animate()
}

function animate() {
  animationId = requestAnimationFrame(animate)

  const delta = clock?.getDelta() ?? 0.016
  if (mixer) mixer.update(delta)
  controls?.update()
  renderer?.render(scene!, camera!)
}

function loadModel(data: ArrayBuffer) {
  if (!scene) return

  const loader = new GLTFLoader()
  loader.setDRACOLoader(getDracoLoader())
  loader.parse(data, '', (gltf) => {
    const model = gltf.scene

    // 对有纹理的材质应用 polygonOffset，确保纹理顶面渲染在挤出体上方
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
        if (mat.map) {
          mat.polygonOffset = true
          mat.polygonOffsetFactor = -1
          mat.polygonOffsetUnits = -1
          mat.needsUpdate = true
        }
      }
    })

    // 自动居中
    const box = new THREE.Box3().setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)

    model.position.set(-center.x, -center.y + maxDim * 0.5, -center.z)

    // 调整相机距离
    const fitDistance = maxDim / Math.tan((camera!.fov * 0.5) * Math.PI / 180)
    camera?.position.set(fitDistance * 0.8, fitDistance * 0.5, fitDistance * 0.8)
    camera?.lookAt(0, maxDim * 0.2, 0)
    controls?.target.set(0, maxDim * 0.2, 0)
    controls?.update()

    // 播放动画
    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model)
      gltf.animations.forEach((clip) => {
        mixer!.clipAction(clip).play()
      })
    }

    scene.add(model)
  }, undefined, (error) => {
    console.error('GLB 加载失败:', error)
  })
}

function dispose() {
  cancelAnimationFrame(animationId)
  mixer?.stopAllAction()
  if (renderer) {
    renderer.dispose()
    renderer.domElement.remove()
  }
  controls?.dispose()
}

// 响应式调整
function onResize() {
  if (!containerRef.value || !renderer || !camera) return
  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight
  renderer.setSize(width, height)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

onMounted(() => {
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div ref="containerRef" class="preview-container">
    <div class="model-label">{{ fileName }}</div>
  </div>
</template>

<style scoped>
.preview-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.model-label {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: #888;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 11px;
  pointer-events: none;
}
</style>
