/**
 * OAuth 2.1 + Dynamic Client Registration (RFC 7591) — flow isomorfo.
 *
 * O SDK não decide COMO abrir o browser/captar o redirect — isso depende
 * do runtime (Node CLI faria HTTP server local; browser usa popup;
 * Electron usa BrowserWindow; React Native usa Linking; etc).
 *
 * Em vez disso expõe os blocos:
 *   - discoverMetadata(serverUrl)
 *   - registerClient(metadata, redirectUri)
 *   - buildAuthorizeUrl(metadata, params)
 *   - exchangeCode(metadata, code, ...)
 *   - refreshTokens(metadata, refreshToken, clientId)
 *
 * O caller orquestra: gerar PKCE, abrir browser, capturar code, trocar
 * por token.
 */

import { AuroraError } from "../types.js"

export interface ServerMetadata {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  registration_endpoint: string
  response_types_supported?: string[]
  grant_types_supported?: string[]
  code_challenge_methods_supported?: string[]
  scopes_supported?: string[]
}

export interface RegisteredClient {
  client_id: string
  client_id_issued_at: number
  client_name: string
  redirect_uris: string[]
  grant_types: string[]
  scope: string
}

export interface OAuthTokens {
  access_token: string
  refresh_token: string
  expires_in: number // segundos
  token_type: "Bearer"
  scope: string
}

const FETCH = () => globalThis.fetch

function assertFetch(): typeof fetch {
  const f = FETCH()
  if (!f) {
    throw new AuroraError(
      "transport",
      "Aurora SDK: fetch ausente. Forneça `globalThis.fetch` ou use Node 18+.",
    )
  }
  return f
}

export async function discoverMetadata(serverUrl: string): Promise<ServerMetadata> {
  const base = serverUrl.replace(/\/$/, "")
  const resp = await assertFetch()(`${base}/.well-known/oauth-authorization-server`)
  if (!resp.ok) {
    throw new AuroraError(
      "transport",
      `Aurora OAuth: discovery falhou (${resp.status})`,
      resp.status,
    )
  }
  return (await resp.json()) as ServerMetadata
}

export interface RegisterParams {
  clientName: string
  redirectUris: string[]
  scope?: string
}

export async function registerClient(
  metadata: ServerMetadata,
  params: RegisterParams,
): Promise<RegisteredClient> {
  const resp = await assertFetch()(metadata.registration_endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_name: params.clientName,
      redirect_uris: params.redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: params.scope ?? "mcp:use",
    }),
  })
  if (!resp.ok) {
    const detail = await safeText(resp)
    throw new AuroraError(
      "transport",
      `Aurora OAuth: registro falhou (${resp.status}): ${detail}`,
      resp.status,
    )
  }
  return (await resp.json()) as RegisteredClient
}

export interface AuthorizeUrlParams {
  clientId: string
  redirectUri: string
  codeChallenge: string
  state: string
  scope?: string
}

export function buildAuthorizeUrl(
  metadata: ServerMetadata,
  params: AuthorizeUrlParams,
): string {
  const url = new URL(metadata.authorization_endpoint)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("client_id", params.clientId)
  url.searchParams.set("redirect_uri", params.redirectUri)
  url.searchParams.set("scope", params.scope ?? "mcp:use")
  url.searchParams.set("state", params.state)
  url.searchParams.set("code_challenge", params.codeChallenge)
  url.searchParams.set("code_challenge_method", "S256")
  return url.toString()
}

export interface ExchangeCodeParams {
  clientId: string
  code: string
  redirectUri: string
  codeVerifier: string
}

export async function exchangeCode(
  metadata: ServerMetadata,
  params: ExchangeCodeParams,
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    code_verifier: params.codeVerifier,
  })
  const resp = await assertFetch()(metadata.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })
  if (!resp.ok) {
    const detail = await safeText(resp)
    throw new AuroraError(
      "auth",
      `Aurora OAuth: troca de code falhou (${resp.status}): ${detail}`,
      resp.status,
    )
  }
  return (await resp.json()) as OAuthTokens
}

export async function refreshTokens(
  metadata: ServerMetadata,
  refreshToken: string,
  clientId: string,
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  })
  const resp = await assertFetch()(metadata.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })
  if (!resp.ok) {
    throw new AuroraError("auth", `Aurora OAuth: refresh falhou (${resp.status})`, resp.status)
  }
  return (await resp.json()) as OAuthTokens
}

async function safeText(resp: Response): Promise<string> {
  try {
    return (await resp.text()).slice(0, 200)
  } catch {
    return "<no body>"
  }
}
