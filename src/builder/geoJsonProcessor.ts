/**
 * GeoJSON → GLB 转换引擎
 *
 * 使用 Three.js 创建几何体形状，通过 @gltf-transform 直接构建 GLB 文档。
 * 完全绕过 GLTFExporter，确保压缩管线（@gltf-transform readBinary）兼容。
 */
import * as THREE from 'three'
import { Document, WebIO } from '@gltf-transform/core'
import {
  type GeoJSONRoot,
  type GeoJSONFeature,
  type GeoJSONFeatureCollection,
  type GeoJSONGeometry,
  type GeoJSONPolygon,
  type GeoJSONMultiPolygon,
  type GeoJSONLineString,
  type GeoJSONMultiLineString,
  type GeoJSONPoint,
  type GeoJSONMultiPoint,
  type GeoJsonConversionOptions,
  DEFAULT_CONVERSION_OPTIONS,
} from './geoJsonTypes'

// ---- 类型色板（动态生成） ----
function getTypeColors(opts: Required<GeoJsonConversionOptions>): Record<string, number> {
  return {
    Point: parseColor(opts.pointColor, 0xffc107),
    MultiPoint: parseColor(opts.pointColor, 0xffc107),
    LineString: parseColor(opts.lineColor, 0x2196f3),
    MultiLineString: parseColor(opts.lineColor, 0x2196f3),
    Polygon: parseColor(opts.polygonColor, 0x009688),
    MultiPolygon: parseColor(opts.polygonColor, 0x009688),
  }
}

// ---- 几何体条目（构建 GLB 的中间格式） ----
interface GeomEntry {
  positions: Float32Array
  normals: Float32Array | null
  indices: Uint32Array
  uv?: Float32Array
  colorHex: number
  roughness: number
  metalness: number
  doubleSided: boolean
  textureImage?: ArrayBuffer
  textureMimeType?: string
}

interface Bounds2D { minX: number; maxX: number; minZ: number; maxZ: number }
type Transformer = (c: [number, number, number?]) => [number, number, number]

// ========== 坐标计算 ==========

function extractCoords(geom: GeoJSONGeometry): Array<[number, number, number?]> {
  switch (geom.type) {
    case 'Point':           return [geom.coordinates as [number, number, number?]]
    case 'MultiPoint':      return geom.coordinates as Array<[number, number, number?]>
    case 'LineString':      return geom.coordinates as Array<[number, number, number?]>
    case 'MultiLineString': return geom.coordinates.flat() as Array<[number, number, number?]>
    case 'Polygon':         return geom.coordinates.flat() as Array<[number, number, number?]>
    case 'MultiPolygon':    return geom.coordinates.flat(2) as Array<[number, number, number?]>
  }
}

function computeBounds(features: GeoJSONFeature[]): Bounds2D {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (const f of features) {
    for (const [lng, lat] of extractCoords(f.geometry)) {
      if (lng < minX) minX = lng; if (lng > maxX) maxX = lng
      if (lat < minZ) minZ = lat; if (lat > maxZ) maxZ = lat
    }
  }
  if (maxX - minX < 0.0001) { maxX = minX + 0.0001 }
  if (maxZ - minZ < 0.0001) { maxZ = minZ + 0.0001 }
  return { minX, maxX, minZ, maxZ }
}

function createTransformer(bounds: Bounds2D, targetSize: number, heightScale: number): Transformer {
  const cx = (bounds.minX + bounds.maxX) / 2
  const cz = (bounds.minZ + bounds.maxZ) / 2
  const scale = targetSize / Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ)
  return (c) => [(c[0] - cx) * scale, (c[2] ?? 0) * scale * heightScale, (c[1] - cz) * scale]
}

// ========== 颜色工具 ==========

function parseColor(hex: string | undefined, fallback: number): number {
  if (!hex) return fallback
  const m = /^#?([0-9a-fA-F]{3,6})$/.exec(hex)
  if (!m) return fallback
  let c = m[1]
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]
  return parseInt(c, 16)
}

