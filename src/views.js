const { WebContentsView } = require('electron');
const { computeGrid } = require('./layout');

const HIDE_SCROLLBARS_CSS = `
html,
body,
* {
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

html::-webkit-scrollbar,
body::-webkit-scrollbar,
*::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}
`;

// 管理一组 WebContentsView，每个对应一个 URL 面板
// 切换 URL 时按需创建/销毁，尺寸调整时统一布局
class ViewManager {
  constructor(parentWindow) {
    this.window = parentWindow;
    this.views = []; // { view: WebContentsView, url: string }
    this.refreshTimer = null;
    this.hideScrollbars = false;
  }

  apply(config) {
    this._syncViews(config.urls);
    this._applyScrollbarPreference(Boolean(config.hideScrollbars));
    this.relayout(config);
    this._setupRefresh(config.refreshSec);
  }

  relayout(config) {
    const [width, height] = this.window.getContentSize();
    const rects = computeGrid(config, width, height);
    this.views.forEach((entry, i) => {
      const r = rects[i];
      if (!r) return;
      entry.view.setBounds({ x: r.x, y: r.y, width: r.w, height: r.h });
    });
  }

  destroyAll() {
    this._clearRefresh();
    for (const entry of this.views) {
      this.window.contentView.removeChildView(entry.view);
      entry.view.webContents.destroy();
    }
    this.views = [];
  }

  _syncViews(urls) {
    // 复用现有 view，仅在 URL 变化时重新加载；多余的销毁；不足的创建
    const next = [];
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const existing = this.views[i];
      if (existing) {
        if (existing.url !== url) {
          existing.url = url;
          existing.scrollbarCssKey = null;
          existing.scrollbarCssPending = false;
          this._loadEntry(existing, url);
        }
        next.push(existing);
      } else {
        const view = new WebContentsView({
          webPreferences: { contextIsolation: true, sandbox: true },
        });
        const entry = {
          view,
          url,
          scrollbarCssKey: null,
          scrollbarCssPending: false,
        };
        view.webContents.on('did-finish-load', () => {
          entry.scrollbarCssKey = null;
          entry.scrollbarCssPending = false;
          if (this.hideScrollbars) this._insertScrollbarCss(entry);
        });
        this.window.contentView.addChildView(view);
        this._loadEntry(entry, url);
        next.push(entry);
      }
    }
    // 销毁多余
    for (let i = urls.length; i < this.views.length; i++) {
      const old = this.views[i];
      this.window.contentView.removeChildView(old.view);
      old.view.webContents.destroy();
    }
    this.views = next;
    this._raiseViews();
  }

  _loadEntry(entry, url) {
    entry.view.webContents.loadURL(url).catch((err) => {
      console.error('[浏览器扩展（斌斌）] load failed:', url, err.message);
      entry.view.webContents.loadURL(buildLoadErrorUrl(url, err.message)).catch((fallbackErr) => {
        console.error('[浏览器扩展（斌斌）] error page failed:', fallbackErr.message);
      });
    });
  }

  _raiseViews() {
    for (const entry of this.views) {
      this.window.contentView.removeChildView(entry.view);
      this.window.contentView.addChildView(entry.view);
    }
  }

  _applyScrollbarPreference(hideScrollbars) {
    this.hideScrollbars = hideScrollbars;
    for (const entry of this.views) {
      if (hideScrollbars) {
        this._insertScrollbarCss(entry);
      } else {
        this._removeScrollbarCss(entry);
      }
    }
  }

  _insertScrollbarCss(entry) {
    if (entry.scrollbarCssKey || entry.scrollbarCssPending) return;
    entry.scrollbarCssPending = true;
    entry.view.webContents
      .insertCSS(HIDE_SCROLLBARS_CSS)
      .then((key) => {
        entry.scrollbarCssKey = key;
      })
      .catch((err) => {
        console.error('[浏览器扩展（斌斌）] hide scrollbar failed:', err.message);
      })
      .finally(() => {
        entry.scrollbarCssPending = false;
      });
  }

  _removeScrollbarCss(entry) {
    if (!entry.scrollbarCssKey) {
      entry.scrollbarCssPending = false;
      return;
    }
    const key = entry.scrollbarCssKey;
    entry.scrollbarCssKey = null;
    entry.scrollbarCssPending = false;
    entry.view.webContents.removeInsertedCSS(key).catch((err) => {
      console.error('[浏览器扩展（斌斌）] restore scrollbar failed:', err.message);
    });
  }

  _setupRefresh(seconds) {
    this._clearRefresh();
    if (!seconds || seconds <= 0) return;
    this.refreshTimer = setInterval(() => {
      for (const entry of this.views) {
        entry.view.webContents.reload();
      }
    }, seconds * 1000);
  }

  _clearRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

function buildLoadErrorUrl(url, message) {
  const safeUrl = escapeHtml(url);
  const safeMessage = escapeHtml(message);
  const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <style>
      html,
      body {
        margin: 0;
        width: 100%;
        height: 100%;
        background: #111827;
        color: #f9fafb;
        font: 14px/1.6 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      body {
        display: grid;
        place-items: center;
        padding: 24px;
        box-sizing: border-box;
      }
      .box {
        max-width: 560px;
      }
      h1 {
        margin: 0 0 10px;
        font-size: 18px;
      }
      p {
        margin: 6px 0;
        color: #cbd5e1;
        word-break: break-all;
      }
      code {
        color: #93c5fd;
      }
    </style>
  </head>
  <body>
    <main class="box">
      <h1>页面加载失败</h1>
      <p>请检查设置里的网址是否完整，并确认网络可访问。</p>
      <p><code>${safeUrl}</code></p>
      <p>${safeMessage}</p>
    </main>
  </body>
</html>`;
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { ViewManager, buildLoadErrorUrl };
