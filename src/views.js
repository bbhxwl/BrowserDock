const { WebContentsView } = require('electron');
const { computeGrid } = require('./layout');

// 管理一组 WebContentsView，每个对应一个 URL 面板
// 切换 URL 时按需创建/销毁，尺寸调整时统一布局
class ViewManager {
  constructor(parentWindow) {
    this.window = parentWindow;
    this.views = []; // { view: WebContentsView, url: string }
    this.refreshTimer = null;
  }

  apply(config) {
    this._syncViews(config.urls);
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
          existing.view.webContents.loadURL(url).catch((err) => {
            console.error('[浏览器扩展（斌斌）] load failed:', url, err.message);
          });
        }
        next.push(existing);
      } else {
        const view = new WebContentsView({
          webPreferences: { contextIsolation: true, sandbox: true },
        });
        this.window.contentView.addChildView(view);
        view.webContents.loadURL(url).catch((err) => {
          console.error('[浏览器扩展（斌斌）] load failed:', url, err.message);
        });
        next.push({ view, url });
      }
    }
    // 销毁多余
    for (let i = urls.length; i < this.views.length; i++) {
      const old = this.views[i];
      this.window.contentView.removeChildView(old.view);
      old.view.webContents.destroy();
    }
    this.views = next;
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

module.exports = { ViewManager };
