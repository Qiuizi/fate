const path = require('node:path');
const { app, BrowserWindow, Menu, shell } = require('electron');

const APP_TITLE = '命理排盘';
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    title: APP_TITLE,
    backgroundColor: '#f7f6f2',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  const devUrl = process.env.ELECTRON_START_URL;
  let devOrigin = 'http://127.0.0.1:5173';
  if (devUrl) {
    try {
      devOrigin = new URL(devUrl).origin;
    } catch {
      /* keep default */
    }
  }

  mainWindow.webContents.on('will-navigate', (event, url) => {
    // 开发模式下 ELECTRON_START_URL 可能是 localhost 或其它端口；同源导航必须留在窗口内
    const allowed = url.startsWith('file://') || url.startsWith(devOrigin + '/') || url === devOrigin;
    if (!allowed) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    app.setAppUserModelId('com.qiuizi.mingli');
    Menu.setApplicationMenu(null);
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
