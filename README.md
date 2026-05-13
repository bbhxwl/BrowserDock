# BrowserDock (Bin Bin)

[English](./README.md) · [简体中文](./README.zh-CN.md)

A multi-URL dashboard window splitter built with Electron. Tile multiple web pages (Grafana, monitoring panels, status pages…) in a single fullscreen window using a smart auto-grid. The settings UI and a local YAML file stay in sync — edit either side and the other updates automatically.

> The project directory is named `BrowserDock` (npm/git identifier). The in-app product name is **浏览器扩展（斌斌）** / **BrowserDock (Bin Bin)**.

## Features

- **Smart auto-grid layout** — picks the best rows × cols for any N
  - 1 → 1×1, 2 → 1×2, 3 → 1×3, 4 → 2×2, 5 → 2 top + 3 bottom, 6 → 2×3, 7 → 3+3+1, 9 → 3×3 …
  - Last row stretches its cells to fill width when fewer than full
- **Manual grid mode** — drag and resize each tile in the preview; ratios (0~1) persist back to YAML
- **Two-way config sync** — UI edits write `config.yaml`; external edits to YAML push back into the window via a file watcher
- **Single-window split + fullscreen** — uses Electron `WebContentsView` to render multiple pages side-by-side
- **Optional auto-refresh** — reload every panel on a fixed interval
- **i18n** — auto-detects system language (zh / en) and lets you override it in settings
- **Cross-platform packaging** — DMG / Mac zip / Windows NSIS installer / Windows portable EXE
- **GitHub Actions release pipeline** — push a `v*.*.*` tag and binaries land on the Releases page

## Install (development)

```bash
git clone <repo>
cd BrowserDock
npm install
npm start
```

## Usage

1. On launch the window goes fullscreen and renders every URL listed in `config.yaml`.
2. Open the settings window with `⌘,` (macOS) or `Ctrl+,` (Windows/Linux). From there you can:
   - Add / remove / reorder URLs
   - Switch layout mode (`auto` / `manual`)
   - Change auto-refresh interval
   - Drag tiles in the preview (manual mode)
   - Switch UI language (Auto / 中文 / English)
3. Click **Save and apply** — the change takes effect immediately and `config.yaml` is updated.
4. You can also edit `config.yaml` directly in any editor; the window will reload on save.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `⌘,` / `Ctrl+,` | Open settings |
| `⌘ Shift+S` / `Ctrl+Shift+S` | Open settings (global) |
| `F11` | Toggle fullscreen |
| `⌘R` / `Ctrl+R` | Reload all panels |

## Configuration file

```yaml
fullscreen: true        # launch in fullscreen
layout: auto            # auto | manual
refreshSec: 0           # auto-refresh seconds, 0 = off
language: auto          # auto | zh | en
urls:
  - https://example.com/dashboard1
  - https://example.com/dashboard2
cells: []               # manual mode: 0~1 ratios for x/y/w/h per tile
```

`config.yaml` is looked up in the project root first; if missing it falls back to `app.getPath('userData')`. The settings window shows the resolved path at the top.

## Build / package

```bash
npm run pack:mac      # DMG + zip, universal (Intel + Apple Silicon)
npm run pack:win      # NSIS installer + portable EXE (x64)
npm run pack:all      # everything
npm run icon          # regenerate the 斌 icon (requires Pillow)
```

Artifacts land in `dist/`.

## CI / Release

`.github/workflows/release.yml` builds macOS and Windows binaries on every `v*.*.*` tag and publishes them to GitHub Releases.

```bash
git tag v0.1.0 && git push origin v0.1.0
```

The repo's `Settings → Actions → General → Workflow permissions` must be set to **Read and write** so the workflow can create releases with the built-in `GITHUB_TOKEN`.

## Project layout

```
src/
├── main.js              main process: window + IPC + file watcher
├── config.js            YAML read/write + field normalization
├── layout.js            smart grid + manual grid math
├── views.js             WebContentsView pool (incremental reuse/destroy)
├── preload.js           renderer bridge
├── i18n/index.js        zh / en dictionaries + locale resolver
└── renderer/
    ├── dashboard.html       main window placeholder + launch toast
    ├── toast.html           always-on-top frameless launch toast
    └── settings.html/css/js settings UI
build/
├── make-icon.py         generates the 1024×1024 斌 icon
└── icon.png             generated app icon
.github/workflows/release.yml   CI release pipeline
```

## License

MIT
