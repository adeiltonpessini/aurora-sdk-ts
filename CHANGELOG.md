# Changelog

## 0.1.0 — 2026-05-30

Primeira release pública.

### Adicionado
- `AuroraClient` — entry-point high-level com 3 modos de auth (apiKey, OAuth com refresh automático, custom provider)
- Módulos `aurora.team`, `aurora.catalog`, `aurora.knowledge`
- Subpath `@aurora-mcp/sdk/mcp` — cliente MCP low-level (JSON-RPC + Streamable HTTP + SSE)
- Subpath `@aurora-mcp/sdk/oauth` — DCR + PKCE + flow OAuth 2.1 isomorfo
- Detecção de erro tipada (`AuroraError` com `code: missing_bearer | scope_denied | quota_exceeded | tool_error | transport | auth`)
- Build dual (ESM + CJS) com types via tsup
- Tests com vitest (matrix Node 18/20/22 × Ubuntu/Windows/macOS)
- CI: typecheck + test + build em todo push, publish automático ao npm em tag `v*`
