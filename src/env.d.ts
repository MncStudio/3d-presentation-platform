/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ElectronAPI {
  openGlb: () => Promise<string | null>
  saveHtml: (defaultName?: string) => Promise<string | null>
  readFile: (filePath: string) => Promise<ArrayBuffer | null>
  showItemInFolder: (filePath: string) => Promise<void>
  openPath: (filePath: string) => Promise<string>
}

interface Window {
  electronAPI: ElectronAPI
}
