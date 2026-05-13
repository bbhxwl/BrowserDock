// Settings 渲染进程：双向同步 UI 与 YAML
// - 启动时拉取 currentConfig，渲染 URL 列表与预览
// - 用户操作只改本地 state，"保存并应用" 触发 IPC 写入
// - 主进程外部改 YAML 时通过 onConfigChanged 推送，重置本地 state

let state = null;
let cfgPath = '';
let unsubscribe = null;
let locale = 'zh';

const $ = (sel) => document.querySelector(sel);
const T = (key) => (window.dock.dicts[locale] && window.dock.dicts[locale][key]) || key;

function applyI18n() {
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  document.title = T('settings.title');
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = T(el.dataset.i18n);
  });
}

// ---------- 与主进程相同的智能网格算法（保持一致） ----------
function computeAutoGrid(count, w, h) {
  if (count <= 0 || w <= 0 || h <= 0) return [];
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const cellH = Math.floor(h / rows);
  const out = [];
  let placed = 0;
  for (let r = 0; r < rows; r++) {
    const remaining = count - placed;
    const inRow = Math.min(cols, remaining);
    const cellW = Math.floor(w / inRow);
    const usedW = cellW * inRow;
    const offsetX = Math.floor((w - usedW) / 2);
    for (let c = 0; c < inRow; c++) {
      const lastCol = c === inRow - 1;
      const lastRow = r === rows - 1;
      out.push({
        x: offsetX + c * cellW,
        y: r * cellH,
        w: lastCol ? w - (offsetX + c * cellW) : cellW,
        h: lastRow ? h - r * cellH : cellH,
      });
      placed++;
    }
  }
  return out;
}

// ---------- 渲染 ----------
function renderAll() {
  applyI18n();
  $('#fullscreen').checked = !!state.fullscreen;
  $('#layout').value = state.layout || 'auto';
  $('#refresh').value = state.refreshSec || 0;
  $('#language').value = state.language || 'auto';
  renderUrls();
  renderPreview();
}

