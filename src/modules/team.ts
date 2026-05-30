import type { McpClient } from "../mcp/client.js"
import type { AskArgs, RouterDecision, ToolResult } from "../types.js"

/**
 * Módulo Team — wrapper de `aurora_team(task)`.
 *
 *   const result = await aurora.team.ask({ task: "tem SQL injection aqui?" })
 *   console.log(result.text)
 *   console.log(result.routerDecision.persona) // "Nora"
 */

const PERSONAS = [
  "Otto", "Vera", "Bruno", "Iris", "Leo", "Aura", "Clara", "Edu",
  "Nora", "Davi", "Mauro", "Sofia", "Yuri", "Marina", "Tux", "Caio",
] as const

export interface AskResult {
  /** Texto cru devolvido pelo MCP (markdown). */
  text: string
  /** Resposta RPC completa pra quem precisar inspecionar. */
  raw: ToolResult
  /** Persona escolhida pelo router (parseado do header `[Aurora Router]`). */
  routerDecision: RouterDecision
}

export class TeamModule {
  constructor(private readonly mcp: McpClient) {}

  /** Chama `aurora_team(task)` — entry-point único com router automático. */
  async ask(args: AskArgs): Promise<AskResult> {
    const raw = await this.mcp.callTool("aurora_team", args as unknown as Record<string, unknown>)
    return wrapResult(raw)
  }

  /**
   * Chama uma persona específica (`aurora_nora`, `aurora_bruno`, etc) —
   * pra power users que sabem quem querem. Type-safe pra as 16 públicas.
   */
  async asPersona(
    persona: (typeof PERSONAS)[number] | (string & Record<never, never>),
    args: AskArgs,
  ): Promise<AskResult> {
    const slug = persona.toLowerCase()
    const raw = await this.mcp.callTool(`aurora_${slug}`, args as unknown as Record<string, unknown>)
    return wrapResult(raw)
  }

  /** Lista a equipe (16 personas). */
  async list(): Promise<AskResult> {
    const raw = await this.mcp.callTool("aurora_list_team", {})
    return wrapResult(raw)
  }
}

function wrapResult(raw: ToolResult): AskResult {
  const text = raw.content
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text as string)
    .join("\n")

  const routerDecision = parseRouterNote(text)
  return { text, raw, routerDecision }
}

function parseRouterNote(text: string): RouterDecision {
  const m = text.match(/\[Aurora Router\][^\n]*roteado para \**([^*\n.,]+)/i)
  if (m) return { persona: m[1].trim(), routerNote: m[0] }
  return {}
}
