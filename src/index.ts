/**
 * @aurora-mcp/sdk — SDK TypeScript oficial pro Aurora MCP.
 *
 * Quick start:
 *
 *   import { AuroraClient } from "@aurora-mcp/sdk"
 *
 *   const aurora = new AuroraClient({ apiKey: process.env.AURORA_API_KEY! })
 *   const result = await aurora.team.ask({ task: "tem SQL injection aqui?" })
 *   console.log(result.text)
 *   console.log(result.routerDecision.persona) // "Nora"
 *
 * Subpaths:
 *   "@aurora-mcp/sdk/mcp"   → cliente MCP low-level
 *   "@aurora-mcp/sdk/oauth" → blocos OAuth (DCR + PKCE + exchange + refresh)
 */

export { AuroraClient } from "./client.js"
export type {
  AuroraAuthMethod,
  ApiKeyAuth,
  OAuthAuth,
  CustomAuth,
  AuroraClientOptions,
} from "./client.js"

export { AuroraError } from "./types.js"
export type {
  AuroraErrorCode,
  ToolResult,
  ContentBlock,
  ServerInfo,
  AskArgs,
  RouterDecision,
  CatalogSearchResult,
} from "./types.js"

export type { AskResult } from "./modules/team.js"
