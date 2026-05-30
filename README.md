# @aurora-mcp/sdk

[![npm](https://img.shields.io/npm/v/@aurora-mcp/sdk?color=21958F)](https://www.npmjs.com/package/@aurora-mcp/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-2025--06--18-21958F)](https://modelcontextprotocol.io/)
[![Node](https://img.shields.io/badge/Node-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

SDK TypeScript oficial pra **Aurora MCP** — 16 especialistas de engenharia, catálogo curado de skills/MCPs/repos, RAG cross-project e playbooks privados.

Isomorfo: roda em Node 18+, browsers, Deno, Bun e Edge runtimes.

## Instalação

```bash
npm install @aurora-mcp/sdk
# ou
pnpm add @aurora-mcp/sdk
# ou
yarn add @aurora-mcp/sdk
```

## Quick start

### 1. Com API key (mais simples)

```ts
import { AuroraClient } from "@aurora-mcp/sdk"

const aurora = new AuroraClient({
  apiKey: process.env.AURORA_API_KEY!, // aurora_live_*
})

const result = await aurora.team.ask({
  task: "tem SQL injection nesse handler?",
  context: "Next.js 15, Prisma, server actions",
})

console.log(result.routerDecision.persona) // "Nora"
console.log(result.text)                    // markdown da resposta
```

### 2. Com OAuth (refresh automático)

```ts
import { AuroraClient } from "@aurora-mcp/sdk"
import * as oauth from "@aurora-mcp/sdk/oauth"

// Faça o flow completo usando os helpers
const metadata = await oauth.discoverMetadata("https://app.aurora-mcp.com")
const client = await oauth.registerClient(metadata, {
  clientName: "Meu App",
  redirectUris: ["myapp://callback"],
})
const { verifier, challenge } = await oauth.newPkcePair()
const state = oauth.newOauthState()

const url = oauth.buildAuthorizeUrl(metadata, {
  clientId: client.client_id,
  redirectUri: "myapp://callback",
  codeChallenge: challenge,
  state,
})
// abra `url` no browser do user, capture o `code` no callback
const tokens = await oauth.exchangeCode(metadata, {
  clientId: client.client_id,
  code: receivedCode,
  redirectUri: "myapp://callback",
  codeVerifier: verifier,
})

// agora use o AuroraClient com refresh automático
const aurora = new AuroraClient({
  oauth: {
    clientId: client.client_id,
    tokens,
    onTokensRefreshed: async (renewed) => {
      // persista os novos tokens (refresh rolou)
      await db.saveTokens(renewed)
    },
  },
})

await aurora.team.ask({ task: "explica esse código" })
```

### 3. Com provider customizado (controle total)

```ts
const aurora = new AuroraClient({
  authorization: async () => await myAuthService.getValidToken(),
})
```

## API principal

### `aurora.team`

```ts
// Entry-point único — Aurora escolhe a persona automaticamente
await aurora.team.ask({ task, context? })

// Chama persona específica
await aurora.team.asPersona("Nora", { task, context? })

// Lista as 16 personas
await aurora.team.list()
```

### `aurora.catalog`

```ts
const r = await aurora.catalog.search("long-term memory")
console.log(r.text) // markdown com resultados
```

### `aurora.knowledge` (RAG cross-project)

```ts
const r = await aurora.knowledge.query("rate limit upstash sliding window")
```

## Tratamento de erros

```ts
import { AuroraError } from "@aurora-mcp/sdk"

try {
  await aurora.team.ask({ task: "..." })
} catch (err) {
  if (err instanceof AuroraError) {
    switch (err.code) {
      case "missing_bearer":  // 401
      case "scope_denied":    // 403
      case "quota_exceeded":  // 429
      case "tool_error":      // tool retornou erro
      case "transport":       // HTTP non-2xx
      case "auth":            // OAuth flow falhou
    }
  }
}
```

## Subpaths

Para tree-shaking máximo, importa o que precisa:

```ts
import { McpClient } from "@aurora-mcp/sdk/mcp"
import { newPkcePair, exchangeCode } from "@aurora-mcp/sdk/oauth"
```

## Configuração

```ts
new AuroraClient(auth, {
  serverUrl: "https://app.aurora-mcp.com",     // default
  clientInfo: { name: "meu-app", version: "1.0" },
  fetch: customFetch,                          // pra ambientes sem fetch global
  signal: abortController.signal,              // cancelamento
})
```

## Roadmap

- **v0.2** — streaming de respostas (callback por chunk em vez de buffer único)
- **v0.3** — helpers de playbooks privados (`aurora.playbooks.list()`, `.create()`)
- **v0.4** — modo browser-friendly bundle (UMD + CDN)

## Sobre

- 🌐 [Aurora MCP](https://app.aurora-mcp.com)
- 🧠 [Servidor MCP (closed)](https://app.aurora-mcp.com/api/mcp)
- 🔌 [Plugin Claude Code](https://github.com/adeiltonpessini/aurora-marketplace)
- 🆚 [Extensão VS Code/Cursor/Windsurf](https://github.com/adeiltonpessini/aurora-vscode)

## Licença

[MIT](./LICENSE) © 2026 Aurora MCP
