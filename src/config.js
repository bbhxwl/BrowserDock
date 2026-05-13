const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const DEFAULT_CONFIG = Object.freeze({
  fullscreen: true,
  layout: 'auto',
  refreshSec: 0,
  language: 'auto', // auto | zh | en
  urls: ['https://www.baidu.com'],
  cells: [],
});

function getConfigPath(app) {
  const projectConfig = path.join(__dirname, '..', 'config.yaml');
  if (fs.existsSync(projectConfig)) return projectConfig;
  return path.join(app.getPath('userData'), 'config.yaml');
}

function readConfig(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = yaml.load(raw) || {};
    return normalize(parsed);
  } catch (err) {
    if (err.code === 'ENOENT') {
      writeConfig(filePath, DEFAULT_CONFIG);
      return { ...DEFAULT_CONFIG };
    }
    throw err;
  }
}

function writeConfig(filePath, config) {
  const normalized = normalize(config);
  const header =
    '# 浏览器扩展（斌斌） 配置文件\n# 由 UI 自动写入，可手动编辑，保存后窗口会自动重载\n\n';
  const body = yaml.dump(normalized, { lineWidth: 120, noRefs: true });
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, header + body, 'utf8');
  return normalized;
}

function normalize(input) {
  const cfg = { ...DEFAULT_CONFIG, ...(input || {}) };
  cfg.fullscreen = Boolean(cfg.fullscreen);
  cfg.layout = cfg.layout === 'manual' ? 'manual' : 'auto';
  cfg.language = cfg.language === 'zh' || cfg.language === 'en' ? cfg.language : 'auto';
  const rs = Number(cfg.refreshSec);
  cfg.refreshSec = Number.isFinite(rs) ? Math.max(0, Math.floor(rs)) : 0;
  cfg.urls = Array.isArray(cfg.urls)
    ? cfg.urls.filter((u) => typeof u === 'string' && u.trim().length > 0).map((u) => u.trim())
    : [];
  cfg.cells = Array.isArray(cfg.cells)
    ? cfg.cells.map((c) => ({
        x: clampUnit(c?.x),
        y: clampUnit(c?.y),
        w: clampUnit(c?.w, 0.1),
        h: clampUnit(c?.h, 0.1),
      }))
    : [];
  return cfg;
}

function clampUnit(v, fallback = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

module.exports = {
  DEFAULT_CONFIG,
  getConfigPath,
  readConfig,
  writeConfig,
  normalize,
};
