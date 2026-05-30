/**
 * Aurora OAuth — entry point do subpath `@aurora-mcp/sdk/oauth`.
 *
 * Re-exporta os blocos isomorfos do flow OAuth 2.1 + DCR (RFC 7591) +
 * PKCE (RFC 7636) — pra apps que querem orquestrar o próprio fluxo
 * (CLI Node, Electron, browser SPA, etc).
 */

export { newPkcePair, newOauthState, type PkcePair } from "./pkce.js"
export {
  discoverMetadata,
  registerClient,
  buildAuthorizeUrl,
  exchangeCode,
  refreshTokens,
  type ServerMetadata,
  type RegisteredClient,
  type OAuthTokens,
  type RegisterParams,
  type AuthorizeUrlParams,
  type ExchangeCodeParams,
} from "./flow.js"
