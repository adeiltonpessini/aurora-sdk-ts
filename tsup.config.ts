import { defineConfig } from "tsup"

/**
 * Build dual (ESM + CJS) com types pra cada entry point.
 *
 * Entries:
 *   - index → AuroraClient principal + helpers high-level
 *   - mcp   → MCP client low-level (Streamable HTTP + SSE)
 *   - oauth → PKCE + DCR + flow OAuth (pra apps que querem rolar próprio)
 */
export default defineConfig({
  entry: {
    index: "src/index.ts",
    "mcp/index": "src/mcp/index.ts",
    "oauth/index": "src/oauth/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  target: "node18",
})
