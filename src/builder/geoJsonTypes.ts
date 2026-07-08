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
  /** 无高度属性时的默认挤出高度，默认 0.5 */
  defaultHeight?: number
  /** 从 properties 中读取高度的字段名，默认 'height' */
  heightProperty?: string
  /** 从 properties 中读取颜色的字段名，默认 'color'（支持 #hex 格式） */
  colorProperty?: string
  /** 点要素标记半径，默认 0.08 */
  pointRadius?: number
  /** 缩放后模型目标边界尺寸，默认 5 */
  targetSize?: number
  /** 管状线半径，默认 0.04 */
  tubeRadius?: number
}

export const DEFAULT_CONVERSION_OPTIONS: Required<GeoJsonConversionOptions> = {
  defaultHeight: 0.5,
  heightProperty: 'height',
  colorProperty: 'color',
  pointRadius: 0.08,
  targetSize: 5,
  tubeRadius: 0.04,
}
