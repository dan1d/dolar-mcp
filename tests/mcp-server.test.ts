import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function setupMcpClient() {
  const { createMcpServer } = await import("../src/mcp-server.js");
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { InMemoryTransport } = await import("@modelcontextprotocol/sdk/inMemory.js");

  const server = createMcpServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "1.0.0" });

  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  return { client, server };
}

describe("MCP Server", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("creates server successfully", async () => {
    const { createMcpServer } = await import("../src/mcp-server.js");
    const server = createMcpServer();
    expect(server).toBeDefined();
  });

  it("registers all 6 tools", async () => {
    const { client } = await setupMcpClient();
    const result = await client.listTools();
    const names = result.tools.map((t) => t.name).sort();

    expect(names).toEqual([
      "convert",
      "get_all_currencies",
      "get_all_dollars",
      "get_currency",
      "get_dollar",
      "get_spread",
    ]);

    await client.close();
  });

  describe("tool calls — success", () => {
    it("get_all_dollars returns rates", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([{ casa: "blue", venta: 1300 }]));
      const { client } = await setupMcpClient();

      const result = await client.callTool({ name: "get_all_dollars", arguments: {} });
      const text = (result.content as Array<{ text: string }>)[0].text;
      expect(JSON.parse(text)[0].casa).toBe("blue");
      await client.close();
    });

    it("get_dollar returns specific rate", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ casa: "blue", compra: 1280, venta: 1300 }));
      const { client } = await setupMcpClient();

      const result = await client.callTool({ name: "get_dollar", arguments: { type: "blue" } });
      const text = (result.content as Array<{ text: string }>)[0].text;
      expect(JSON.parse(text).venta).toBe(1300);
      await client.close();
    });

    it("get_all_currencies returns rates", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([{ moneda: "EUR", venta: 1400 }]));
      const { client } = await setupMcpClient();

      const result = await client.callTool({ name: "get_all_currencies", arguments: {} });
      const text = (result.content as Array<{ text: string }>)[0].text;
      expect(JSON.parse(text)[0].moneda).toBe("EUR");
      await client.close();
    });

    it("get_currency returns specific rate", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ moneda: "EUR", venta: 1400 }));
      const { client } = await setupMcpClient();

      const result = await client.callTool({ name: "get_currency", arguments: { currency: "EUR" } });
      const text = (result.content as Array<{ text: string }>)[0].text;
      expect(JSON.parse(text).moneda).toBe("EUR");
      await client.close();
    });

    it("convert returns conversion result", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ casa: "blue", compra: 1280, venta: 1300 }));
      const { client } = await setupMcpClient();

      const result = await client.callTool({ name: "convert", arguments: { amount: 100, from: "blue" } });
      const text = (result.content as Array<{ text: string }>)[0].text;
      expect(JSON.parse(text).converted).toBe(130000);
      await client.close();
    });

    it("get_spread returns spread data", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ nombre: "Oficial", compra: 1050, venta: 1100 }));
      mockFetch.mockResolvedValueOnce(jsonResponse({ nombre: "Blue", compra: 1280, venta: 1300 }));
      const { client } = await setupMcpClient();

      const result = await client.callTool({ name: "get_spread", arguments: { type_a: "oficial", type_b: "blue" } });
      const text = (result.content as Array<{ text: string }>)[0].text;
      expect(JSON.parse(text).spread_venta).toBe(200);
      await client.close();
    });
  });

  describe("tool calls — errors", () => {
    it("get_all_dollars returns error on failure", async () => {
      mockFetch.mockResolvedValueOnce(new Response("Error", { status: 500 }));
      const { client } = await setupMcpClient();

      const result = await client.callTool({ name: "get_all_dollars", arguments: {} });
      expect(result.isError).toBe(true);
      await client.close();
    });

    it("get_dollar returns error on failure", async () => {
      mockFetch.mockResolvedValueOnce(new Response("Not Found", { status: 404 }));
      const { client } = await setupMcpClient();

      const result = await client.callTool({ name: "get_dollar", arguments: { type: "invalid" } });
      expect(result.isError).toBe(true);
      await client.close();
    });

    it("get_all_currencies returns error on failure", async () => {
      mockFetch.mockResolvedValueOnce(new Response("Error", { status: 500 }));
      const { client } = await setupMcpClient();

      const result = await client.callTool({ name: "get_all_currencies", arguments: {} });
      expect(result.isError).toBe(true);
      await client.close();
    });

    it("get_currency returns error on failure", async () => {
      mockFetch.mockResolvedValueOnce(new Response("Not Found", { status: 404 }));
      const { client } = await setupMcpClient();

      const result = await client.callTool({ name: "get_currency", arguments: { currency: "INVALID" } });
      expect(result.isError).toBe(true);
      await client.close();
    });

    it("convert returns error on failure", async () => {
      mockFetch.mockResolvedValueOnce(new Response("Error", { status: 500 }));
      const { client } = await setupMcpClient();

      const result = await client.callTool({ name: "convert", arguments: { amount: 100, from: "blue" } });
      expect(result.isError).toBe(true);
      await client.close();
    });

    it("get_spread returns error on failure", async () => {
      mockFetch.mockResolvedValueOnce(new Response("Error", { status: 500 }));
      const { client } = await setupMcpClient();

      const result = await client.callTool({ name: "get_spread", arguments: { type_a: "oficial", type_b: "blue" } });
      expect(result.isError).toBe(true);
      await client.close();
    });
  });
});
