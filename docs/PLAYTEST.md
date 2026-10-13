# 试玩准备与部署状态

## 当前状态

2026 年 10 月 13 日核验，**尚无面向所有访客开放且经本轮验证的在线试玩入口**。

原有 Sites 站点仍采用受限访问策略。GitHub 仓库公开可见不代表 Sites 试玩站同时开放。本次保留现有站点的访问范围，不在 README 或 About 填入受限地址或预计部署地址。

游戏的交互、Canvas 渲染、声音和战斗逻辑都在浏览器中运行，没有服务端游戏 API、数据库或账号依赖。原来的 vinext 构建包含 Worker 服务端入口，不能直接当作 GitHub Pages 静态目录上传。新增的独立 Vite 入口复用 `app/page.tsx` 和相同素材，输出可静态托管的网页，未更改关卡、攻击数值或敌人行为。

## 公开试玩前需要补齐

1. **素材条件**。明确第三方角色、精灵、美术与其他未核实图片可用于公开网页展示和传播的授权依据，或替换为适用许可的素材。已有音频 CC0 记录不能代替这些美术授权，详见 [素材清单](../ASSET_CREDITS.md)。
2. **托管启用**。推荐沿用当前 GitHub 仓库的 Pages，静态产物已适配项目子路径，不需要新增付费托管账户。[GitHub 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)确认公开仓库可使用 GitHub Free 的 Pages。素材条件解决后，再启用仓库 Pages 并部署；若选择其他服务，则还需对应账户和目标站点权限。本次核对设置页，Pages 显示为未启用，未修改该设置或 Sites 的访问策略。
3. **发布后验收**。在未登录的访客环境中打开实际返回的地址，检查素材与声音加载、键盘输入、角色切换和暂停。只有通过这一步，才将该地址加入 README 和 About。

## 本地静态试玩

安装依赖后运行以下命令。

```sh
pnpm build:demo
pnpm preview:demo
```

默认预览地址为 `http://localhost:4173/wonders-ex-fan-game/`。若端口占用，以终端实际输出为准。浏览器通过本地 HTTP 服务加载模块和素材，不支持直接双击 `index.html` 作为 `file://` 页面试玩。

产物在 `dist-demo/`。默认资源前缀为 `/wonders-ex-fan-game/`，适用于 GitHub Pages 项目站点。`dist-demo/` 约 19 MB，含游戏 JS、CSS 和现有图片/音频，以及素材说明与 `.nojekyll`。运行时不加载外部字体，不需要云服务密钥。

若部署到独立域名根目录，在类 Unix 终端使用以下命令。

```sh
DEMO_BASE_PATH=/ pnpm build:demo
DEMO_BASE_PATH=/ pnpm preview:demo
```

构建与预览须使用一致的基础路径。原来的 `pnpm dev`、`pnpm build`、`pnpm start` 仍保留。

[Vite 官方部署指南](https://vite.dev/guide/static-deploy#github-pages)说明了项目子路径的 `base` 配置及 Pages 构建流程。`preview:demo` 仅用于本地验收，不是生产服务器。

## 手动构建流程

[Build demo artifact](../.github/workflows/demo-artifact.yml) 仅由维护者在 GitHub Actions 中手动运行。它安装锁定依赖、检查 TypeScript、构建静态包并上传保留 14 天的 artifact。

该流程没有推送触发器，不申请 Pages 写权限，不部署站点。Actions 下载包通常要求登录 GitHub，因此不能把 artifact 下载链接当成免安装的公开试玩入口。该流程配置已准备，线上执行情况以仓库 Actions 的实际记录为准。

素材条件解决后，可把同一静态产物交给 Pages 部署流程；启用前仍需核对仓库设置和当前 GitHub 服务条件。

## 验证记录

本次在 macOS 的本地浏览器进行验证。

- 原有应用生产构建通过，TypeScript 检查通过。
- 静态包的项目子路径与根路径构建均通过。
- 项目子路径下 58 个产物文件通过 HTTP 加载核对；53 个原有公共资源文件与源文件字节一致。
- 静态版页面完成初始化，图片未出现加载失败提示；键盘技能使法力从 100 降至 66，Q 可切到 Samara，Esc 可打开暂停菜单。
- 浏览器测试覆盖移动和跳跃输入，检查角色切换、暂停与继续；未声称本轮完整打通四关。
- 第一关截图和第四关战斗录制来自开发预览中的实际游戏，使用现有 `level` / `arena` 参数定位场景，未修改生命、伤害或敌人状态。
- 原有 lint 问题仍在，主要涉及 UI 模板规则与按钮图片检查。未借此扩大到玩法重构。

本地 HTTP 与构建检查证明了静态托管可行，不等于公开部署已经完成。
