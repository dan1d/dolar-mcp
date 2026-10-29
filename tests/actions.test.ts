import { describe, it, expect, vi, beforeEach } from "vitest";
import { DolarApiClient } from "../src/client.js";
import {
  getAllDollars,
  getDollar,
  getAllCurrencies,
  getCurrency,
  convert,
  getSpread,
} from "../src/actions.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const BASE = "https://dolarapi.com";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function calledUrl(n = 0): string {
  return mockFetch.mock.calls[n][0] as string;
}

const blue = { moneda: "USD", casa: "blue", nombre: "Blue", compra: 1280, venta: 1300, fechaActualizacion: "2026-01-01T00:00:00.000Z" };
const oficial = { moneda: "USD", casa: "oficial", nombre: "Oficial", compra: 1050, venta: 1100, fechaActualizacion: "2026-01-01T00:00:00.000Z" };
const eur = { moneda: "EUR", casa: "oficial", nombre: "Euro", compra: 1350, venta: 1400, fechaActualizacion: "2026-01-01T00:00:00.000Z" };

describe("actions", () => {
  let client: DolarApiClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new DolarApiClient();
  });

  describe("getAllDollars", () => {
    it("fetches /v1/dolares", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([blue, oficial]));
      const result = await getAllDollars(client);
      expect(calledUrl()).toBe(`${BASE}/v1/dolares`);
      expect(result).toEqual([blue, oficial]);
    });
  });

  describe("getDollar", () => {
    it("fetches the exact lowercase path", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(blue));
      const result = await getDollar(client, { type: "blue" });
      expect(calledUrl()).toBe(`${BASE}/v1/dolares/blue`);
      expect(result).toEqual(blue);
    });

    it.each(["BLUE", "Blue", " blue "])("lowercases and trims %j (DolarAPI paths are case-sensitive)", async (type) => {
      mockFetch.mockResolvedValueOnce(jsonResponse(blue));
      await getDollar(client, { type });
      expect(calledUrl()).toBe(`${BASE}/v1/dolares/blue`);
    });

    it("URL-encodes unsafe characters", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(blue));
      await getDollar(client, { type: "blue?x=1" });
      expect(calledUrl()).toBe(`${BASE}/v1/dolares/blue%3Fx%3D1`);
    });
  });

  describe("getAllCurrencies", () => {
    it("fetches /v1/cotizaciones", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([eur]));
      const result = await getAllCurrencies(client);
      expect(calledUrl()).toBe(`${BASE}/v1/cotizaciones`);
      expect(result).toEqual([eur]);
    });
  });

  describe("getCurrency", () => {
    it.each(["EUR", "eur", "Eur"])("fetches /v1/cotizaciones/eur for %j", async (currency) => {
      mockFetch.mockResolvedValueOnce(jsonResponse(eur));
      const result = await getCurrency(client, { currency });
      expect(calledUrl()).toBe(`${BASE}/v1/cotizaciones/eur`);
      expect(result).toEqual(eur);
    });
  });

  describe("convert", () => {
    it("converts a dollar type to ARS with the venta rate", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(blue));
      const result = await convert(client, { amount: 100, from: "blue" });
      expect(calledUrl()).toBe(`${BASE}/v1/dolares/blue`);
      expect(result).toEqual({ from: "BLUE", to: "ARS", rate: 1300, amount: 100, converted: 130000 });
    });

    it("converts ARS to a dollar type by dividing", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(blue));
      const result = await convert(client, { amount: 130000, from: "ARS", to: "blue" }) as { converted: number; from: string; to: string };
      expect(result.converted).toBe(100);
      expect(result.from).toBe("ARS");
      expect(result.to).toBe("BLUE");
    });

    it("uses the compra rate when use_buy is true", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(blue));
      const result = await convert(client, { amount: 100, from: "blue", use_buy: true }) as { rate: number };
      expect(result.rate).toBe(1280);
    });

    it.each(["EUR", "eur", "Eur"])("routes %j to the lowercase cotizaciones path", async (from) => {
      mockFetch.mockResolvedValueOnce(jsonResponse(eur));
      const result = await convert(client, { amount: 50, from }) as { converted: number; rate: number };
      expect(calledUrl()).toBe(`${BASE}/v1/cotizaciones/eur`);
      expect(result.rate).toBe(1400);
      expect(result.converted).toBe(70000);
    });

    it("routes USD (not a dollar type) to /v1/cotizaciones/usd", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ ...oficial, moneda: "USD" }));
      await convert(client, { amount: 1, from: "USD" });
      expect(calledUrl()).toBe(`${BASE}/v1/cotizaciones/usd`);
    });

    it("URL-encodes the code instead of passing it raw", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(eur));
      await convert(client, { amount: 1, from: "eur?x=1" });
      expect(calledUrl()).toBe(`${BASE}/v1/cotizaciones/eur%3Fx%3D1`);
    });

    it("returns the identity for ARS -> ARS without fetching", async () => {
      const result = await convert(client, { amount: 100, from: "ARS", to: "ars" });
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toEqual({ from: "ARS", to: "ARS", rate: 1, amount: 100, converted: 100 });
    });

    it("throws when neither side is ARS", async () => {
      await expect(convert(client, { amount: 100, from: "USD", to: "EUR" })).rejects.toThrow(
        "At least one side of the conversion must be ARS"
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("throws instead of returning 0 when the requested rate is null", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ ...blue, casa: "tarjeta", compra: null }));
      await expect(convert(client, { amount: 100, from: "tarjeta", use_buy: true })).rejects.toThrow(
        /no usable compra rate for TARJETA/
      );
    });

    it("throws instead of returning Infinity when the rate is 0", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ ...blue, venta: 0 }));
      await expect(convert(client, { amount: 100, from: "ARS", to: "blue" })).rejects.toThrow(/no usable venta rate/);
    });

    it("propagates API errors", async () => {
      mockFetch.mockResolvedValueOnce(new Response("Not Found", { status: 404 }));
      await expect(convert(client, { amount: 1, from: "xyz" })).rejects.toThrow("GET /v1/cotizaciones/xyz failed (404)");
    });
  });

  describe("getSpread", () => {
    it("calculates spread between two dollar types using exact lowercase paths", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(oficial));
      mockFetch.mockResolvedValueOnce(jsonResponse(blue));

      const result = await getSpread(client, { type_a: "Oficial", type_b: "BLUE" }) as {
        spread_venta: number; spread_percent: number; type_a: { name: string }; type_b: { name: string };
      };

      expect(calledUrl(0)).toBe(`${BASE}/v1/dolares/oficial`);
      expect(calledUrl(1)).toBe(`${BASE}/v1/dolares/blue`);
      expect(result.type_a.name).toBe("Oficial");
      expect(result.type_b.name).toBe("Blue");
      expect(result.spread_venta).toBe(200);
      expect(result.spread_percent).toBe(18.18);
    });

    it("throws when a venta rate is missing instead of dividing by null", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ ...oficial, venta: null }));
      mockFetch.mockResolvedValueOnce(jsonResponse(blue));
      await expect(getSpread(client, { type_a: "oficial", type_b: "blue" })).rejects.toThrow(/no usable venta rate for oficial/);
    });
  });
});