function hexToFactor(hex: number): [number, number, number] {
  return [(hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255]
}

// ========== 几何体提取 ==========

/** 从 BufferGeometry 中提取原始数组，同时销毁几何体 */
function extractAndDispose(geo: THREE.BufferGeometry): {
  pos: Float32Array; norm: Float32Array | null; idx: Uint32Array; uv?: Float32Array
} {
  const posAttr = geo.getAttribute('position')
  const normAttr = geo.getAttribute('normal')
  const idxAttr = geo.getIndex()

  const pos = new Float32Array(posAttr.array.buffer.slice(
    posAttr.array.byteOffset, posAttr.array.byteOffset + posAttr.array.byteLength))
  const norm = normAttr
    ? new Float32Array(normAttr.array.buffer.slice(
        normAttr.array.byteOffset, normAttr.array.byteOffset + normAttr.array.byteLength))
    : null

  let idx: Uint32Array
  if (idxAttr) {
    const src = idxAttr.array
    if (src instanceof Uint32Array) {
      idx = new Uint32Array(src.buffer.slice(src.byteOffset, src.byteOffset + src.byteLength))
    } else {
      // Uint16Array → 提升为 Uint32Array
      idx = new Uint32Array(src.length)
      for (let i = 0; i < src.length; i++) idx[i] = src[i]
    }
  } else {
    idx = new Uint32Array(posAttr.count)
    for (let i = 0; i < posAttr.count; i++) idx[i] = i
  }

  // 提取 UV（若存在）
  let uv: Float32Array | undefined
  const uvAttr = geo.getAttribute('uv')
  if (uvAttr) {
    uv = new Float32Array(uvAttr.array.buffer.slice(
      uvAttr.array.byteOffset, uvAttr.array.byteOffset + uvAttr.array.byteLength))
  }

  geo.dispose()
  return { pos, norm, idx, uv }
}

/** 合并多个 BufferGeometry 为一个 */
function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geos.length === 0) return null
  if (geos.length === 1) {
    const g = geos[0]
    if (!g.getAttribute('normal')) g.computeVertexNormals()
    return g
  }

  const allPos: number[] = [], allNorm: number[] = [], allIdx: number[] = [], allUV: number[] = []
  let vtxOffset = 0
  const hasUVs = geos.some(g => !!g.getAttribute('uv'))

  for (const geo of geos) {
    if (!geo.getAttribute('normal')) geo.computeVertexNormals()
    const pos = geo.getAttribute('position')
    const norm = geo.getAttribute('normal')
    const idx = geo.getIndex()
    const uv = geo.getAttribute('uv')

    for (let i = 0; i < pos.count; i++) {
      allPos.push(pos.getX(i), pos.getY(i), pos.getZ(i))
      allNorm.push(norm.getX(i), norm.getY(i), norm.getZ(i))
      if (hasUVs) {
        allUV.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0)
      }
    }

    if (idx) {
      for (let i = 0; i < idx.count; i++) allIdx.push(idx.getX(i) + vtxOffset)
    } else {
      for (let i = 0; i < pos.count; i++) allIdx.push(i + vtxOffset)
    }

    vtxOffset += pos.count
    geo.dispose()
  }

  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.Float32BufferAttribute(allPos, 3))
  out.setAttribute('normal', new THREE.Float32BufferAttribute(allNorm, 3))
  if (hasUVs) out.setAttribute('uv', new THREE.Float32BufferAttribute(allUV, 2))
  out.setIndex(allIdx)
  return out
}

// ========== GeoJSON 归一化 ==========

function normalizeFeatures(input: GeoJSONRoot): GeoJSONFeature[] {
  if (input.type === 'FeatureCollection') return (input as GeoJSONFeatureCollection).features
  if (input.type === 'Feature') return [input as GeoJSONFeature]
  throw new Error('不支持的 GeoJSON 类型: ' + (input as any).type)
}

// ========== 多边形环方向 ==========

function ringIsClockwise(ring: Array<[number, number, number?]>): boolean {
  let s = 0
  for (let i = 0; i < ring.length - 1; i++) {
    s += (ring[i + 1][0] - ring[i][0]) * (-ring[i + 1][2] - ring[i][2])
  }
  return s < 0
}

// ========== 几何体构建器 ==========

