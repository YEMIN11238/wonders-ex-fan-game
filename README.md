# WONDERS EX Fan Game

一个由游戏爱好者制作的非官方 2D 横版动作冒险原型。项目尝试把喜欢的像素角色和美术呈现为可以操作、战斗和探索的游戏，并加入不同作品的角色实验。

这不是原版游戏、官方移植版或经授权的重制版，也不与原作者、发行商或其他角色权利人存在隶属关系。项目以学习和交流为目的；公开仓库不代表其中所有素材获得了再分发或商用许可。请先阅读 [素材来源与权利说明](ASSET_CREDITS.md)。

## 当前内容

- 四个连续关卡：竹影古祠、秋暮村、暮色旧城、幽冥废殿。
- 小怪遭遇战、关底 Boss、攻击预警与技能动画。
- Samara、豪鬼、贝吉特角色切换，以及贝吉特合体开场和多种技能。
- 二段跳、平台下穿、生命与法力、血瓶掉落。
- 地图背景音乐、分层攻击音效、暂停菜单与音量设置。
- 击败关底 Boss 后向右离开场景，以淡出方式进入下一关。

这是持续迭代中的原型，尚不等同于完整商业游戏；平衡、碰撞和动画仍可继续完善。

## 本地运行

需要 Node.js 22.13 或更高版本，以及 pnpm。推荐使用桌面浏览器和键盘。

```sh
git clone https://github.com/YEMIN11238/wonders-ex-fan-game.git
cd wonders-ex-fan-game
pnpm install --frozen-lockfile
pnpm dev
```

打开终端显示的本地地址。第一次按键或点击后浏览器才允许播放声音，这是浏览器的自动播放限制。

```sh
# 生产构建
pnpm build

# 本地运行构建结果
pnpm start

# 静态检查
pnpm lint
```

本发布副本不依赖原项目的 Sites 托管标识、云数据库或账户密钥。运行时使用 React、TypeScript、Canvas 2D、vinext/Vite 和本地 Cloudflare 开发运行时。源码仓库本身不等于 GitHub Pages 在线部署。

首发版本已通过生产构建与 `pnpm exec tsc --noEmit`。`pnpm lint` 仍有现有 UI 模板组件的无障碍、类型规范检查及游戏按钮图片检查问题，尚未全部清理。

## 操作

| 按键 | 功能 |
| --- | --- |
| A / D 或 ← / → | 移动 |
| Space / W / ↑ | 跳跃，在空中再次按下可二段跳 |
| S / ↓ | 下蹲或下穿平台 |
| Q | 切换角色 |
| Esc | 暂停、设置；贝吉特技能列表 |
| J / K / L / I | 当前角色的基础攻击或近战技能 |

贝吉特额外技能：U 气弹、O 连发气弹、P 螺旋气功弹、H 龟派气功、G 终极龟派气功、Y 空中气波、F 瞬间移动、B 爆气、R 赛亚爆发、T 蓄气。技能受法力和冷却时间限制。

## 项目结构

- `app/page.tsx`：游戏界面、输入和主循环。
- `lib/`：关卡、战斗、角色、动画、音频与特效逻辑。
- `public/assets/`：图片、精灵表和音频资源。
- `public/assets/audio/CREDITS.txt`：音频作者、来源和许可记录。

## 来源与许可

WONDERS EX 美术参考来自 [injae Byun 的作品集](https://www.behance.net/gallery/3885181/WONDERS-EX-_-game-2D-Game-concept-art-2009-Pixel-Art)。完整分类及未确认事项见 [ASSET_CREDITS.md](ASSET_CREDITS.md)。

目前未为整个仓库授予统一的开源许可证，尤其不将第三方美术、角色或商标标为 MIT、CC0 或其他自由许可。音频按各自原有许可使用；依赖包保留各自许可证。非营利、署名或公开展示均不能替代权利人的授权。

如果你是相关素材的作者或权利人，或能补充准确来源，请通过仓库 Issues 联系维护者。
