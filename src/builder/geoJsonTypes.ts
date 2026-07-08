/**
 * GeoJSON 类型定义
 * 定义 GeoJSON 规范子集，用于文件解析和验证
 */

export interface GeoJSONPoint {
  type: 'Point'
  coordinates: [number, number] | [number, number, number]
}

export interface GeoJSONMultiPoint {
  type: 'MultiPoint'
  coordinates: Array<[number, number] | [number, number, number]>
}

export interface GeoJSONLineString {
  type: 'LineString'
  coordinates: Array<[number, number] | [number, number, number]>
}

export interface GeoJSONMultiLineString {
  type: 'MultiLineString'
  coordinates: Array<Array<[number, number] | [number, number, number]>>
}

export interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: Array<Array<[number, number] | [number, number, number]>>
}

export interface GeoJSONMultiPolygon {
  type: 'MultiPolygon'
  coordinates: Array<Array<Array<[number, number] | [number, number, number]>>>
}

export type GeoJSONGeometry =
  | GeoJSONPoint
  | GeoJSONMultiPoint
  | GeoJSONLineString
  | GeoJSONMultiLineString
  | GeoJSONPolygon
  | GeoJSONMultiPolygon

export interface GeoJSONFeature {
  type: 'Feature'
  geometry: GeoJSONGeometry
  properties: Record<string, any> | null
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}

export type GeoJSONRoot = GeoJSONFeatureCollection | GeoJSONFeature

/** 转换选项 */
export interface GeoJsonConversionOptions {
  // ---- 高度 ----
  /** 无高度属性时的默认挤出高度，默认 0.5 */
  defaultHeight?: number
  /** 从 properties 中读取高度的字段名，默认 'height' */
  heightProperty?: string
  /** Z 轴高度缩放倍数（同时影响 GeoJSON 第3坐标海拔 和 Polygon 挤出高度），默认 1.0 */
  heightScale?: number

  // ---- 颜色 ----
  /** 从 properties 中读取颜色的字段名，默认 'color'（支持 #hex 格式） */
  colorProperty?: string
  /** 点要素 fallback 颜色（#hex），默认 #ffc107 */
  pointColor?: string
  /** 线要素 fallback 颜色（#hex），默认 #2196f3 */
  lineColor?: string
  /** 多边形要素 fallback 颜色（#hex），默认 #009688 */
  polygonColor?: string

  // ---- 材质 ----
  /** PBR 粗糙度 0-1，默认 0.6 */
  roughness?: number
  /** PBR 金属度 0-1，默认 0.1 */
  metalness?: number

  // ---- 多边形倒角 ----
  /** ExtrudeGeometry 倒角厚度，默认 0.02（设 0 无倒角） */
  bevelThickness?: number
  /** ExtrudeGeometry 倒角大小，默认 0.02 */
  bevelSize?: number
  /** ExtrudeGeometry 倒角分段数，默认 3（越大越圆滑） */
  bevelSegments?: number

  // ---- 管线 ----
  /** 点要素标记半径，默认 0.08 */
  pointRadius?: number
  /** 管状线半径，默认 0.04 */
  tubeRadius?: number
  /** 管线圆周分段数，默认 6（越大越圆滑） */
  tubeRadialSegments?: number
  /** 管线路径分段因子（每点数 × 此值 = 总段数，上限 128），默认 2 */
  tubePathSegments?: number

  // ---- 布局 ----
  /** 缩放后模型目标边界尺寸，默认 5 */
  targetSize?: number
}

export const DEFAULT_CONVERSION_OPTIONS: Required<GeoJsonConversionOptions> = {
  defaultHeight: 0.5,
  heightProperty: 'height',
  heightScale: 1.0,
  colorProperty: 'color',
  pointColor: '#ffc107',
  lineColor: '#2196f3',
  polygonColor: '#009688',
  roughness: 0.6,
  metalness: 0.1,
  bevelThickness: 0.02,
  bevelSize: 0.02,
  bevelSegments: 3,
  pointRadius: 0.08,
  tubeRadius: 0.04,
  tubeRadialSegments: 6,
  tubePathSegments: 2,
  targetSize: 5,
}
