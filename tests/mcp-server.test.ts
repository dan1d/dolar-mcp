import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

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
    const { createMcpServer } = await import("../src/mcp-server.js");
    const server = createMcpServer();

    const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
    const { InMemoryTransport } = await import("@modelcontextprotocol/sdk/inMemory.js");

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client({ name: "test-client", version: "1.0.0" });

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

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
});
