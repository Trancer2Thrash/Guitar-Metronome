# 六弦节拍器

面向吉他日常练习的移动优先网页节拍器。全部节拍计算、音频合成和预设数据都在浏览器本地完成，不需要后端服务。

## 功能

- 20–400 BPM，可直接输入、滑杆调整、±1/±5 调速或 Tap Tempo 测速。
- 1–12 拍的常用拍号编辑，支持 2/4/8/16 分母。
- 四分、八分、三连音、十六分和 Swing 细分。
- 每拍独立设置强拍、次强拍、弱拍或静音。
- 三种浏览器内合成点击音：经典滴答、木鱼和鼓棒。
- 速度训练：设置起点、目标、步长、变化间隔、目标行为和循环次数。
- Quiet Count：有声/静音小节循环，可在静音阶段隐藏视觉提示。
- 预备拍、练习定时、自动停止、页面隐藏自动暂停和可用时的屏幕常亮。
- 本地预设保存、载入、删除、JSON 导入与导出。
- 专注练习模式，以及 360 px 手机宽度到桌面端的响应式界面。

## 本地运行

要求 Node.js 24 和 pnpm 11。

```bash
pnpm install
pnpm dev
```

Vite 会输出本地访问地址。第一次点击“开始”时浏览器才会创建或恢复音频上下文，这是浏览器自动播放策略要求的用户手势。

## 质量检查

```bash
# ESLint、Vitest 和生产构建
pnpm check

# 首次运行 E2E 前安装 Chromium
pnpm exec playwright install chromium

# Playwright 浏览器测试
pnpm test:e2e
```

生产构建输出到 `dist/`：

```bash
pnpm build
pnpm preview
```

## 操作快捷键

| 快捷键 | 功能 |
| --- | --- |
| `Space` | 开始、继续或暂停 |
| `↑` / `↓` | BPM 增加或减少 1 |
| `Shift` + `↑` / `↓` | BPM 增加或减少 5 |
| `T` | Tap Tempo 输入一次拍点 |
| `Esc` | 退出专注模式 |

输入框、下拉框或可编辑元素获得焦点时，全局快捷键不会拦截输入。

## GitHub Pages 部署

仓库包含两条 GitHub Actions 工作流：

- `.github/workflows/ci.yml`：在 push 和 pull request 时运行 lint、单元测试、构建和 Playwright。
- `.github/workflows/deploy.yml`：推送到 `main` 后构建并部署 `dist/` 到 GitHub Pages，也支持手动触发。

配置步骤：

1. 将本项目推送到 GitHub，并确保默认发布分支为 `main`。
2. 打开仓库 **Settings → Pages**。
3. 在 **Build and deployment** 中把 Source 设为 **GitHub Actions**。
4. 推送到 `main`，等待 `Deploy GitHub Pages` 工作流完成。

Vite 会在 GitHub Actions 环境中读取 `GITHUB_REPOSITORY`，自动生成 `/<仓库名>/` 的资源基础路径，因此项目页和自定义域名之外的本地开发都无需手工改路径。

## 数据与浏览器说明

- 节拍设置和预设保存在当前站点的 `localStorage`，不会跨浏览器、设备或不同域名自动同步。
- 清除站点数据会删除本地设置；重要预设应通过“导出全部”备份为 JSON。
- 页面切到后台时会自动暂停，避免浏览器定时器降频后继续产生错误练习进度。
- Screen Wake Lock、Web Audio 和全屏相关能力取决于浏览器支持与系统省电策略；不支持时核心节拍功能仍可使用。
- 点击声音由 Web Audio API 在内存中生成，没有外链音频文件和第三方追踪请求。

## 目录结构

```text
src/audio/       音频缓冲、调度器与 worker
src/rhythm/      拍号、细分和 Tap Tempo 纯函数
src/training/    速度训练与 Quiet Count 状态机
src/storage/     预设校验和 localStorage 仓库
src/hooks/       React 与音频运行时编排
src/components/  UI 组件
playwright/      端到端测试
.github/workflows/ CI 与 Pages 部署
```
