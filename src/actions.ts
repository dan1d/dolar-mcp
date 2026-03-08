import { DolarApiClient } from "./client.js";
import type { GetDollarParams, GetCurrencyParams, ConvertParams, GetSpreadParams } from "./schemas.js";

interface DollarRate {
  moneda: string;
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

interface CurrencyRate {
  moneda: string;
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

export async function getAllDollars(client: DolarApiClient): Promise<unknown> {
  return client.get<DollarRate[]>("/v1/dolares");
}

export async function getDollar(
  client: DolarApiClient,
  params: GetDollarParams
): Promise<unknown> {
  return client.get<DollarRate>(`/v1/dolares/${encodeURIComponent(params.type)}`);
}

export async function getAllCurrencies(client: DolarApiClient): Promise<unknown> {
  return client.get<CurrencyRate[]>("/v1/cotizaciones");
}

export async function getCurrency(
  client: DolarApiClient,
  params: GetCurrencyParams
): Promise<unknown> {
  return client.get<CurrencyRate>(`/v1/cotizaciones/${encodeURIComponent(params.currency)}`);
}

export async function convert(
  client: DolarApiClient,
  params: ConvertParams
): Promise<unknown> {
  const fromUpper = params.from.toUpperCase();
  const toUpper = (params.to ?? "ARS").toUpperCase();

  // Determine which rate to fetch
  let rate: number;

  if (fromUpper === "ARS" || toUpper === "ARS") {
    // One side is ARS — fetch the other side's rate
    const nonArs = fromUpper === "ARS" ? toUpper : fromUpper;

    // Check if it's a dollar type (blue, oficial, etc.) or a currency (EUR, BRL)
    const dollarTypes = ["blue", "oficial", "bolsa", "contadoconliqui", "cripto", "mayorista", "tarjeta"];
    const isDollarType = dollarTypes.includes(nonArs.toLowerCase());

    if (isDollarType) {
      const data = await client.get<DollarRate>(`/v1/dolares/${nonArs.toLowerCase()}`);
      rate = params.use_buy ? data.compra : data.venta;
    } else {
      const data = await client.get<CurrencyRate>(`/v1/cotizaciones/${nonArs}`);
      rate = params.use_buy ? data.compra : data.venta;
    }

    // Convert
    if (fromUpper === "ARS") {
      // ARS → other: divide by rate
      return {
        from: fromUpper,
        to: nonArs,
        rate,
        amount: params.amount,
        converted: Number((params.amount / rate).toFixed(2)),
      };
    } else {
      // other → ARS: multiply by rate
      return {
        from: nonArs,
        to: "ARS",
        rate,
        amount: params.amount,
        converted: Number((params.amount * rate).toFixed(2)),
      };
    }
  }

  throw new Error("At least one side of the conversion must be ARS. Use 'from' or 'to' as ARS.");
}

export async function getSpread(
  client: DolarApiClient,
  params: GetSpreadParams
): Promise<unknown> {
  const [a, b] = await Promise.all([
    client.get<DollarRate>(`/v1/dolares/${encodeURIComponent(params.type_a)}`),
    client.get<DollarRate>(`/v1/dolares/${encodeURIComponent(params.type_b)}`),
  ]);

  const spreadVenta = b.venta - a.venta;
  const spreadPercent = ((spreadVenta / a.venta) * 100);

  return {
    type_a: { name: a.nombre, venta: a.venta, compra: a.compra },
    type_b: { name: b.nombre, venta: b.venta, compra: b.compra },
    spread_venta: Number(spreadVenta.toFixed(2)),
    spread_percent: Number(spreadPercent.toFixed(2)),
  };
}