/** Polygon → ExtrudeGeometry（支持孔洞），同时返回 Shape 供纹理顶面复用 */
function buildPolygonGeom(
  rings: Array<Array<[number, number, number?]>>,
  depth: number,
  opts: Required<GeoJsonConversionOptions>,
): { extrusions: THREE.BufferGeometry[]; shapes: Array<{ outer: THREE.Shape; holes: THREE.Path[] }> } {
  const results: THREE.BufferGeometry[] = []
  const shapes: Array<{ outer: THREE.Shape; holes: THREE.Path[] }> = []

  for (const ring of rings) {
    if (ring.length < 3) continue
    const cw = ringIsClockwise(ring)
    if (cw && shapes.length > 0) {
      const hole = new THREE.Path()
      hole.moveTo(ring[0][0], ring[0][2])
      for (let i = 1; i < ring.length; i++) hole.lineTo(ring[i][0], ring[i][2])
      hole.closePath()
      shapes[shapes.length - 1].holes.push(hole)
    } else {
      const shape = new THREE.Shape()
      shape.moveTo(ring[0][0], ring[0][2])
      for (let i = 1; i < ring.length; i++) shape.lineTo(ring[i][0], ring[i][2])
      shape.closePath()
      shapes.push({ outer: shape, holes: [] })
    }
  }

  const hasBevel = opts.bevelThickness > 0 || opts.bevelSize > 0
  for (const { outer, holes } of shapes) {
    for (const h of holes) outer.holes.push(h)
    try {
      const geo = new THREE.ExtrudeGeometry(outer, {
        steps: 1, depth,
        bevelEnabled: depth > 0.1 && hasBevel,
        bevelThickness: opts.bevelThickness,
        bevelSize: opts.bevelSize,
        bevelSegments: depth > 0.1 ? opts.bevelSegments : 1,
      })
      geo.rotateX(-Math.PI / 2)
      results.push(geo)
    } catch { /* skip */ }
  }
  return { extrusions: results, shapes }
}

/** 根据多边形 Shape 构建带地理坐标 UV 的纹理顶面 */
function buildTexturedTopPlanes(
  shapes: Array<{ outer: THREE.Shape; holes: THREE.Path[] }>,
  depth: number,
  bounds: Bounds2D,
  targetSize: number,
  heightScale: number,
  textureOffset: number,
): THREE.BufferGeometry[] {
  const results: THREE.BufferGeometry[] = []

  // 计算 UV 参考范围（与主 transformer 一致）
  const cx = (bounds.minX + bounds.maxX) / 2
  const cz = (bounds.minZ + bounds.maxZ) / 2
  const scale = targetSize / Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ)
  const minX = (bounds.minX - cx) * scale
  const maxX = (bounds.maxX - cx) * scale
  const minY = (bounds.minZ - cz) * scale
  const maxY = (bounds.maxZ - cz) * scale
  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1

  for (const { outer } of shapes) {
    // 直接复用挤出体使用的 Shape 对象（已含孔洞）
    const shapeGeo = new THREE.ShapeGeometry(outer)
    if (shapeGeo.getAttribute('position').count === 0) {
      shapeGeo.dispose()
      continue
    }
    // 替换 UV：按地理坐标映射
    const posAttr = shapeGeo.getAttribute('position')
    const uvArray = new Float32Array(posAttr.count * 2)
    for (let i = 0; i < posAttr.count; i++) {
      const sx = posAttr.getX(i)
      const sy = posAttr.getY(i)
      uvArray[i * 2]     = (sx - minX) / rangeX
      uvArray[i * 2 + 1] = 1 - (sy - minY) / rangeY  // V 翻转：图像原点在左上
    }
    shapeGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvArray, 2))
    // 纹理顶面放在挤出体顶部上方，避免 z-fighting
    shapeGeo.translate(0, 0, depth + textureOffset)
    shapeGeo.rotateX(-Math.PI / 2)
    results.push(shapeGeo)
  }

  return results
}

/** LineString → TubeGeometry */
function buildLineGeom(
  lines: Array<Array<[number, number, number?]>>,
  radius: number,
  opts: Required<GeoJsonConversionOptions>,
): THREE.BufferGeometry[] {
  const results: THREE.BufferGeometry[] = []
  const maxSeg = 128
  for (const line of lines) {
    if (line.length < 2) continue
    const pts = line.map((c) => new THREE.Vector3(c[0], c[1] + radius, c[2]))
    results.push(new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(pts),
      Math.min(line.length * opts.tubePathSegments, maxSeg),
      radius,
      opts.tubeRadialSegments,
      false))
  }
  return results
}

