/**
 * GLB 模型处理引擎
 * 提供模型分析、减面、Draco 压缩、纹理缩放等功能
 * 纯前端实现，基于 @gltf-transform + WebIO
 */

import { WebIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import {
  simplify,
  weld,
  dedup,
  prune,
  textureCompress,
  quantize,
  TextureResizeFilter,
} from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'

// ========== 类型定义 ==========

export interface GlbStats {
  /** 原始文件大小 (bytes) */
  fileSize: number
  /** 格式化文件大小 */
  fileSizeFormatted: string
  /** 三角形面数 */
  triangleCount: number
  /** 顶点数 */
  vertexCount: number
  /** 网格数量 */
  meshCount: number
  /** 材质数量 */
  materialCount: number
  /** 纹理数量 */
  textureCount: number
  /** 动画数量 */
  animationCount: number
}

export interface CompressOptions {
  /** 减面：保留面数比例 (0.1~1.0)，1.0=不减面 */
  simplifyRatio: number
  /** 减面误差容限 */
  simplifyError: number
  /** 是否执行顶点焊接 */
  weld: boolean
  /** 纹理最大尺寸（像素），0=不缩放 */
  textureMaxSize: number
  /** 是否量化顶点数据 */
  quantize: boolean
  /** 是否去重 */
  dedup: boolean
}

export interface CompressResult {
  /** 处理后的 GLB 数据 */
  data: ArrayBuffer
  /** 压缩后文件大小 */
  compressedSize: number
  /** 压缩后格式化大小 */
  compressedSizeFormatted: string
  /** 压缩率（百分比） */
  compressionRatio: number
  /** 压缩后三角形面数 */
  compressedTriangles: number
  /** 原始统计 */
  originalStats: GlbStats
  /** 压缩后统计 */
  compressedStats: GlbStats
}

// ========== 默认压缩选项 ==========

export const DEFAULT_COMPRESS_OPTIONS: CompressOptions = {
  simplifyRatio: 0.5,
  simplifyError: 0.001,
  weld: true,
  textureMaxSize: 1024,
  quantize: true,
  dedup: true,
}

// ========== WebIO 实例（懒初始化） ==========

let ioInstance: WebIO | null = null

async function getIO(): Promise<WebIO> {
  if (ioInstance) return ioInstance

  const io = new WebIO({ credentials: 'include' }).registerExtensions(ALL_EXTENSIONS)

  // 注册 meshoptimizer 依赖（减面需要）
  await io.registerDependencies({
    'meshopt.simplifier': MeshoptSimplifier,
  })

  ioInstance = io
  return io
}

// ========== 模型分析 ==========

/**
 * 分析 GLB 数据，提取统计信息
 */
export async function analyzeGlb(data: ArrayBuffer): Promise<GlbStats> {
  const io = await getIO()
  const doc = await io.readBinary(data)

  const root = doc.getRoot()
  const meshes = root.listMeshes()
  const materials = root.listMaterials()
  const textures = root.listTextures()
  const animations = root.listAnimations()

  let triangleCount = 0
  let vertexCount = 0

  for (const mesh of meshes) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices()
      const position = prim.getAttribute('POSITION')

      if (position) {
        vertexCount += position.getCount()
      }

      if (indices) {
        triangleCount += indices.getCount() / 3
      } else if (position) {
        triangleCount += position.getCount() / 3
      }
    }
  }

  return {
    fileSize: data.byteLength,
    fileSizeFormatted: formatFileSize(data.byteLength),
    triangleCount: Math.floor(triangleCount),
    vertexCount,
    meshCount: meshes.length,
    materialCount: materials.length,
    textureCount: textures.length,
    animationCount: animations.length,
  }
}

// ========== 模型压缩 ==========

/**
 * 对 GLB 数据进行压缩处理
 * 处理管线：weld → dedup → simplify → quantize → textureResize → prune
 */
export async function compressGlb(
  data: ArrayBuffer,
  options: Partial<CompressOptions> = {},
): Promise<CompressResult> {
  const opts = { ...DEFAULT_COMPRESS_OPTIONS, ...options }
  const originalStats = await analyzeGlb(data)

  const io = await getIO()
  const doc = await io.readBinary(data)

  // 构建处理管线
  const transforms: Promise<any>[] = []

  // 1. 焊接重复顶点（减面前置步骤）
  if (opts.weld) {
    transforms.push(doc.transform(weld()))
  }

  // 2. 去重（移除重复资源）
  if (opts.dedup) {
    transforms.push(doc.transform(dedup()))
  }

  // 3. 减面
  if (opts.simplifyRatio < 1.0) {
    transforms.push(
      doc.transform(
        simplify({
          ratio: opts.simplifyRatio,
          error: opts.simplifyError,
        }),
      ),
    )
  }

  // 4. 量化顶点数据
  if (opts.quantize) {
    transforms.push(doc.transform(quantize()))
  }

  // 5. 纹理缩放（浏览器端仅支持 resize，不支持格式转换）
  if (opts.textureMaxSize > 0) {
    transforms.push(
      doc.transform(
        textureCompress({
          resize: [opts.textureMaxSize, opts.textureMaxSize],
          resizeFilter: TextureResizeFilter.LANCZOS3,
        }),
      ),
    )
  }

  // 6. 清理未使用资源
  transforms.push(doc.transform(prune()))

  // 等待所有变换完成
  await Promise.all(transforms)

  // 写回二进制
  const compressedGlb = await io.writeBinary(doc)

  // 分析压缩后模型
  const compressedStats = await analyzeGlb(compressedGlb.buffer.slice(
    compressedGlb.byteOffset,
    compressedGlb.byteOffset + compressedGlb.byteLength,
  ))

  const compressedSize = compressedGlb.byteLength

  return {
    data: compressedGlb.buffer.slice(
      compressedGlb.byteOffset,
      compressedGlb.byteOffset + compressedGlb.byteLength,
    ),
    compressedSize,
    compressedSizeFormatted: formatFileSize(compressedSize),
    compressionRatio: Math.round((1 - compressedSize / originalStats.fileSize) * 100),
    compressedTriangles: compressedStats.triangleCount,
    originalStats,
    compressedStats,
  }
}

// ========== 工具函数 ==========

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
