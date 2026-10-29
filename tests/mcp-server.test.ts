import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "../src/mcp-server.js";
import pkg from "../package.json";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textOf(result: Awaited<ReturnType<Client["callTool"]>>): string {
  return (result.content as Array<{ text: string }>)[0].text;
}

const blue = { moneda: "USD", casa: "blue", nombre: "Blue", compra: 1280, venta: 1300, fechaActualizacion: "x" };
const oficial = { moneda: "USD", casa: "oficial", nombre: "Oficial", compra: 1050, venta: 1100, fechaActualizacion: "x" };
const eur = { moneda: "EUR", casa: "oficial", nombre: "Euro", compra: 1350, venta: 1400, fechaActualizacion: "x" };

describe("MCP Server", () => {
  let client: Client;
  let server: ReturnType<typeof createMcpServer>;

  beforeEach(async () => {
    mockFetch.mockReset();
    server = createMcpServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: "test-client", version: "0.0.0" });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  });

  afterEach(async () => {
    await client.close();
    await server.close();
  });

  it("reports the package.json version to clients", () => {
    const info = client.getServerVersion();
    expect(info?.name).toBe("dolar-mcp");
    expect(info?.version).toBe(pkg.version);
    expect(info?.version).not.toBe("1.0.0");
  });

  it("registers all 6 tools with descriptions and object schemas", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "convert",
      "get_all_currencies",
      "get_all_dollars",
      "get_currency",
      "get_dollar",
      "get_spread",
    ]);
    for (const tool of tools) {
      expect(tool.description?.length ?? 0).toBeGreaterThan(10);
      expect(tool.inputSchema.type).toBe("object");
    }
    const convertTool = tools.find((t) => t.name === "convert")!;
    expect(Object.keys(convertTool.inputSchema.properties ?? {}).sort()).toEqual(["amount", "from", "to", "use_buy"]);
  });

  describe("tool calls — success", () => {
    it.each([
      { name: "get_all_dollars", args: {}, responses: [[blue, oficial]], check: (t: string) => expect(JSON.parse(t)[0].casa).toBe("blue") },
      { name: "get_dollar", args: { type: "BLUE" }, responses: [blue], check: (t: string) => expect(JSON.parse(t).venta).toBe(1300) },
      { name: "get_all_currencies", args: {}, responses: [[eur]], check: (t: string) => expect(JSON.parse(t)[0].moneda).toBe("EUR") },
      { name: "get_currency", args: { currency: "EUR" }, responses: [eur], check: (t: string) => expect(JSON.parse(t).moneda).toBe("EUR") },
      { name: "convert", args: { amount: 100, from: "blue" }, responses: [blue], check: (t: string) => expect(JSON.parse(t).converted).toBe(130000) },
      { name: "convert", args: { amount: 1000, from: "EUR" }, responses: [eur], check: (t: string) => expect(JSON.parse(t).converted).toBe(1400000) },
      { name: "get_spread", args: { type_a: "oficial", type_b: "blue" }, responses: [oficial, blue], check: (t: string) => expect(JSON.parse(t).spread_venta).toBe(200) },
    ])("$name $args", async ({ name, args, responses, check }) => {
      for (const r of responses) mockFetch.mockResolvedValueOnce(jsonResponse(r));
      const result = await client.callTool({ name, arguments: args });
      expect(result.isError).toBeFalsy();
      check(textOf(result));
    });

    it("get_currency with an uppercase code hits the lowercase path", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(eur));
      await client.callTool({ name: "get_currency", arguments: { currency: "EUR" } });
      expect(mockFetch.mock.calls[0][0]).toBe("https://dolarapi.com/v1/cotizaciones/eur");
    });
  });

  describe("tool calls — errors are returned as isError, never thrown", () => {
    it.each([
      { name: "get_all_dollars", args: {} },
      { name: "get_dollar", args: { type: "invalid" } },
      { name: "get_all_currencies", args: {} },
      { name: "get_currency", args: { currency: "INVALID" } },
      { name: "convert", args: { amount: 100, from: "blue" } },
      { name: "get_spread", args: { type_a: "oficial", type_b: "blue" } },
    ])("$name on HTTP 500", async ({ name, args }) => {
      mockFetch.mockImplementation(async () => new Response("Error", { status: 500 }));
      const result = await client.callTool({ name, arguments: args });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("failed (500)");
    });

    it("a non-Error rejection is stringified instead of crashing", async () => {
      mockFetch.mockRejectedValueOnce("socket hang up");
      const result = await client.callTool({ name: "get_all_dollars", arguments: {} });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toBe("socket hang up");
    });

    it("network failure (fetch rejects) is reported with isError", async () => {
      mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"));
      const result = await client.callTool({ name: "get_all_dollars", arguments: {} });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("fetch failed");
    });

    it("convert with neither side ARS returns the guidance message", async () => {
      const result = await client.callTool({ name: "convert", arguments: { amount: 1, from: "USD", to: "EUR" } });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("At least one side of the conversion must be ARS");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("convert rejects a non-positive amount at the schema boundary", async () => {
      const outcome = await client.callTool({ name: "convert", arguments: { amount: 0, from: "blue" } }).then(
        (r) => ({ isError: r.isError, text: textOf(r) }),
        (e: Error) => ({ isError: true, text: e.message }),
      );
      expect(outcome.isError).toBe(true);
      expect(outcome.text).toMatch(/amount|greater than 0|Invalid/i);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
