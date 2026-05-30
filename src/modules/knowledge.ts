import type { McpClient } from "../mcp/client.js"
import type { ToolResult } from "../types.js"

/**
 * Módulo Knowledge — RAG cross-project (`aurora_query_knowledge`).
 */
export class KnowledgeModule {
  constructor(private readonly mcp: McpClient) {}

  async query(query: string, mode?: string): Promise<{ raw: ToolResult; text: string }> {
    const args: Record<string, unknown> = { query }
    if (mode) args.mode = mode
    const raw = await this.mcp.callTool("aurora_query_knowledge", args)
    const text = raw.content
      .filter((c) => c.type === "text" && typeof c.text === "string")
      .map((c) => c.text as string)
      .join("\n")
    return { raw, text }
  }
}
