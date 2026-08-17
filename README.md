# 六弦练习室

面向吉他日常练习的移动优先网页工具，包含节拍器、和弦查询和循环伴奏。节拍计算、音频合成、预设与 Jam 编排均在浏览器本地完成，不需要账号或后端服务。

线上地址：<https://trancer2thrash.github.io/Guitar-Metronome/>

## 功能

### Metronome

- 20–400 BPM，可直接输入、滑杆调整、±1/±5 调速或 Tap Tempo 测速。
- 1–12 拍的常用拍号编辑，支持 2/4/8/16 分母。
- 四分、八分、三连音、十六分和 Swing 细分。
- 每拍独立设置强拍、次强拍、弱拍或静音。
- 三种浏览器内合成点击音：经典滴答、木鱼和鼓棒。
- 速度训练、Quiet Count、预备拍、练习定时和自动停止。
- Reset 可在播放中取消旧排程并从第一拍重新开始。
- 本地预设保存、载入、删除、JSON 导入与导出。
- 专注练习模式、页面隐藏自动暂停和可用时的屏幕常亮。

### Chord

- 标准调弦下的常用 Major、Minor、7th、Sus/Add 和 Power Chord。
- 名称搜索和分类筛选。
- SVG 动态指板图，显示指法、空弦、闷弦和横按。
- 显示组成音及音程，并通过 Web Audio 播放自然扫弦。

### Jam Loop

- 4/4、3/4 拍号，4、8、12 小节和 40–220 BPM。
- Rock、Pop、Ballad、Shuffle 四种伴奏风格。
- 和弦进行编辑、整体升降半音、常用进行和本地自动保存。
- 吉他、贝斯、鼓三轨音量和静音控制。
- 鼓采样加载失败时自动切换到轻量合成鼓声，不阻断伴奏播放。

## PWA 与离线使用

项目包含 Web App Manifest、应用图标和原生 Service Worker：

- 首次在线成功打开后，会缓存应用外壳、三个模块分包、和弦数据和本地鼓采样。
- 后续可在断网或网络不稳定时继续使用已经缓存的功能。
- 支持的浏览器可将网站安装到桌面或手机主屏幕。
- 检测到新版本后，页面会显示“立即更新”，由用户确认后切换版本并刷新。
- 离线时页面会显示简洁状态提示。

离线能力依赖至少一次完整的在线加载。浏览器清除站点数据后，需要重新联网建立缓存。

## 质量加固

- 顶层 React Error Boundary 可处理懒加载分包或页面运行异常，并提供重新加载和返回节拍器入口。
- PWA 构建检查会验证 Manifest、图标、Service Worker、离线缓存和显式更新流程。
- GitHub Actions 在 Chromium、Firefox 和 WebKit 上运行端到端测试。
- Pages 部署完成后会自动检查首页、Manifest 和 Service Worker。
- 生产构建保留 JavaScript 与鼓采样体积预算。

## 本地运行

要求 Node.js 24 和 pnpm 11。

```bash
pnpm install
pnpm dev
```

Vite 会输出本地访问地址。第一次点击播放时浏览器才会创建或恢复音频上下文，这是浏览器自动播放策略要求的用户手势。

## 质量检查

```bash
# ESLint、Vitest、生产构建、PWA 产物和体积预算
pnpm check

# 首次运行 E2E 前安装三个浏览器
pnpm exec playwright install chromium firefox webkit

# 重新生产构建并运行 Chromium、Firefox、WebKit 测试
pnpm test:e2e

# 单独检查现有 dist 的 PWA 产物
pnpm check:pwa
```

生产构建输出到 `dist/`：

```bash
pnpm build
pnpm preview
```

如修改了 `public/icons/favicon.svg`，可以重新生成 PNG 图标：

```bash
pnpm generate:icons
```

## 操作快捷键

| 快捷键 | 功能 |
| --- | --- |
| `Space` | 开始、继续或暂停节拍器 |
| `↑` / `↓` | BPM 增加或减少 1 |
| `Shift` + `↑` / `↓` | BPM 增加或减少 5 |
| `T` | Tap Tempo 输入一次拍点 |
| `Esc` | 退出专注模式 |

输入框、下拉框或可编辑元素获得焦点时，全局快捷键不会拦截输入。离开 Metronome 模块后，节拍器快捷键不会继续触发。

## GitHub Pages 部署

仓库包含两条 GitHub Actions 工作流：

- `.github/workflows/ci.yml`：在 push 和 pull request 时运行 lint、单元测试、生产构建和三浏览器 Playwright。
- `.github/workflows/deploy.yml`：推送到 `master` 后构建并部署 `dist/`，随后检查线上首页、Manifest 和 Service Worker。

配置步骤：

1. 打开仓库 **Settings → Pages**。
2. 在 **Build and deployment** 中把 Source 设为 **GitHub Actions**。
3. 推送到 `master`，等待 `Deploy GitHub Pages` 及其部署冒烟检查完成。

Vite 和 Service Worker 生成脚本都会在 GitHub Actions 环境中读取 `GITHUB_REPOSITORY`，自动使用 `/<仓库名>/` 资源基础路径，避免 GitHub Pages 项目子路径下出现分包、音频或 PWA 资源 404。

## 数据与浏览器说明

- 节拍设置、预设和 Jam 编排保存在当前站点的 `localStorage`，不会跨浏览器、设备或域名自动同步。
- 清除站点数据会同时删除本地设置和离线缓存；重要节拍预设应通过 JSON 导出备份。
- 页面切到后台时节拍器会自动暂停，避免定时器降频后产生错误练习进度。
- Screen Wake Lock、Web Audio、Service Worker 和安装能力取决于浏览器支持与系统省电策略；不支持某项能力时，核心网页功能仍应保持可用。
- 项目不包含第三方追踪请求；鼓采样和所有应用资源均从当前 GitHub Pages 站点加载。

## 目录结构

```text
public/audio/       Jam 本地鼓采样
public/icons/       PWA、桌面和浏览器图标
src/audio/          音频缓冲、调度器与共享音频会话
src/chords/         和弦数据、指板图和扫弦试听
src/jam/            Jam 编排、存储、风格与音频引擎
src/pwa/            Service Worker 注册、更新与离线状态 UI
src/rhythm/         拍号、细分和 Tap Tempo 纯函数
src/training/       速度训练与 Quiet Count 状态机
src/storage/        预设校验和 localStorage 仓库
src/hooks/          React 与音频运行时编排
src/components/     共享 UI 组件与错误边界
scripts/            音频、图标、Service Worker 和构建检查脚本
playwright/         端到端与离线冒烟测试
.github/workflows/  CI 与 GitHub Pages 部署
```
