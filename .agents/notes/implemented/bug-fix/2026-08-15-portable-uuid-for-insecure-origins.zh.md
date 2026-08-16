# Agent Note: Portable UUID generation for insecure-origin Web serving

Status: implemented

[English](2026-08-15-portable-uuid-for-insecure-origins.md) | 中文

## Problem

Wire 层代码用 `crypto.randomUUID` 铸造 RPC id，而浏览器只在安全上下文中暴露该 API。回环服务（`localhost` 属于安全上下文）掩盖了这个缺口；当 Web GUI 第一次通过明文 HTTP 在 LAN 接口字面量上向浏览器提供服务时（`dsh web --host <interface-ip>`，即本仓库新增的具体接口绑定），该浏览器的每一个 RPC 都会抛出 `crypto.randomUUID is not a function`——可见症状是工作区「Select Workspace Directory」窗口失效，因为目录浏览对话框要通过 RPC 列出文件夹。ui-conversation 里的附件草稿 id 也有同样的潜在失败。

## Decision

`@deepseek-ai/dsh-uuid`（packages/util/uuid）拥有唯一一个可移植原语 `randomUuid()`：有 `crypto.randomUUID` 时优先使用，否则从 `crypto.getRandomValues` 构建 RFC 4122 v4 格式，并在格式化时写入 version 与 variant 半字节。`getRandomValues` 在任何上下文的浏览器中都存在，且覆盖受支持的 Node 范围，因此对该 harness 服务的环境而言，回退路径是完备的。

消费方都通过该包铸造 id：API fetch 客户端的 `mintRpcId`（`dsh-host-apiproxy`）、附件草稿 id（`dsh-client-ui-conversation`），以及 connection 客户端自身的 id 铸造——后者包内的 `random-uuid.ts` 被并入 `dsh-uuid`，而不是保留第二份拷贝。该包是库而非服务：没有 `ctx`、没有状态、没有事件。

## Alternatives considered

**在每个消费方里放一个包内回退** — 三份相同的 v4 格式化；单一包为「UUID 铸造不得依赖安全上下文 API」这一事实保留一个经过测试的家，并给未来的消费方一个统一入口。

**始终使用 `crypto.getRandomValues`** — connection 包原有的 helper 正是这么做的，且处处可用，但它无缘无故跳过了操作系统支持的 `randomUUID` 路径；优先使用后者只需一次特性检查，并让常见路径留在平台 API 上。

**第三方 uuid 依赖** — 这个 30 行的原语自己能覆盖的内容它一行都删不掉，反而给 wire 层增加不必要的包体积。

## Consequences

- RPC id 铸造、附件草稿 id 与 connection fixture id 在安全与非安全浏览器上下文中行为一致；明文 HTTP 的 LAN/Tailscale 服务对浏览器完全可用。
- connection 包删除了私有 helper；`dsh-uuid` 是唯一归属，记录在 module graph 中。
- 客户端 bundle 预设从 tsdown 已废弃的 `external`/`noExternal` 对迁移到 `deps.neverBundle`/`deps.alwaysBundle`，使不在模块表中的 peer（如 `dsh-uuid`）在包级与根级两条构建路径上都能确定性地内联。
- 单元测试用确定性的 `getRandomValues` 填充逐字节钉住 v4 格式化约定。
