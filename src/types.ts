/**
 * Tipos públicos do SDK — exportados a partir do index principal.
 */

/** Resposta do MCP `tools/call` — shape JSON-RPC do servidor. */
export interface ToolResult {
  content: Array<ContentBlock>
  isError?: boolean
}

export interface ContentBlock {
  type: string
  text?: string
}

/** Metadados do servidor (devolvido no `initialize`). */
export interface ServerInfo {
  name: string
  version: string
}

/** Tipos de erro do servidor Aurora (mapeados a partir do JSON-RPC). */
export type AuroraErrorCode =
  | "missing_bearer"          // -32001
  | "scope_denied"            // -32003
  | "quota_exceeded"          // -32011
  | "tool_error"
  | "transport"
  | "auth"
  | "unknown"

export class AuroraError extends Error {
  constructor(
    public readonly code: AuroraErrorCode,
    message: string,
    public readonly status?: number,
    public readonly detail?: unknown,
  ) {
    super(message)
    this.name = "AuroraError"
  }
}

/** Args base aceitos por todas as personas e por `aurora_team`. */
export interface AskArgs {
  task: string
  context?: string
}

/** Match do router público do servidor (apenas pra interpretação local). */
export interface RouterDecision {
  persona?: string
  routerNote?: string
}

/** Resultado de busca no catálogo Aurora. */
export interface CatalogSearchResult {
  raw: ToolResult
  text: string
}
