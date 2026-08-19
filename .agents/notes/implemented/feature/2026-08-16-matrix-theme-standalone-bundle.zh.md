# Agent Note: The Matrix theme as an installable profile bundle

Status: implemented

[English](2026-08-16-matrix-theme-standalone-bundle.md) | 中文

## Problem

浏览器表面 profile 只能通过自行添加的安装途径获得 Matrix 主题：`dsh-web-app` 包不注册 `ui-matrix-theme` 浏览器花名册行，因此原装 web profile 不携带主题，自定义花名册不加装也得不到它。

## Decision

`@deepseek-ai/dsh-matrix-theme`（packages/bundle/matrix-theme）把主题发布为纯补丁 profile 包：其 `cordis.patch.yml` 只有一个 `insert`，加入挂载 `@deepseek-ai/dsh-client-ui-matrix-theme` 的 `ui-matrix-theme` 行，该插件被声明为本包的依赖，因此 profile 的 node 解析能为浏览器注册表找到插件（`dsh plugin --profile <name> add @deepseek-ai/dsh-matrix-theme`）。本包没有运行时 API；它遵循 dsh-base 包的形态（补丁字段、带“无运行时不变式”理由的 invariant 伴侣、补丁契约 spec）。

两条契约以文档记录而非绕过，因为补丁引擎没有 upsert：

- **insert 只追加、不去重。** 某 profile 的既有层已注册该行（重复添加，或自行注册该主题行的自定义花名册）会挂载重复的 loader 条目 id 并在加载时报错；本包的 README 与 spec 钉住该行为。
- **该行依赖 profile 的客户端栈。** 插件注册到同版本 ui-layout 声明的 `shell.backdrop` 槽，因此本包要求客户端栈至少为该版本，但不自行固定这些版本。

## Alternatives considered

**用随箱行代替本包** — 把主题带进每个原装 web profile 且无从退出；否决，因为主题是每个 profile 自己的呈现选择，随箱行会不加询问地把它带进每个 web 表面。

**覆写形式的补丁（不带 `insert` 的 `- id`）** — 对已有该行的层幂等，但在行缺失时静默跳过，而那正是本包存在的场景。

**用运行时胶水插件在启动时去重** — 补丁应用发生在任何插件运行之前，因此没有启动代码能移除重复行；loader 的重复 id 抛错是唯一的执行机制，README 契约是唯一的防护。

## Consequences

- 发布集合增加本包（插件包本来就在家族内）；两者在 dsh 家族发布下一起发布，原装 web profile 只有添加本包才能获得主题。
- `check-workspace-constraints` 为本包增加 `cordis.patch.yml` 发布额外项，与每个 profile 包携带的条目相同。
- 本包 spec 钉住补丁可解析、解析器依赖与 insert 不去重语义，使文档化的重复 id 契约不会悄然漂移。
