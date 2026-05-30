import { describe, it, expect, vi } from "vitest"
import { AuroraClient, AuroraError } from "../src/index.js"

/**
 * Tests sem rede real — usamos fetch mock que devolve SSE simulado.
 */

function mockSseFetch(payload: unknown, opts: { status?: number } = {}) {
  return vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const body = (() => {
      if (opts.status === 401 || opts.status === 403 || opts.status === 429) return ""
      const sseFrame = `event: message\ndata: ${JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: payload,
      })}\n\n`
      return sseFrame
    })()

    return new Response(body, {
      status: opts.status ?? 200,
      headers: { "content-type": "text/event-stream" },
    })
  })
}

describe("AuroraClient", () => {
  it("constrói com apiKey e expõe módulos", () => {
    const client = new AuroraClient({ apiKey: "aurora_test_x" })
    expect(client.team).toBeDefined()
    expect(client.catalog).toBeDefined()
    expect(client.knowledge).toBeDefined()
    expect(client.serverUrl).toBe("https://app.aurora-mcp.com")
  })

  it("respeita serverUrl custom", () => {
    const client = new AuroraClient(
      { apiKey: "x" },
      { serverUrl: "https://my-aurora.example.com/" },
    )
    expect(client.serverUrl).toBe("https://my-aurora.example.com")
  })

  it("chama team.ask e parseia router decision", async () => {
    // Mock universal: olha o `method` JSON-RPC pra decidir resposta.
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        id: number
        method: string
      }
      const result =
        body.method === "initialize"
          ? { serverInfo: { name: "aurora-mcp", version: "0.5.0" } }
          : {
              content: [
                {
                  type: "text",
                  text:
                    "[Aurora Router] Pedido roteado para **Nora** (Security & Compliance) — match keyword: `security`.\n\nVocê é Nora...",
                },
              ],
            }
      const sse = `event: message\ndata: ${JSON.stringify({
        jsonrpc: "2.0",
        id: body.id,
        result,
      })}\n\n`
      return new Response(sse, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      })
    }) as unknown as typeof fetch

    const client = new AuroraClient({ apiKey: "x" }, { fetch: fetchMock })
    const result = await client.team.ask({ task: "tem security issue?" })
    expect(result.routerDecision.persona).toBe("Nora")
    expect(result.text).toContain("Nora")
  })

  it("lança AuroraError com code missing_bearer em 401", async () => {
    const fakeFetch = mockSseFetch(null, { status: 401 }) as unknown as typeof fetch
    const client = new AuroraClient({ apiKey: "x" }, { fetch: fakeFetch })
    await expect(client.team.ask({ task: "x" })).rejects.toBeInstanceOf(AuroraError)
    await expect(client.team.ask({ task: "x" })).rejects.toMatchObject({
      code: "missing_bearer",
      status: 401,
    })
  })

  it("lança AuroraError com code scope_denied em 403", async () => {
    const fakeFetch = mockSseFetch(null, { status: 403 }) as unknown as typeof fetch
    const client = new AuroraClient({ apiKey: "x" }, { fetch: fakeFetch })
    await expect(client.team.ask({ task: "x" })).rejects.toMatchObject({
      code: "scope_denied",
      status: 403,
    })
  })

  it("lança AuroraError com code quota_exceeded em 429", async () => {
    const fakeFetch = mockSseFetch(null, { status: 429 }) as unknown as typeof fetch
    const client = new AuroraClient({ apiKey: "x" }, { fetch: fakeFetch })
    await expect(client.team.ask({ task: "x" })).rejects.toMatchObject({
      code: "quota_exceeded",
      status: 429,
    })
  })
})