/** 为多边形环生成顶部轮廓管线 */
function buildOutlineForRings(
  rings: Array<Array<[number, number, number?]>>,
  height: number,
  opts: Required<GeoJsonConversionOptions>,
): THREE.BufferGeometry[] {
  const results: THREE.BufferGeometry[] = []
  const outlineRadius = opts.tubeRadius * 0.7
  const maxSeg = 128

  for (const ring of rings) {
    if (ring.length < 2) continue
    // 复制环到挤出体顶部高度；Z 取反以匹配 rotateX(-π/2) 后的 world Z
    const topRing: Array<[number, number, number?]> = ring.map(
      (c) => [c[0], height, -c[2]],
    )
    // 闭合环（首尾相连）
    const first = topRing[0]
    const last = topRing[topRing.length - 1]
    const isClosed =
      Math.abs(first[0] - last[0]) < 1e-8 &&
      Math.abs((first[2] ?? 0) - (last[2] ?? 0)) < 1e-8
    if (!isClosed) {
      topRing.push([first[0], first[1], first[2]])
    }

    const pts = topRing.map(
      (c) => new THREE.Vector3(c[0], c[1] + outlineRadius, c[2]),
    )
    const segments = Math.min(
      topRing.length * opts.tubePathSegments,
      maxSeg,
    )
    results.push(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(pts, true),
        segments,
        outlineRadius,
        Math.max(opts.tubeRadialSegments, 4),
        true, // closed 闭合管线
      ),
    )
  }

  return results
}

/** Point → 定位针标记 */
function buildPointGeom(
  coords: Array<[number, number, number?]>,
  radius: number,
): THREE.BufferGeometry[] {
  const results: THREE.BufferGeometry[] = []
  const pinGeo = new THREE.CylinderGeometry(radius * 0.5, radius * 0.8, radius * 5, 8)
  const ballGeo = new THREE.SphereGeometry(radius, 8, 6)

  for (const coord of coords) {
    const p = pinGeo.clone()
    p.translate(coord[0], coord[1], coord[2])
    results.push(p)

    const b = ballGeo.clone()
    b.translate(coord[0], coord[1] + radius * 5, coord[2])
    results.push(b)
  }

  pinGeo.dispose()
  ballGeo.dispose()
  return results
}

// ========== 主入口 ==========

