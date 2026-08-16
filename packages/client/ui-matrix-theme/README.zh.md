# @deepseek-ai/dsh-client-ui-matrix-theme

[English](README.md) | 中文

Web GUI 的《黑客帝国》风格主题插件，浏览器侧。它向主题服务注册可选中的 `matrix` 主题（`colorScheme: 'dark'`，外加覆盖 ui-theme design-platform.css 所声明的完整深色 alias 层的 alias token 覆写，因此该主题生效期间任何表面都不会回落到默认的蓝调深色盘），并贡献其两个表面：常规设置区的开关行（`settings.general.item` id `matrix`，order 11，紧接外观行下方）与数字雨氛围背景层（`shell.backdrop` id `matrix-rain`，order 0，位于所有栏目下方）。两个表面共读同一个镜像 store，其唯一写入者是 apply 世界的 `theme/change` 监听器；开关的 inject 面将偏好写回 `ctx.theme.setTheme`，并记住被替换的偏好，关闭时恢复之（默认 `system`）。主题注册与所有订阅都挂在插件 fiber 上，因此 HMR 卸载会一并移除两个条目、主题与监听器。

背景层仅在解析后的活动主题为 `matrix` 时渲染：其引擎是对 https://github.com/zengrz/zengrz.github.io 数字雨的忠实移植（js/matrix3d.js 与 js/util.js），因此背景就是该页面的效果——不透明黑底加满高字符列（平假名/片假名/谚文，canvas 默认字体；白色标记字符为更小的衬线体），带逐帧字符更替、深度透明度、白色光标聚光、行进中的选中格高亮以及光标位移驱动的 3D 倾斜。它绝不覆盖内容：frame 的栏目叠在背景层之上，而本主题让基础背景保持半透明（rgba 黑）、侧边栏填充保持不透明，因此基础表面就是应用内容与雨之间的半透明层——背景层在主要表面处以减弱后的强度透出，侧边栏控件保持清晰可读，文字仍以不透明状态位于其上。条目内部叠在 canvas 之上的半透明遮罩会在表面透明的区域进一步压暗雨。在 `prefers-reduced-motion: reduce` 下该条目完全不渲染。与所有第三方主题 id 一样，`matrix` 是进程内扩展：内建设置 schema 只携带 `light`/`dark`/`system`，因此该选择在页面重载后不保留；当 matrix 处于活动状态时注销该注册，偏好会重置为 `system`（主题服务自身的保证）。

## Model Experience

无，因为主题服务管理的是浏览器偏好；本包没有任何内容进入模型请求。

#### KV Cache effect

无；本包既不组装也不发送任何 provider 请求。

## Known Limitations and Deferred Work

- **覆写集合在快照时点钉住深色 alias 层** — ui-theme 深色盘新增的 alias 在本包为它补充 matrix 值之前会被遗漏，这是所有第三方主题共有的完整性缺口。
- **matrix 偏好是进程本地的** — 页面重载即重置，因为第三方主题 id 不经过内建设置 schema；持久化第三方主题偏好需要 ui-theme 的扩展。
- **雨是纯装饰** — canvas 带 `aria-hidden`，不传达任何内容；减少动态效果环境下只有主题配色，没有动画。
