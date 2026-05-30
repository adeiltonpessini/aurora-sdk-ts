/**
 * Cliente MCP — Streamable HTTP (spec 2025-06-18).
 *
 * Implementação minimal sem `@modelcontextprotocol/sdk` como peer dep:
 *   - Faz `initialize` no primeiro call
 *   - POST JSON-RPC com Accept: application/json, text/event-stream
 *   - Parseia SSE incremental (event: message + data: <json>)
 *   - Aceita um Authorization provider funcional, permitindo OAuth
 *     refresh transparente do caller
 */

import { AuroraError, type ServerInfo, type ToolResult } from "../types.js"

export type AuthorizationProvider = () => Promise<string | null> | string | null

export interface McpClientOptions {
  /** URL completa do endpoint MCP, ex: https://app.aurora-mcp.com/api/mcp */
  endpoint: string
  /**
   * Função que devolve o Bearer atual. Chamada a cada request — permite o
   * caller fazer refresh OAuth transparente entre calls.
   */
  authorization: AuthorizationProvider
  /** clientInfo enviado no initialize. */
  clientInfo?: { name: string; version: string }
  /** AbortSignal opcional pra cancelamento. */
  signal?: AbortSignal
  /** Override de fetch — útil pra tests ou ambientes sem fetch global. */
  fetch?: typeof fetch
}

export class McpClient {
  private rpcId = 0
  private initialized = false
  private readonly fetchImpl: typeof fetch
  private readonly clientInfo: { name: string; version: string }

  constructor(private readonly opts: McpClientOptions) {
    this.fetchImpl = opts.fetch ?? globalThis.fetch
    if (!this.fetchImpl) {
      throw new AuroraError(
        "transport",
        "fetch não está disponível neste runtime. Forneça `fetch` em McpClientOptions.",
      )
    }
    this.clientInfo = opts.clientInfo ?? { name: "@aurora-mcp/sdk", version: "0.1.0" }
  }

  async initialize(): Promise<ServerInfo> {
    const result = (await this.rpc("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: this.clientInfo,
    })) as { serverInfo: ServerInfo }
    this.initialized = true
    return result.serverInfo
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    if (!this.initialized) await this.initialize()
    return (await this.rpc("tools/call", { name, arguments: args })) as ToolResult
  }

  private async rpc(method: string, params: Record<string, unknown>): Promise<unknown> {
    const id = ++this.rpcId
    const body = JSON.stringify({ jsonrpc: "2.0", id, method, params })

    const bearer = await Promise.resolve(this.opts.authorization())
    if (!bearer) {
      throw new AuroraError("auth", "Aurora SDK: sem Bearer/access_token.")
    }

    const resp = await this.fetchImpl(this.opts.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "accept": "application/json, text/event-stream",
        "authorization": `Bearer ${bearer}`,
      },
      body,
      signal: this.opts.signal,
    })

    if (resp.status === 401) {
      throw new AuroraError("missing_bearer", "Aurora SDK: token inválido ou expirado.", 401)
    }
    if (resp.status === 403) {
      throw new AuroraError("scope_denied", "Aurora SDK: scope denied (precisa mcp:use).", 403)
    }
    if (resp.status === 429) {
      throw new AuroraError("quota_exceeded", "Aurora SDK: quota excedida.", 429)
    }
    if (!resp.ok) {
      throw new AuroraError("transport", `Aurora SDK: HTTP ${resp.status}`, resp.status)
    }

    return await parseRpcResponse(resp, id)
  }
}

async function parseRpcResponse(resp: Response, expectedId: number): Promise<unknown> {
  const ct = (resp.headers.get("content-type") ?? "").toLowerCase()
  if (ct.includes("application/json")) {
    const json = (await resp.json()) as { error?: { message: string }; result?: unknown }
    if (json.error) throw new AuroraError("tool_error", json.error.message)
    return json.result
  }

  if (!resp.body) {
    throw new AuroraError("transport", "Aurora SDK: response sem body")
  }
  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buf = ""
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const { events, remainder } = consumeEvents(buf)
    buf = remainder
    for (const ev of events) {
      if (ev.event !== "message") continue
      try {
        const json = JSON.parse(ev.data) as {
          id?: number
          error?: { message: string }
          result?: unknown
        }
        if (json.id !== expectedId) continue
        if (json.error) throw new AuroraError("tool_error", json.error.message)
        return json.result
      } catch (e) {
        if (e instanceof SyntaxError) continue
        throw e
      }
    }
  }
  throw new AuroraError("transport", "Aurora SDK: stream terminou sem resposta")
}

interface SseEvent {
  event: string
  data: string
}

function consumeEvents(buf: string): { events: SseEvent[]; remainder: string } {
  const events: SseEvent[] = []
  const parts = buf.split(/\r?\n\r?\n/)
  const remainder = parts.pop() ?? ""
  for (const block of parts) {
    let event = "message"
    let data = ""
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith("event:")) event = line.slice(6).trim()
      else if (line.startsWith("data:")) data += (data ? "\n" : "") + line.slice(5).trim()
    }
    if (data) events.push({ event, data })
  }
  return { events, remainder }
}
