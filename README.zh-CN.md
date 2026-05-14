# 浏览器扩展（斌斌）

[English](./README.md) · [简体中文](./README.zh-CN.md)

一个基于 Electron 的多网址数据大屏拼接工具。在一个全屏窗口里把多个网页（数据看板、监控页、Grafana 等）按智能网格自动平铺，配置 UI 与本地 YAML 双向同步——任意一边修改，另一边自动更新。

> 项目目录名为 `BrowserDock`（npm/git 标识），软件内显示名为「浏览器扩展（斌斌）」/「BrowserDock (Bin Bin)」。

## 特性

- **智能网格自动平铺**：N 个网址自动选最佳行列
  - 1 → 1×1，2 → 1×2，3 → 1×3，4 → 2×2，5 → 2 上 3 下，6 → 2×3，7 → 3+3+1，9 → 3×3 …
  - 末行不足列时单元格自动拉伸，避免空白
- **手动栅格**：在设置预览里拖动/缩放每块，比例（0~1）写回 YAML
- **配置双向同步**：UI 编辑 → 写 `config.yaml`；外部编辑 YAML → 文件 watcher 推回 UI 并重载面板
- **单窗口分屏 + 全屏**：使用 Electron `WebContentsView` 在同一窗口内并排渲染多个页面
- **可选自动刷新**：每个面板按设定秒数自动重载
- **可选隐藏页面滚动条**：多面板大屏更整洁，页面仍可滚动
- **中英文 i18n**：自动跟随系统语言（zh / en），可在设置内手动切换
- **跨平台打包**：DMG / Mac zip / Windows NSIS 安装包 / Windows Portable 单文件
- **GitHub Actions 自动发版**：推送 `v*.*.*` 标签即触发构建并上传到 Releases

## 安装（开发）

```bash
git clone <repo>
cd BrowserDock
npm install
npm start
```

## 使用

1. 启动后默认全屏显示 `config.yaml` 中 `urls` 列出的页面。
2. 按 `⌘,` (macOS) 或 `Ctrl+,` (Windows/Linux) 打开设置窗口，可：
   - 增 / 删 / 排序 URL
   - 切换布局模式（auto / manual）
   - 调整自动刷新间隔
   - 隐藏页面滚动条
   - 在预览图上拖动调整每块大小（manual 模式）
   - 切换界面语言（跟随系统 / 中文 / English）
3. 点击 **保存并应用** 立即生效，并写回 `config.yaml`。
4. 也可直接用编辑器修改 `config.yaml`，保存后窗口自动重载。

## 快捷键

| 键 | 动作 |
| --- | --- |
| `⌘,` / `Ctrl+,` | 打开设置 |
| `⌘ Shift+S` / `Ctrl+Shift+S` | 全局打开设置 |
| `F11` | 切换全屏 |
| `⌘R` / `Ctrl+R` | 重载所有面板 |

## 配置文件

```yaml
fullscreen: true        # 启动时全屏
layout: auto            # auto | manual
refreshSec: 0           # 自动刷新秒数，0 关闭
hideScrollbars: false   # 隐藏页面滚动条，但保留页面滚动能力
language: auto          # auto | zh | en
urls:
  - https://example.com/dashboard1
  - https://example.com/dashboard2
cells: []               # manual 模式时按 0~1 比例定义每块 x/y/w/h
```

`config.yaml` 优先在项目根目录查找；不存在时落到 `app.getPath('userData')`。设置窗口顶部会显示当前路径。

## 打包

```bash
npm run pack:mac      # DMG + zip（Intel + Apple Silicon 通用）
npm run pack:win      # NSIS 安装包 + Portable 单文件（x64）
npm run pack:all      # 全部一起
npm run icon          # 重新生成「斌」字图标（需要 Pillow）
```

产物输出到 `dist/`。

## CI / 自动发版

`.github/workflows/release.yml` 会在推送 `v*.*.*` 标签时跑两台 runner（macOS + Windows）构建产物并发布到 GitHub Releases。

```bash
git tag v0.1.0 && git push origin v0.1.0
```

仓库需要在 `Settings → Actions → General → Workflow permissions` 勾选 **Read and write**，工作流才能用内置 `GITHUB_TOKEN` 创建 Release。

## 项目结构

```
src/
├── main.js              主进程：窗口 + IPC + 文件 watcher
├── config.js            YAML 读写与字段标准化
├── layout.js            智能网格 + 手动栅格计算
├── views.js             WebContentsView 池（按需复用 / 销毁）
├── preload.js           渲染进程桥
├── i18n/index.js        中英文字典 + 语言判定
└── renderer/
    ├── dashboard.html       主窗口占位 + 启动 toast
    ├── toast.html           置顶无边框启动浮层
    └── settings.html/css/js 设置 UI
build/
├── make-icon.py         生成 1024×1024 「斌」字图标
└── icon.png             生成的应用图标
.github/workflows/release.yml   CI 发版流水线
```

## 协议

MIT
