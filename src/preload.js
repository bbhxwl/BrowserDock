const { contextBridge, ipcRenderer } = require('electron');
const { DICTS, resolveLocale } = require('./i18n');

// Settings 窗口与主进程的桥
contextBridge.exposeInMainWorld('dock', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (config) => ipcRenderer.invoke('config:save', config),
  getConfigPath: () => ipcRenderer.invoke('config:path'),
  onConfigChanged: (cb) => {
    const handler = (_evt, cfg) => cb(cfg);
    ipcRenderer.on('config:changed', handler);
    return () => ipcRenderer.removeListener('config:changed', handler);
  },
  toggleDashboard: () => ipcRenderer.invoke('dashboard:toggle'),
  toggleFullscreen: () => ipcRenderer.invoke('dashboard:fullscreen'),
  closeSettings: () => ipcRenderer.invoke('settings:close'),
  // i18n
  getLocale: () => ipcRenderer.invoke('i18n:locale'),
  getSystemLocale: () => ipcRenderer.invoke('i18n:systemLocale'),
  resolveLocale,
  dicts: DICTS,
});