export async function geojsonToGlb(
  geojson: object,
  opts?: GeoJsonConversionOptions,
): Promise<ArrayBuffer> {
  const options = { ...DEFAULT_CONVERSION_OPTIONS, ...opts } as Required<GeoJsonConversionOptions>
  const features = normalizeFeatures(geojson as GeoJSONRoot)

  if (features.length === 0) {
    throw new Error('GeoJSON 不包含任何要素 (features)')
  }

  const typeColors = getTypeColors(options)
  const bounds = computeBounds(features)
  const tx = createTransformer(bounds, options.targetSize, options.heightScale)

  const entries: GeomEntry[] = []
  const topPlaneGeos: THREE.BufferGeometry[] = []
  const hasTexture = !!(options.textureImage && options.textureMimeType)

  // ---- 遍历要素，生成几何体 ----
  for (const feature of features) {
    const type = feature.geometry?.type
    if (!type) continue

    const fallback = typeColors[type] ?? 0x888888
    const colorHex = parseColor(
      feature.properties?.['color'] ?? feature.properties?.['fill'], fallback)
    const height = Math.max(
      Number(feature.properties?.[options.heightProperty]) || options.defaultHeight, 0.01
    ) * options.heightScale

    const geos: THREE.BufferGeometry[] = []

    switch (type) {
      case 'Point':
        geos.push(...buildPointGeom(
          [(feature.geometry as GeoJSONPoint).coordinates].map(c => tx(c) as [number, number, number?]),
          options.pointRadius))
        break
      case 'MultiPoint':
        geos.push(...buildPointGeom(
          (feature.geometry as GeoJSONMultiPoint).coordinates.map(c => tx(c) as [number, number, number?]),
          options.pointRadius))
        break
      case 'LineString':
        geos.push(...buildLineGeom(
          [(feature.geometry as GeoJSONLineString).coordinates.map(c => tx(c) as [number, number, number?])],
          options.tubeRadius, options))
        break
      case 'MultiLineString': {
        const lines = (feature.geometry as GeoJSONMultiLineString).coordinates
          .map(ring => ring.map(c => tx(c) as [number, number, number?]))
        geos.push(...buildLineGeom(lines, options.tubeRadius, options))
        break
      }
      case 'Polygon': {
        const rings = (feature.geometry as GeoJSONPolygon).coordinates
          .map(ring => ring.map(c => tx(c) as [number, number, number?]))
        const { extrusions, shapes } = buildPolygonGeom(rings, height, options)
        geos.push(...extrusions)
        if (options.showOutlines) {
          geos.push(...buildOutlineForRings(rings, height, options))
        }
        if (hasTexture) {
          topPlaneGeos.push(...buildTexturedTopPlanes(shapes, height, bounds,
            options.targetSize, options.heightScale, options.textureOffset))
        }
        break
      }
      case 'MultiPolygon':
        for (const poly of (feature.geometry as GeoJSONMultiPolygon).coordinates) {
          const rings = poly.map(ring => ring.map(c => tx(c) as [number, number, number?]))
          const { extrusions, shapes } = buildPolygonGeom(rings, height, options)
          geos.push(...extrusions)
          if (options.showOutlines) {
            geos.push(...buildOutlineForRings(rings, height, options))
          }
          if (hasTexture) {
            topPlaneGeos.push(...buildTexturedTopPlanes(shapes, height, bounds,
              options.targetSize, options.heightScale, options.textureOffset))
          }
        }
        break
    }

    const merged = mergeGeometries(geos)
    if (merged) {
      const { pos, norm, idx } = extractAndDispose(merged)
      entries.push({
        positions: pos, normals: norm, indices: idx,
        colorHex,
        roughness: options.roughness,
        metalness: options.metalness,
        doubleSided: true,
      })
    }
  }

  // 合并所有纹理顶面为一个 Entry
  if (hasTexture && topPlaneGeos.length > 0) {
    const topMerged = mergeGeometries(topPlaneGeos)
    if (topMerged) {
      const { pos, norm, idx, uv } = extractAndDispose(topMerged)
      entries.push({
        positions: pos, normals: norm, indices: idx, uv,
        colorHex: 0xffffff,
        roughness: options.roughness,
        metalness: 0.0,
        doubleSided: true,
        textureImage: options.textureImage,
        textureMimeType: options.textureMimeType,
      })
    }
  } else if (hasTexture) {
    console.warn('[贴图] hasTexture=true 但 topPlaneGeos 为空！shapes 可能未生成')
  }

  // ---- 用 @gltf-transform 构建 GLB ----
  const doc = new Document()
  const buf = doc.createBuffer('main')
  const scene = doc.createScene('GeoJSON')

  // 共享纹理（所有顶面共用同一张图）
  let sharedTexture: ReturnType<typeof doc.createTexture> | null = null

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    const [r, g, b] = hexToFactor(e.colorHex)

    const posAcc = doc.createAccessor()
      .setArray(e.positions).setType('VEC3').setBuffer(buf)

    const normAcc = doc.createAccessor()
      .setArray(e.normals ?? e.positions).setType('VEC3').setBuffer(buf)

    const idxAcc = doc.createAccessor()
      .setArray(e.indices).setType('SCALAR').setBuffer(buf)

    const prim = doc.createPrimitive()
      .setAttribute('POSITION', posAcc)
      .setAttribute('NORMAL', normAcc)
      .setIndices(idxAcc)

    const mat = doc.createMaterial()
      .setDoubleSided(e.doubleSided)
      .setRoughnessFactor(e.roughness)
      .setMetallicFactor(e.metalness)

    if (e.textureImage && e.textureMimeType) {
      // 纹理材质
      if (!sharedTexture) {
        sharedTexture = doc.createTexture('mapTexture')
          .setImage(new Uint8Array(e.textureImage))
          .setMimeType(e.textureMimeType)
      }
      mat.setBaseColorTexture(sharedTexture)
        .setBaseColorFactor([1, 1, 1, 1])

      if (e.uv) {
        const uvAcc = doc.createAccessor()
          .setArray(e.uv).setType('VEC2').setBuffer(buf)
        prim.setAttribute('TEXCOORD_0', uvAcc)
      }
    } else {
      // 纯色材质
      mat.setBaseColorFactor([r, g, b, 1.0])
    }

    prim.setMaterial(mat)
    const mesh = doc.createMesh().addPrimitive(prim)
    const node = doc.createNode().setMesh(mesh)
    scene.addChild(node)
  }

  // 写为二进制
  const io = new WebIO({ credentials: 'include' })
  const glb = await io.writeBinary(doc)
  return glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength)
}
