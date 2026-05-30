import { McpClient, type AuthorizationProvider } from "./mcp/client.js"
import { CatalogModule } from "./modules/catalog.js"
import { KnowledgeModule } from "./modules/knowledge.js"
import { TeamModule } from "./modules/team.js"
import {
  discoverMetadata,
  refreshTokens,
  type OAuthTokens,
  type ServerMetadata,
} from "./oauth/flow.js"
import { AuroraError, type ServerInfo } from "./types.js"

/**
 * AuroraClient — entry-point high-level do SDK.
 *
 * Modos de autenticação:
 *
 *   // 1. API key estática (mais simples)
 *   const aurora = new AuroraClient({
 *     apiKey: process.env.AURORA_API_KEY!
 *   })
 *
 *   // 2. OAuth com tokens (auto-refresh transparente)
 *   const aurora = new AuroraClient({
 *     oauth: {
 *       clientId: "oac_...",
 *       tokens: { access_token, refresh_token, expires_in, ... },
 *       onTokensRefreshed: async (t) => { await saveTokens(t) }
 *     }
 *   })
 *
 *   // 3. Provider customizado (controle total)
 *   const aurora = new AuroraClient({
 *     authorization: async () => (await myAuthService.getBearer()),
 *   })
 *
 * Uso:
 *
 *   const result = await aurora.team.ask({ task: "..." })
 *   const results = await aurora.catalog.search("long-term memory")
 */

export interface ApiKeyAuth {
  apiKey: string
}

export interface OAuthAuth {
  oauth: {
    clientId: string
    tokens: OAuthTokens
    onTokensRefreshed?: (tokens: OAuthTokens) => void | Promise<void>
  }
}

export interface CustomAuth {
  authorization: AuthorizationProvider
}

export type AuroraAuthMethod = ApiKeyAuth | OAuthAuth | CustomAuth

export interface AuroraClientOptions {
  /** URL base do Aurora MCP (default: https://app.aurora-mcp.com) */
  serverUrl?: string
  /** clientInfo enviado no initialize */
  clientInfo?: { name: string; version: string }
  /** Override de fetch */
  fetch?: typeof fetch
  /** AbortSignal */
  signal?: AbortSignal
}

export class AuroraClient {
  readonly serverUrl: string
  readonly mcp: McpClient
  readonly team: TeamModule
  readonly catalog: CatalogModule
  readonly knowledge: KnowledgeModule

  private oauthState?: {
    clientId: string
    tokens: OAuthTokens
    expiresAt: number
    onRefresh?: (tokens: OAuthTokens) => void | Promise<void>
    metadataPromise?: Promise<ServerMetadata>
  }

  constructor(auth: AuroraAuthMethod, options: AuroraClientOptions = {}) {
    this.serverUrl = (options.serverUrl ?? "https://app.aurora-mcp.com").replace(/\/$/, "")

    const authorization = this.buildAuthProvider(auth)

    this.mcp = new McpClient({
      endpoint: `${this.serverUrl}/api/mcp`,
      authorization,
      clientInfo: options.clientInfo,
      fetch: options.fetch,
      signal: options.signal,
    })
    this.team = new TeamModule(this.mcp)
    this.catalog = new CatalogModule(this.mcp)
    this.knowledge = new KnowledgeModule(this.mcp)
  }

  /** Inicializa explicitamente (opcional — `initialize` é lazy no primeiro call). */
  async connect(): Promise<ServerInfo> {
    return await this.mcp.initialize()
  }

  /** Acesso direto ao OAuth state pra inspeção. */
  getOAuthTokens(): OAuthTokens | null {
    return this.oauthState?.tokens ?? null
  }

  private buildAuthProvider(auth: AuroraAuthMethod): AuthorizationProvider {
    if ("apiKey" in auth) {
      return () => auth.apiKey
    }
    if ("oauth" in auth) {
      const { clientId, tokens, onTokensRefreshed } = auth.oauth
      this.oauthState = {
        clientId,
        tokens,
        expiresAt: Date.now() + tokens.expires_in * 1000,
        onRefresh: onTokensRefreshed,
      }
      return async () => await this.getValidAccessToken()
    }
    if ("authorization" in auth) {
      return auth.authorization
    }
    throw new AuroraError("auth", "Aurora SDK: forneça apiKey, oauth ou authorization.")
  }

  /** Devolve um access_token válido, fazendo refresh proativo se faltam <60s. */
  private async getValidAccessToken(): Promise<string> {
    if (!this.oauthState) {
      throw new AuroraError("auth", "Aurora SDK: estado OAuth ausente.")
    }
    if (this.oauthState.expiresAt - Date.now() > 60_000) {
      return this.oauthState.tokens.access_token
    }
    // Refresh
    if (!this.oauthState.metadataPromise) {
      this.oauthState.metadataPromise = discoverMetadata(this.serverUrl)
    }
    const metadata = await this.oauthState.metadataPromise
    const renewed = await refreshTokens(
      metadata,
      this.oauthState.tokens.refresh_token,
      this.oauthState.clientId,
    )
    this.oauthState.tokens = renewed
    this.oauthState.expiresAt = Date.now() + renewed.expires_in * 1000
    if (this.oauthState.onRefresh) {
      await this.oauthState.onRefresh(renewed)
    }
    return renewed.access_token
  }
}
