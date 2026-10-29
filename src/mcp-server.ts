import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createDolarTools } from "./index.js";
import { ConvertSchema, GetCurrencySchema, GetDollarSchema, GetSpreadSchema, DOLLAR_TYPES } from "./schemas.js";

// Resolves to the repo root from dist/ (runtime) and from src/ (tests) alike.
const { version: PACKAGE_VERSION } = createRequire(__filename)("../package.json") as { version: string };

type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

/** Shared result/error envelope for every tool: JSON on success, message + isError on failure. */
function wrap<P>(fn: (params: P) => Promise<unknown>): (params: P) => Promise<ToolResult> {
  return async (params) => {
    try {
      const result = await fn(params);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { content: [{ type: "text", text: message }], isError: true };
    }
  };
}

export function createMcpServer() {
  const { tools } = createDolarTools();

  const server = new McpServer({ name: "dolar-mcp", version: PACKAGE_VERSION });

  server.registerTool(
    "get_all_dollars",
    {
      description:
        "Get all Argentine dollar exchange rates: blue, oficial, bolsa (MEP), contado con liqui (CCL), cripto, mayorista, and tarjeta. Returns buy/sell prices.",
    },
    wrap(() => tools.get_all_dollars()),
  );

  server.registerTool(
    "get_dollar",
    {
      description: `Get a specific dollar exchange rate. Types: ${DOLLAR_TYPES.join(", ")}.`,
      inputSchema: GetDollarSchema.shape,
    },
    wrap(tools.get_dollar),
  );

  server.registerTool(
    "get_all_currencies",
    { description: "Get all foreign currency exchange rates vs ARS (EUR, BRL, UYU, CLP, etc.)." },
    wrap(() => tools.get_all_currencies()),
  );

  server.registerTool(
    "get_currency",
    {
      description: "Get exchange rate for a specific foreign currency vs ARS.",
      inputSchema: GetCurrencySchema.shape,
    },
    wrap(tools.get_currency),
  );

  server.registerTool(
    "convert",
    {
      description:
        "Convert an amount between ARS and any currency or dollar type. At least one side must be ARS. Uses the sell (venta) rate unless use_buy is set.",
      inputSchema: ConvertSchema.shape,
    },
    wrap(tools.convert),
  );

  server.registerTool(
    "get_spread",
    {
      description: "Calculate the spread (difference) between two dollar types. E.g. blue vs oficial.",
      inputSchema: GetSpreadSchema.shape,
    },
    wrap(tools.get_spread),
  );

  return server;
}
