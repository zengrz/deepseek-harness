# `@deepseek-ai/dsh-matrix-theme`

[English](README.md) | 中文

《黑客帝国》风格主题的可安装 profile 插件：其 [`cordis.patch.yml`](cordis.patch.yml) 插入一条浏览器花名册行——`ui-matrix-theme` 挂载 [`@deepseek-ai/dsh-client-ui-matrix-theme`](../../client/ui-matrix-theme/README.md)——让 profile 获得可选择的 `matrix` 主题、常规设置区的开关以及数字雨背景层。[`dsh-web-app`](../web-app/README.md) 包不注册该主题；本包是安装路径。用 `dsh plugin --profile <name> add @deepseek-ai/dsh-matrix-theme` 安装；本包没有运行时 API，profile 组合器通过 `dsh.bundle.patch` 清单字段解析补丁，从不经过代码。

insert 形式只追加、不去重：把它加到已由其他层注册 `ui-matrix-theme` 的 profile 会在加载时报 `duplicate loader entry id: ui-matrix-theme`，因此不能重复添加本包，也不能与自行注册该行的自定义花名册叠加。行对应的插件包是本包的依赖，因此 profile 的 node 解析能为浏览器注册表找到它；插件自身的服务注入（theme、locale、slots、settings、layout）来自 profile 的客户端栈。

## Model Experience

间接地经由插入的行：本包自身不选择任何模型可见内容；主题包管理的是浏览器侧偏好，不贡献任何面向模型的文本。

#### KV Cache effect

无直接影响；主题包不组装任何 provider 请求。

## Known Limitations and Deferred Work

- **补丁引擎没有 upsert** — `insert` 只追加，而裸 `id` 覆写会跳过不存在的行，因此没有任何一种补丁形式能既添加行又容忍行已存在；于是本包以文档记录而非绕过已由其他层注册该行时的重复 id 失败。
- **主题依赖 profile 的客户端栈** — 插件注册到同版本 ui-layout 声明的 `shell.backdrop` 槽，因此本包要求客户端栈至少为该版本；它自身不固定这些版本。
