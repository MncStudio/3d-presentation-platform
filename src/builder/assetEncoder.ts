/**
 * 资源 Base64 编码器
 * 将 GLB 二进制数据和贴图等资源编码为 Base64，内嵌到 HTML 中
 */

/**
 * 将 ArrayBuffer 编码为 Base64 字符串
 */
export function encodeToBase64(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * 生成 Data URI
 */
export function createDataUri(data: ArrayBuffer, mimeType: string): string {
  const base64 = encodeToBase64(data)
  return `data:${mimeType};base64,${base64}`
}
