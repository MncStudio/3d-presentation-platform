import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import { join } from 'path'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    title: '3D Presenter',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // 外部链接用默认浏览器打开
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 开发环境加载 dev server，生产环境加载打包文件
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ========== IPC 处理 ==========

// 选择 GLB 文件
ipcMain.handle('dialog:openGlb', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: '选择 GLB 模型文件',
    filters: [
      { name: 'glTF Binary', extensions: ['glb'] },
      { name: '所有文件', extensions: ['*'] },
    ],
    properties: ['openFile'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

// 保存 HTML 文件
ipcMain.handle('dialog:saveHtml', async (_event, defaultName: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    title: '导出 HTML 文件',
    defaultPath: defaultName || 'demo.html',
    filters: [
      { name: 'HTML 文件', extensions: ['html'] },
    ],
  })
  if (result.canceled || !result.filePath) return null
  return result.filePath
})

// 在文件管理器中显示文件
ipcMain.handle('shell:showItemInFolder', async (_event, filePath: string) => {
  shell.showItemInFolder(filePath)
})

// 用默认浏览器打开文件
ipcMain.handle('shell:openPath', async (_event, filePath: string) => {
  return shell.openPath(filePath)
})

// ========== 应用生命周期 ==========

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