function renderUrls() {
  const ul = $('#urlList');
  ul.innerHTML = '';
  state.urls.forEach((url, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="idx">${i + 1}</span>
      <input type="url" placeholder="https://..." value="${escapeAttr(url)}" />
      <button class="icon" data-act="up" title="${T('settings.tipUp')}">↑</button>
      <button class="icon" data-act="down" title="${T('settings.tipDown')}">↓</button>
      <button class="icon danger" data-act="del" title="${T('settings.tipDel')}">✕</button>
    `;
    const input = li.querySelector('input');
    input.addEventListener('input', () => {
      state.urls[i] = input.value;
      renderPreview();
    });
    li.querySelector('[data-act="up"]').onclick = () => move(i, -1);
    li.querySelector('[data-act="down"]').onclick = () => move(i, +1);
    li.querySelector('[data-act="del"]').onclick = () => removeAt(i);
    ul.appendChild(li);
  });
}

function renderPreview() {
  const box = $('#preview');
  box.innerHTML = '';
  box.classList.toggle('manual', state.layout === 'manual');

  const rect = box.getBoundingClientRect();
  const W = rect.width;
  const H = rect.height;
  const count = state.urls.length;

  let rects;
  if (state.layout === 'manual' && state.cells.length >= count && count > 0) {
    rects = state.cells
      .slice(0, count)
      .map((c) => ({ x: c.x * W, y: c.y * H, w: c.w * W, h: c.h * H }));
  } else {
    rects = computeAutoGrid(count, W, H);
  }

  rects.forEach((r, i) => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.style.left = r.x + 'px';
    cell.style.top = r.y + 'px';
    cell.style.width = r.w + 'px';
    cell.style.height = r.h + 'px';
    cell.dataset.i = String(i);
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = `${i + 1}. ${state.urls[i] || '(empty)'}`;
    cell.appendChild(label);

    const handle = document.createElement('div');
    handle.className = 'resize';
    cell.appendChild(handle);

    if (state.layout === 'manual') {
      attachDrag(cell, handle, i, W, H);
    }
    box.appendChild(cell);
  });
}

// ---------- 操作 ----------
function move(i, delta) {
  const j = i + delta;
  if (j < 0 || j >= state.urls.length) return;
  const t = state.urls[i];
  state.urls[i] = state.urls[j];
  state.urls[j] = t;
  if (state.layout === 'manual' && state.cells.length > Math.max(i, j)) {
    const tc = state.cells[i];
    state.cells[i] = state.cells[j];
    state.cells[j] = tc;
  }
  renderUrls();
  renderPreview();
}

function removeAt(i) {
  state.urls.splice(i, 1);
  if (state.cells.length > i) state.cells.splice(i, 1);
  renderUrls();
  renderPreview();
}

function addUrl() {
  state.urls.push('https://');
  renderUrls();
  renderPreview();
}

// 手动模式：拖动整块 / 缩放右下角；松开后写回 cells 比例
function attachDrag(cell, handle, idx, W, H) {
  let mode = null;
  let startX, startY, startCell;

  const onMouseMove = (e) => {
    if (!mode) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (mode === 'move') {
      let nx = startCell.x + dx;
      let ny = startCell.y + dy;
      nx = Math.max(0, Math.min(W - startCell.w, nx));
      ny = Math.max(0, Math.min(H - startCell.h, ny));
      cell.style.left = nx + 'px';
      cell.style.top = ny + 'px';
    } else if (mode === 'resize') {
      let nw = Math.max(40, Math.min(W - startCell.x, startCell.w + dx));
      let nh = Math.max(40, Math.min(H - startCell.y, startCell.h + dy));
      cell.style.width = nw + 'px';
      cell.style.height = nh + 'px';
    }
  };

  const onMouseUp = () => {
    if (!mode) return;
    mode = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    const x = parseFloat(cell.style.left) / W;
    const y = parseFloat(cell.style.top) / H;
    const w = parseFloat(cell.style.width) / W;
    const h = parseFloat(cell.style.height) / H;
    state.cells[idx] = { x, y, w, h };
  };

  cell.addEventListener('mousedown', (e) => {
    if (e.target === handle) return;
    mode = 'move';
    startX = e.clientX;
    startY = e.clientY;
    startCell = {
      x: parseFloat(cell.style.left),
      y: parseFloat(cell.style.top),
      w: parseFloat(cell.style.width),
      h: parseFloat(cell.style.height),
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    e.preventDefault();
  });
  handle.addEventListener('mousedown', (e) => {
    mode = 'resize';
    startX = e.clientX;
    startY = e.clientY;
    startCell = {
      x: parseFloat(cell.style.left),
      y: parseFloat(cell.style.top),
      w: parseFloat(cell.style.width),
      h: parseFloat(cell.style.height),
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    e.preventDefault();
    e.stopPropagation();
  });
}

// 切到 manual 模式时，如果 cells 还没和 urls 对齐，用当前 auto 布局做种子
function seedManualCellsIfNeeded() {
  if (state.layout !== 'manual') return;
  const count = state.urls.length;
  if (state.cells.length >= count) return;
  const box = $('#preview');
  const rect = box.getBoundingClientRect();
  const W = rect.width || 1600;
  const H = rect.height || 900;
  const auto = computeAutoGrid(count, W, H);
  state.cells = auto.map((r) => ({ x: r.x / W, y: r.y / H, w: r.w / W, h: r.h / H }));
}

function escapeAttr(s) {
  return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// ---------- 启动 + 事件绑定 ----------
async function init() {
  cfgPath = await window.dock.getConfigPath();
  state = await window.dock.getConfig();
  locale = await window.dock.getLocale();
  renderAll();
  $('#cfgPath').textContent = T('settings.cfgPathPrefix') + cfgPath;

  $('#fullscreen').onchange = (e) => (state.fullscreen = e.target.checked);
  $('#layout').onchange = (e) => {
    state.layout = e.target.value;
    seedManualCellsIfNeeded();
    renderPreview();
  };
  $('#refresh').onchange = (e) => (state.refreshSec = parseInt(e.target.value, 10) || 0);
  $('#language').onchange = async (e) => {
    state.language = e.target.value;
    const sysLocale = await window.dock.getSystemLocale();
    locale = window.dock.resolveLocale(state.language, sysLocale);
    renderAll();
    $('#cfgPath').textContent = T('settings.cfgPathPrefix') + cfgPath;
  };
  $('#addBtn').onclick = addUrl;
  $('#previewBtn').onclick = renderPreview;

  $('#saveBtn').onclick = async () => {
    state.urls = state.urls.map((u) => (u || '').trim()).filter(Boolean);
    if (state.layout === 'manual') seedManualCellsIfNeeded();
    state = await window.dock.saveConfig(state);
    locale = await window.dock.getLocale();
    renderAll();
    $('#cfgPath').textContent = T('settings.cfgPathPrefix') + cfgPath;
    flash(T('settings.savedClosing'));
    setTimeout(() => window.dock.closeSettings(), 350);
  };

  $('#reloadBtn').onclick = async () => {
    state = await window.dock.getConfig();
    locale = await window.dock.getLocale();
    renderAll();
    $('#cfgPath').textContent = T('settings.cfgPathPrefix') + cfgPath;
    flash(T('settings.reloaded'));
  };

  unsubscribe = window.dock.onConfigChanged(async (cfg) => {
    state = cfg;
    locale = await window.dock.getLocale();
    renderAll();
    $('#cfgPath').textContent = T('settings.cfgPathPrefix') + cfgPath;
    flash(T('settings.externalSync'));
  });

  // 预览容器 resize 时重画
  const ro = new ResizeObserver(() => renderPreview());
  ro.observe($('#preview'));
}

function flash(msg) {
  let el = $('#flash');
  if (!el) {
    el = document.createElement('div');
    el.id = 'flash';
    Object.assign(el.style, {
      position: 'fixed',
      bottom: '70px',
      right: '24px',
      background: 'rgba(34,197,94,0.95)',
      color: '#fff',
      padding: '8px 14px',
      borderRadius: '6px',
      fontSize: '12px',
      zIndex: 999,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    });
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.style.opacity = '0'), 1800);
}

init().catch((err) => {
  console.error(err);
  document.body.innerHTML = '<pre style="padding:20px;color:red">' + err.stack + '</pre>';
});
