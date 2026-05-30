import type { McpClient } from "../mcp/client.js"
import type { CatalogSearchResult } from "../types.js"

/**
 * Módulo Catálogo — busca no catálogo curado Aurora (skills, MCPs, repos).
 *
 *   const r = await aurora.catalog.search("long-term memory")
 *   console.log(r.text) // markdown formatado
 */

export class CatalogModule {
  constructor(private readonly mcp: McpClient) {}

  async search(query: string): Promise<CatalogSearchResult> {
    const raw = await this.mcp.callTool("aurora_search_catalog", { query })
    const text = raw.content
      .filter((c) => c.type === "text" && typeof c.text === "string")
      .map((c) => c.text as string)
      .join("\n")
    return { raw, text }
  }
}
