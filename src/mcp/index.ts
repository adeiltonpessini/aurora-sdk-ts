/**
 * Aurora MCP — entry point do subpath `@aurora-mcp/sdk/mcp`.
 *
 * Cliente low-level pra falar JSON-RPC sobre Streamable HTTP com
 * qualquer servidor MCP compatível com a spec 2025-06-18.
 */
export { McpClient, type McpClientOptions, type AuthorizationProvider } from "./client.js"
