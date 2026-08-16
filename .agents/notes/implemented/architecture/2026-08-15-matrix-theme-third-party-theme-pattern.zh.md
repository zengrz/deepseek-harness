# Agent Note: The Matrix theme as the shipped third-party-theme pattern

Status: implemented

[English](2026-08-15-matrix-theme-third-party-theme-pattern.md) | 中文

## Problem

主题服务接受第三方主题注册，但在 Matrix 主题之前没有任何已发布的插件使用过该扩展点：第三方主题的 token 表面、选择 UI、氛围呈现与偏好生命周期都没有先例，而内建的外观行刻意只列出 `light`/`dark`/`system`。

## Decision

`@deepseek-ai/dsh-client-ui-matrix-theme` 发布《黑客帝国》风格主题，同时充当第三方主题贡献的模板：

- 它注册 `matrix`（`colorScheme: 'dark'`），并为 ui-theme design-platform.css 中深色盘声明的每一个 alias 提供 token 覆写，因此主题生效期间任何表面都不会回落到默认的蓝调深色盘。
- 主题的选择表面属于主题自己的包，绝不进入外观行：插件注册自己的 `settings.general.item` 行（id `matrix`，order 11，紧接外观行下方），带开关切换，把 ui-theme “功能拥有自己的设置表面”的规则应用到第三方主题上。
- 氛围呈现走本次主题工作为 ui-layout 新增的 `shell.backdrop` 槽：一个位于所有栏目下方、点击穿透的整帧层——frame 通过 `isolation` 隔离堆叠上下文、背景层带 `z-index: -1`，因为仅靠 DOM 顺序无法保证它在栏目之下（绝对定位的条目子元素绘制在静态栏目背景之后，否则会盖住侧边栏）。背景层就是 https://github.com/zengrz/zengrz.github.io 的数字雨：`rain-engine.ts` 是对该页面实时效果的忠实移植（js/matrix3d.js 与 js/util.js）——不透明黑底加满高字符列（平假名/片假名/谚文，canvas 默认字体；白色标记字符为更小衬线体），带逐帧字符更替、深度透明度、白色光标聚光、行进中的选中格高亮以及光标位移驱动的 3D 倾斜（上游代码把下落的 `DropText` 字符注释掉了，不在其实时效果内）。先前的下落式雨引擎已被该移植替代。matrix 主题让基础背景保持半透明（rgba 黑）、侧边栏填充保持不透明，因此基础表面就是应用内容与背景层之间的半透明层、侧边栏控件保持清晰可读，而条目内部叠在 canvas 之上的半透明遮罩会在表面透明的区域压暗效果。该条目在 `prefers-reduced-motion: reduce` 下完全不渲染。
- 两个表面共读一个 `theme/change` 的镜像 store（apply 世界的监听器是唯一写入者）；开关记住被替换的偏好并在关闭时恢复，当外部写入者直接启用 matrix 时回落到 `system`。
- 主题偏好保持进程本地：第三方 id 不经过内建设置 schema（该边界由 [host-backed preferences note](../bug-fix/2026-08-06-host-backed-web-preferences.md) 拥有），因此重载会重置选择；matrix 处于活动状态时注销注册会把偏好重置为 `system`（主题服务的保证）。

## Alternatives considered

**在外观行里加一个 matrix 方块** — 扩展内建行会让 ui-theme 枚举第三方主题；三个方块是产品拥有的列表，而每个功能自己的设置行让扩展点保持可叠加，无需改动主题包。

**把雨放在栏目上方的 `shell.overlay`** — 最初的摆放让字符画在文字之上，干扰阅读；在那里把 canvas 调暗也无法把两层分开。通过新增的背景层槽把雨移到栏目下方，配合半透明基础表面，得到所需的“文字之上、半透明层居中、雨在底”的分层，且无需改动其他表面的逐处透明度。

**文档级背景 canvas** — 挂在 body 上的 canvas 位于 frame 之后，会被不透明的 frame 背景挡住，而且绕开了 slot 体系；背景层槽让组合留在 ui-layout 声明的 frame 结构内。

**持久化 matrix 偏好** — 内建设置 schema 只携带内建的偏好联合类型；为一个主题放宽它会让第三方 id 变成一等持久化对象，附带主题系统尚未接受的迁移成本。

## Consequences

- ui-layout 新增了通用的 `shell.backdrop` 扩展点（栏目之下、frame 背景之上，由 frame 的隔离堆叠上下文加背景层的负 z-index 钉住）；未来的氛围背景条目共用它，其可见性取决于活动主题的表面透明度。
- token 覆写集合在快照时点钉住深色 alias 层：ui-theme 深色盘新增的 alias 在本包更新之前会被遗漏——这是所有第三方主题共有的完整性缺口，记录在包 README 的 limitations 中。
- matrix 主题的基础表面是半透明的，背景层条目以减弱后的强度透出；不透明表面（卡片、对话框、弹出层）照旧挡住背景层。
- 减少动态效果的环境只有主题配色、没有动画；雨不传达任何内容（`aria-hidden`）。
- 未来的主题贡献照搬本包的形态：注册、一个设置行、一个可选的环境背景层条目、一个进程本地的偏好。
