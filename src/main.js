const { app, BrowserWindow, ipcMain, Menu, globalShortcut, shell, Notification } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { getConfigPath, readConfig, writeConfig } = require('./config');
const { ViewManager } = require('./views');
const { resolveLocale, t } = require('./i18n');

function effectiveLocale() {
  const sys = app.getLocale();
  return resolveLocale(currentConfig?.language, sys);
}

let dashboardWindow = null;
let settingsWindow = null;
let viewManager = null;
let currentConfig = null;
let configPath = null;
let watcher = null;
let watcherDebounce = null;
let suppressWatchUntil = 0; // 我们自己写入时的去抖窗口

function createDashboardWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    backgroundColor: '#000000',
    show: false,
    autoHideMenuBar: true,
    fullscreen: Boolean(currentConfig.fullscreen),
    title: '浏览器扩展（斌斌）',
  });

  win.loadFile(path.join(__dirname, 'renderer', 'dashboard.html'), {
    search: 'lang=' + effectiveLocale(),
  });
  win.once('ready-to-show', () => win.show());

  win.on('resize', () => {
    if (viewManager) viewManager.relayout(currentConfig);
  });
  win.on('enter-full-screen', () => viewManager && viewManager.relayout(currentConfig));
  win.on('leave-full-screen', () => viewManager && viewManager.relayout(currentConfig));

  win.on('closed', () => {
    if (viewManager) viewManager.destroyAll();
    viewManager = null;
    dashboardWindow = null;
  });

  return win;
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return settingsWindow;
  }
  const win = new BrowserWindow({
    width: 760,
    height: 720,
    title: '浏览器扩展（斌斌） 设置',
    autoHideMenuBar: true,
    parent: dashboardWindow || undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'settings.html'));
  win.on('closed', () => {
    settingsWindow = null;
  });
  settingsWindow = win;
  return win;
}

function buildMenu() {
  const template = [
    {
      label: '浏览器扩展（斌斌）',
      submenu: [
        {
          label: '设置 URL / 布局…',
          accelerator: 'CmdOrCtrl+,',
          click: () => createSettingsWindow(),
        },
        {
          label: '切换全屏',
          accelerator: 'F11',
          click: () => {
            if (dashboardWindow) dashboardWindow.setFullScreen(!dashboardWindow.isFullScreen());
          },
        },
        {
          label: '重新加载所有面板',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (viewManager) {
              for (const e of viewManager.views) e.view.webContents.reload();
            }
          },
        },
        { type: 'separator' },
        {
          label: '打开配置文件所在目录',
          click: () => shell.showItemInFolder(configPath),
        },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function applyConfig(newConfig, { fromWatcher } = {}) {
  const prev = currentConfig;
  currentConfig = newConfig;

  if (!dashboardWindow) {
    dashboardWindow = createDashboardWindow();
  } else if (prev && prev.fullscreen !== newConfig.fullscreen) {
    dashboardWindow.setFullScreen(Boolean(newConfig.fullscreen));
  }

  if (!viewManager) {
    viewManager = new ViewManager(dashboardWindow);
  }
  viewManager.apply(newConfig);

  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('config:changed', newConfig);
  }

  if (fromWatcher) {
    console.log('[浏览器扩展（斌斌）] config reloaded from disk');
  }
}

function watchConfig() {
  if (watcher) watcher.close();
  watcher = fs.watch(configPath, { persistent: false }, (eventType) => {
    if (eventType !== 'change') return;
    if (Date.now() < suppressWatchUntil) return;
    if (watcherDebounce) clearTimeout(watcherDebounce);
    watcherDebounce = setTimeout(() => {
      try {
        const next = readConfig(configPath);
        applyConfig(next, { fromWatcher: true });
      } catch (err) {
        console.error('[浏览器扩展（斌斌）] reload failed:', err.message);
      }
    }, 150);
  });
}

function registerIpc() {
  ipcMain.handle('config:get', () => currentConfig);
  ipcMain.handle('config:path', () => configPath);
  ipcMain.handle('i18n:locale', () => effectiveLocale());
  ipcMain.handle('i18n:systemLocale', () => app.getLocale());
  ipcMain.handle('config:save', (_evt, payload) => {
    suppressWatchUntil = Date.now() + 500; // 避免触发自己引发的 watcher
    const saved = writeConfig(configPath, payload);
    applyConfig(saved);
    return saved;
  });
  ipcMain.handle('dashboard:toggle', () => {
    if (!dashboardWindow) return false;
    if (dashboardWindow.isMinimized()) dashboardWindow.restore();
    dashboardWindow.focus();
    return true;
  });
  ipcMain.handle('dashboard:fullscreen', () => {
    if (!dashboardWindow) return false;
    dashboardWindow.setFullScreen(!dashboardWindow.isFullScreen());
    return dashboardWindow.isFullScreen();
  });
  ipcMain.handle('settings:close', () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.close();
    return true;
  });
}

function showLaunchToast() {
  // 1) 系统级通知（OS notification center）
  const locale = effectiveLocale();
  const isMac = process.platform === 'darwin';
  const mod = isMac ? '⌘' : 'Ctrl';
  if (Notification.isSupported()) {
    const orWord = t(locale, 'toast.or');
    new Notification({
      title: t(locale, 'toast.launched'),
      body:
        `${t(locale, 'toast.openSettings')}: ${mod}+,  ${orWord}  ${mod}+Shift+S\n` +
        `${t(locale, 'toast.fullscreen')}: F11   ${t(locale, 'toast.refresh')}: ${mod}+R`,
      silent: true,
    }).show();
  }

  // 2) 应用内浮层 toast：frameless + 透明 + 置顶，叠在 dashboard 之上，5 秒自动关闭
  if (!dashboardWindow) return;
  const [winX, winY] = dashboardWindow.getPosition();
  const [winW] = dashboardWindow.getSize();
  const toastW = 420;
  const toastH = 130;
  const toast = new BrowserWindow({
    width: toastW,
    height: toastH,
    x: winX + Math.round((winW - toastW) / 2),
    y: winY + 24,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: false,
    hasShadow: false,
    parent: dashboardWindow,
    show: false,
  });
  toast.setIgnoreMouseEvents(true);
  toast.loadFile(path.join(__dirname, 'renderer', 'toast.html'), {
    search: 'lang=' + locale,
  });
  toast.once('ready-to-show', () => toast.showInactive());
  setTimeout(() => {
    if (!toast.isDestroyed()) toast.close();
  }, 5000);
}

app.whenReady().then(() => {
  configPath = getConfigPath(app);
  currentConfig = readConfig(configPath);

  registerIpc();
  buildMenu();
  applyConfig(currentConfig);
  watchConfig();

  globalShortcut.register('CommandOrControl+Shift+S', () => createSettingsWindow());

  showLaunchToast();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) applyConfig(currentConfig);
  });
});

app.on('window-all-closed', () => {
  if (watcher) watcher.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
