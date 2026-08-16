# dsh-uuid

[English](README.md) | 中文

只包含一个纯函数的零依赖库：`randomUuid()`，生成 RFC 4122 v4 UUID 字符串。它优先使用 `crypto.randomUUID`；在该 API 缺失的环境中（非安全浏览器上下文——明文 HTTP 服务，例如 LAN 或 Tailscale 绑定——暴露 `crypto.getRandomValues` 但不暴露 `randomUUID`），则从 `getRandomValues` 构建同样的 v4 格式，并在格式化时写入 version 与 variant 半字节。它是库而非服务：没有 `ctx`、不注册任何东西、不持有状态。Wire 层通过它铸造 RPC id 与草稿句柄，使身份生成永远不依赖安全上下文 API。

## Model Experience

无，因为本包只生成身份字符串；面向模型的消费方拥有任何被呈现的用途。

#### KV Cache effect

无；本包既不组装也不发送 provider 请求。
