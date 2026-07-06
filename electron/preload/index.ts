import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // 打开 GLB 文件选择对话框
  openGlb: (): Promise<string | null> => ipcRenderer.invoke('dialog:openGlb'),

  // 保存 HTML 文件对话框
  saveHtml: (defaultName?: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:saveHtml', defaultName),

  // 在文件管理器中显示
  showItemInFolder: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('shell:showItemInFolder', filePath),

  // 用默认浏览器打开
  openPath: (filePath: string): Promise<string> =>
    ipcRenderer.invoke('shell:openPath', filePath),
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
