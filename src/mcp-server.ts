import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createDolarTools } from "./index.js";

export function createMcpServer() {
  const { tools } = createDolarTools();

  const server = new McpServer({
    name: "dolar-mcp",
    version: "1.0.0",
  });

  server.tool(
    "get_all_dollars",
    "Get all Argentine dollar exchange rates: blue, oficial, bolsa (MEP), contado con liqui (CCL), cripto, mayorista, and tarjeta. Returns buy/sell prices.",
    {},
    async () => {
      try {
        const result = await tools.get_all_dollars();
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: "text", text: message }], isError: true };
      }
    },
  );

  server.tool(
    "get_dollar",
    "Get a specific dollar exchange rate. Types: blue, oficial, bolsa, contadoconliqui, cripto, mayorista, tarjeta.",
    {
      type: z.string().describe("Dollar type: blue, oficial, bolsa, contadoconliqui, cripto, mayorista, tarjeta"),
    },
    async (params) => {
      try {
        const result = await tools.get_dollar(params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: "text", text: message }], isError: true };
      }
    },
  );

  server.tool(
    "get_all_currencies",
    "Get all foreign currency exchange rates vs ARS (EUR, BRL, UYU, CLP, etc.).",
    {},
    async () => {
      try {
        const result = await tools.get_all_currencies();
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: "text", text: message }], isError: true };
      }
    },
  );

  server.tool(
    "get_currency",
    "Get exchange rate for a specific foreign currency vs ARS.",
    {
      currency: z.string().describe("Currency code: EUR, BRL, UYU, CLP, COP, PEN, MXN, etc."),
    },
    async (params) => {
      try {
        const result = await tools.get_currency(params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: "text", text: message }], isError: true };
      }
    },
  );

  server.tool(
    "convert",
    "Convert an amount between ARS and any currency or dollar type. At least one side must be ARS.",
    {
      amount: z.number().describe("Amount to convert"),
      from: z.string().describe("Source currency/dollar type (e.g. USD, blue, EUR, ARS)"),
      to: z.string().optional().describe("Target currency (default: ARS)"),
      use_buy: z.boolean().optional().describe("Use buy rate instead of sell rate (default: false)"),
    },
    async (params) => {
      try {
        const result = await tools.convert(params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: "text", text: message }], isError: true };
      }
    },
  );

  server.tool(
    "get_spread",
    "Calculate the spread (difference) between two dollar types. E.g. blue vs oficial.",
    {
      type_a: z.string().describe("First dollar type (e.g. oficial)"),
      type_b: z.string().describe("Second dollar type (e.g. blue)"),
    },
    async (params) => {
      try {
        const result = await tools.get_spread(params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: "text", text: message }], isError: true };
      }
    },
  );

  return server;
}
