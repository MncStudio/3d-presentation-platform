/**
 * Builder 构建引擎
 * 核心管线：读取 GLB → 分析/压缩 → Base64 编码 → 注入模板 → 输出 HTML
 * 新增：GeoJSON → GLB 转换
 */

export { buildHtml } from './htmlBuilder'
export type { BuildOptions } from './htmlBuilder'
export { analyzeGlb } from './glbReader'
export type { GlbInfo } from './glbReader'
export { encodeToBase64, createDataUri } from './assetEncoder'
export {
  analyzeGlb as analyzeGlbAdvanced,
  compressGlb,
  DEFAULT_COMPRESS_OPTIONS,
  formatFileSize,
} from './glbProcessor'
export type { GlbStats, CompressOptions, CompressResult } from './glbProcessor'
export { geojsonToGlb } from './geoJsonProcessor'
export type { GeoJsonConversionOptions } from './geoJsonTypes'
