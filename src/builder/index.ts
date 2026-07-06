/**
 * Builder 构建引擎
 * 核心管线：读取 GLB → Base64 编码 → 注入模板 → 输出 HTML
 */

export { buildHtml } from './htmlBuilder'
export type { BuildOptions } from './htmlBuilder'
export { analyzeGlb } from './glbReader'
export type { GlbInfo } from './glbReader'
export { encodeToBase64, createDataUri } from './assetEncoder'
