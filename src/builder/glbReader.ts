/**
 * GLB 文件读取与信息提取
 * 负责解析 GLB 二进制文件，提取元信息（大小、网格数、动画数等）
 */

export interface GlbInfo {
  /** 文件大小 (bytes) */
  fileSize: number
  /** 格式化后的文件大小 */
  fileSizeFormatted: string
  /** 网格数量（预估值） */
  estimatedMeshes: number
  /** 动画片段数量 */
  animationCount: number
}

/**
 * 分析 GLB 二进制数据，提取关键信息
 */
export function analyzeGlb(data: ArrayBuffer): GlbInfo {
  const fileSize = data.byteLength

  return {
    fileSize,
    fileSizeFormatted: formatFileSize(fileSize),
    estimatedMeshes: 0, // 需要解析 GLB 结构才能获取，先置 0
    animationCount: 0,
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
