// 极简 i18n：只覆盖设置 UI 和快捷键 toast 文案
// 调用约定：t(dict, key) 或浏览器侧 t(key)

const zh = {
  // toast
  'toast.launched': '浏览器扩展（斌斌）已启动',
  'toast.openSettings': '打开设置',
  'toast.fullscreen': '全屏',
  'toast.refresh': '刷新',
  'toast.or': '或',
  // settings
  'settings.title': '浏览器扩展（斌斌） 设置',
  'settings.brand': '浏览器扩展（斌斌）',
  'settings.cfgPathPrefix': '配置文件：',
  'settings.cfgLoading': '配置文件加载中…',
  'settings.optsHeader': '常规',
  'settings.fullscreenLabel': '启动时全屏',
  'settings.layoutLabel': '布局模式',
  'settings.layoutAuto': '智能网格（自动平铺）',
  'settings.layoutManual': '手动栅格（按下方比例）',
  'settings.refreshLabel': '自动刷新（秒，0 关闭）',
  'settings.languageLabel': '界面语言',
  'settings.langAuto': '跟随系统',
  'settings.langZh': '中文',
  'settings.langEn': 'English',
  'settings.urlsHeader': '网址列表',
  'settings.add': '+ 新增',
  'settings.preview': '预览布局',
  'settings.previewHeader': '布局预览',
  'settings.previewHint': '手动模式下可拖动右下角调整每块大小，拖动块体调整位置。比例自动写回 YAML。',
  'settings.btnReload': '放弃并重读 YAML',
  'settings.btnSave': '保存并应用',
  'settings.savedClosing': '已保存，正在关闭…',
  'settings.reloaded': '已重读 YAML',
  'settings.externalSync': '外部修改已同步',
  'settings.tipUp': '上移',
  'settings.tipDown': '下移',
  'settings.tipDel': '删除',
};

const en = {
  // toast
  'toast.launched': 'BrowserDock (Bin Bin) launched',
  'toast.openSettings': 'Open Settings',
  'toast.fullscreen': 'Fullscreen',
  'toast.refresh': 'Reload',
  'toast.or': 'or',
  // settings
  'settings.title': 'BrowserDock (Bin Bin) Settings',
  'settings.brand': 'BrowserDock (Bin Bin)',
  'settings.cfgPathPrefix': 'Config file: ',
  'settings.cfgLoading': 'Loading config…',
  'settings.optsHeader': 'General',
  'settings.fullscreenLabel': 'Launch in fullscreen',
  'settings.layoutLabel': 'Layout mode',
  'settings.layoutAuto': 'Smart grid (auto tile)',
  'settings.layoutManual': 'Manual grid (use ratios below)',
  'settings.refreshLabel': 'Auto refresh (seconds, 0 = off)',
  'settings.languageLabel': 'Language',
  'settings.langAuto': 'Follow system',
  'settings.langZh': '中文',
  'settings.langEn': 'English',
  'settings.urlsHeader': 'URL list',
  'settings.add': '+ Add',
  'settings.preview': 'Refresh preview',
  'settings.previewHeader': 'Layout preview',
  'settings.previewHint':
    'In manual mode, drag the bottom-right corner to resize each tile, drag the body to move. Ratios are written back to YAML.',
  'settings.btnReload': 'Discard and reload YAML',
  'settings.btnSave': 'Save and apply',
  'settings.savedClosing': 'Saved, closing…',
  'settings.reloaded': 'Reloaded from YAML',
  'settings.externalSync': 'External change synced',
  'settings.tipUp': 'Move up',
  'settings.tipDown': 'Move down',
  'settings.tipDel': 'Delete',
};

const DICTS = { zh, en };

function resolveLocale(pref, systemLocale) {
  if (pref === 'zh' || pref === 'en') return pref;
  // auto: 系统语言以 zh 开头视为中文，其余英文
  return /^zh/i.test(systemLocale || '') ? 'zh' : 'en';
}

function getDict(locale) {
  return DICTS[locale] || DICTS.en;
}

function t(locale, key) {
  const d = getDict(locale);
  return d[key] || key;
}

module.exports = { DICTS, resolveLocale, getDict, t };
