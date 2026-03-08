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

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("actions", () => {
  let client: DolarApiClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new DolarApiClient();
  });

  describe("getAllDollars", () => {
    it("fetches all dollar rates", async () => {
      const rates = [
        { casa: "blue", compra: 1280, venta: 1300 },
        { casa: "oficial", compra: 1050, venta: 1100 },
      ];
      mockFetch.mockResolvedValueOnce(jsonResponse(rates));

      const result = await getAllDollars(client);

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("/v1/dolares");
      expect(result).toEqual(rates);
    });
  });

  describe("getDollar", () => {
    it("fetches specific dollar type", async () => {
      const rate = { casa: "blue", compra: 1280, venta: 1300 };
      mockFetch.mockResolvedValueOnce(jsonResponse(rate));

      const result = await getDollar(client, { type: "blue" });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("/v1/dolares/blue");
      expect(result).toEqual(rate);
    });
  });

  describe("getAllCurrencies", () => {
    it("fetches all currency rates", async () => {
      const rates = [{ moneda: "EUR", compra: 1350, venta: 1400 }];
      mockFetch.mockResolvedValueOnce(jsonResponse(rates));

      const result = await getAllCurrencies(client);

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("/v1/cotizaciones");
      expect(result).toEqual(rates);
    });
  });

  describe("getCurrency", () => {
    it("fetches specific currency rate", async () => {
      const rate = { moneda: "EUR", compra: 1350, venta: 1400 };
      mockFetch.mockResolvedValueOnce(jsonResponse(rate));

      const result = await getCurrency(client, { currency: "EUR" });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("/v1/cotizaciones/EUR");
      expect(result).toEqual(rate);
    });
  });

  describe("convert", () => {
    it("converts USD blue to ARS", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ casa: "blue", compra: 1280, venta: 1300 })
      );

      const result = await convert(client, {
        amount: 100,
        from: "blue",
      }) as { converted: number; rate: number };

      expect(result.rate).toBe(1300);
      expect(result.converted).toBe(130000);
    });

    it("converts ARS to USD blue", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ casa: "blue", compra: 1280, venta: 1300 })
      );

      const result = await convert(client, {
        amount: 130000,
        from: "ARS",
        to: "blue",
      }) as { converted: number };

      expect(result.converted).toBe(100);
    });

    it("uses buy rate when use_buy is true", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ casa: "blue", compra: 1280, venta: 1300 })
      );

      const result = await convert(client, {
        amount: 100,
        from: "blue",
        use_buy: true,
      }) as { rate: number };

      expect(result.rate).toBe(1280);
    });

    it("converts EUR to ARS via cotizaciones", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ moneda: "EUR", compra: 1350, venta: 1400 })
      );

      const result = await convert(client, {
        amount: 50,
        from: "EUR",
      }) as { converted: number; rate: number };

      expect(result.rate).toBe(1400);
      expect(result.converted).toBe(70000);
    });

    it("throws when neither side is ARS", async () => {
      await expect(
        convert(client, { amount: 100, from: "USD", to: "EUR" })
      ).rejects.toThrow("At least one side of the conversion must be ARS");
    });
  });

  describe("getSpread", () => {
    it("calculates spread between two dollar types", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ nombre: "Oficial", compra: 1050, venta: 1100 })
      );
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ nombre: "Blue", compra: 1280, venta: 1300 })
      );

      const result = await getSpread(client, {
        type_a: "oficial",
        type_b: "blue",
      }) as { spread_venta: number; spread_percent: number; type_a: { name: string }; type_b: { name: string } };

      expect(result.type_a.name).toBe("Oficial");
      expect(result.type_b.name).toBe("Blue");
      expect(result.spread_venta).toBe(200);
      expect(result.spread_percent).toBe(18.18);
    });
  });
});
