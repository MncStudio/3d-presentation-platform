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

// ---- 类型色板 ----
const TYPE_COLORS: Record<string, number> = {
  Point: 0xffc107,         MultiPoint: 0xffc107,
  LineString: 0x2196f3,    MultiLineString: 0x2196f3,
  Polygon: 0x009688,       MultiPolygon: 0x009688,
}

// ---- 几何体条目（构建 GLB 的中间格式） ----
interface GeomEntry {
  positions: Float32Array
  normals: Float32Array | null
  indices: Uint32Array
  colorHex: number
  roughness: number
  metalness: number
  doubleSided: boolean
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

function createTransformer(bounds: Bounds2D, targetSize: number): Transformer {
  const cx = (bounds.minX + bounds.maxX) / 2
  const cz = (bounds.minZ + bounds.maxZ) / 2
  const scale = targetSize / Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ)
  return (c) => [(c[0] - cx) * scale, (c[2] ?? 0) * scale, (c[1] - cz) * scale]
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
function extractAndDispose(geo: THREE.BufferGeometry): { pos: Float32Array; norm: Float32Array | null; idx: Uint32Array } {
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

  geo.dispose()
  return { pos, norm, idx }
}

/** 合并多个 BufferGeometry 为一个 */
function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geos.length === 0) return null
  if (geos.length === 1) {
    const g = geos[0]
    // 确保有 normals
    if (!g.getAttribute('normal')) g.computeVertexNormals()
    return g
  }

  const allPos: number[] = [], allNorm: number[] = [], allIdx: number[] = []
  let vtxOffset = 0

  for (const geo of geos) {
    if (!geo.getAttribute('normal')) geo.computeVertexNormals()
    const pos = geo.getAttribute('position')
    const norm = geo.getAttribute('normal')
    const idx = geo.getIndex()

    for (let i = 0; i < pos.count; i++) {
      allPos.push(pos.getX(i), pos.getY(i), pos.getZ(i))
      allNorm.push(norm.getX(i), norm.getY(i), norm.getZ(i))
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

/** Polygon → ExtrudeGeometry（支持孔洞） */
function buildPolygonGeom(
  rings: Array<Array<[number, number, number?]>>,
  depth: number,
): THREE.BufferGeometry[] {
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

  for (const { outer, holes } of shapes) {
    for (const h of holes) outer.holes.push(h)
    const bevel = Math.min(depth * 0.03, 0.02)
    try {
      const geo = new THREE.ExtrudeGeometry(outer, {
        steps: 1, depth,
        bevelEnabled: depth > 0.1,
        bevelThickness: bevel, bevelSize: bevel,
        bevelSegments: depth > 0.1 ? 3 : 1,
      })
      geo.rotateX(-Math.PI / 2)
      results.push(geo)
    } catch { /* skip */ }
  }
  return results
}

/** LineString → TubeGeometry */
function buildLineGeom(
  lines: Array<Array<[number, number, number?]>>,
  radius: number,
): THREE.BufferGeometry[] {
  const results: THREE.BufferGeometry[] = []
  for (const line of lines) {
    if (line.length < 2) continue
    const pts = line.map((c) => new THREE.Vector3(c[0], c[1] + radius, c[2]))
    results.push(new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(pts),
      Math.min(line.length * 2, 64), radius, 6, false))
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
  const options = { ...DEFAULT_CONVERSION_OPTIONS, ...opts }
  const features = normalizeFeatures(geojson as GeoJSONRoot)

  if (features.length === 0) {
    throw new Error('GeoJSON 不包含任何要素 (features)')
  }

  const bounds = computeBounds(features)
  const tx = createTransformer(bounds, options.targetSize)

  const entries: GeomEntry[] = []

  // ---- 遍历要素，生成几何体 ----
  for (const feature of features) {
    const type = feature.geometry?.type
    if (!type) continue

    const fallback = TYPE_COLORS[type] ?? 0x888888
    const colorHex = parseColor(
      feature.properties?.['color'] ?? feature.properties?.['fill'], fallback)
    const height = Math.max(
      Number(feature.properties?.[options.heightProperty]) || options.defaultHeight, 0.01)

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
          options.tubeRadius))
        break
      case 'MultiLineString': {
        const lines = (feature.geometry as GeoJSONMultiLineString).coordinates
          .map(ring => ring.map(c => tx(c) as [number, number, number?]))
        geos.push(...buildLineGeom(lines, options.tubeRadius))
        break
      }
      case 'Polygon': {
        const rings = (feature.geometry as GeoJSONPolygon).coordinates
          .map(ring => ring.map(c => tx(c) as [number, number, number?]))
        geos.push(...buildPolygonGeom(rings, height))
        break
      }
      case 'MultiPolygon':
        for (const poly of (feature.geometry as GeoJSONMultiPolygon).coordinates) {
          const rings = poly.map(ring => ring.map(c => tx(c) as [number, number, number?]))
          geos.push(...buildPolygonGeom(rings, height))
        }
        break
    }

    const merged = mergeGeometries(geos)
    if (merged) {
      const { pos, norm, idx } = extractAndDispose(merged)
      entries.push({
        positions: pos, normals: norm, indices: idx,
        colorHex, roughness: 0.6, metalness: 0.1, doubleSided: true,
      })
    }
  }

  // ---- 用 @gltf-transform 构建 GLB ----
  const doc = new Document()
  const buffer = doc.createBuffer('main')
  const scene = doc.createScene('GeoJSON')

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    const [r, g, b] = hexToFactor(e.colorHex)

    const posAcc = doc.createAccessor()
      .setArray(e.positions).setType('VEC3').setBuffer(buffer)

    const normAcc = doc.createAccessor()
      .setArray(e.normals ?? e.positions).setType('VEC3').setBuffer(buffer)

    const idxAcc = doc.createAccessor()
      .setArray(e.indices).setType('SCALAR').setBuffer(buffer)

    const mat = doc.createMaterial()
      .setBaseColorFactor([r, g, b, 1.0])
      .setRoughnessFactor(e.roughness)
      .setMetallicFactor(e.metalness)
      .setDoubleSided(e.doubleSided)

    const prim = doc.createPrimitive()
      .setAttribute('POSITION', posAcc)
      .setAttribute('NORMAL', normAcc)
      .setIndices(idxAcc)
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
