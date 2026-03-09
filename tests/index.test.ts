import { describe, it, expect, vi } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createDolarTools", () => {
  it("creates all 6 tool functions", async () => {
    const { createDolarTools } = await import("../src/index.js");
    const { tools } = createDolarTools();

    expect(typeof tools.get_all_dollars).toBe("function");
    expect(typeof tools.get_dollar).toBe("function");
    expect(typeof tools.get_all_currencies).toBe("function");
    expect(typeof tools.get_currency).toBe("function");
    expect(typeof tools.convert).toBe("function");
    expect(typeof tools.get_spread).toBe("function");
  });

  it("tools call the API correctly", async () => {
    const { createDolarTools } = await import("../src/index.js");
    const { tools } = createDolarTools();

    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await tools.get_all_dollars();

    mockFetch.mockResolvedValueOnce(jsonResponse({ casa: "blue", compra: 1280, venta: 1300 }));
    await tools.get_dollar({ type: "blue" });

    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await tools.get_all_currencies();

    mockFetch.mockResolvedValueOnce(jsonResponse({ moneda: "EUR", compra: 1350, venta: 1400 }));
    await tools.get_currency({ currency: "EUR" });

    mockFetch.mockResolvedValueOnce(jsonResponse({ casa: "blue", compra: 1280, venta: 1300 }));
    await tools.convert({ amount: 100, from: "blue" });

    mockFetch.mockResolvedValueOnce(jsonResponse({ nombre: "Oficial", compra: 1050, venta: 1100 }));
    mockFetch.mockResolvedValueOnce(jsonResponse({ nombre: "Blue", compra: 1280, venta: 1300 }));
    await tools.get_spread({ type_a: "oficial", type_b: "blue" });
  });
});
