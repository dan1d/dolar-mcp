import { DolarApiClient } from "./client.js";
import { DOLLAR_TYPES } from "./schemas.js";
import type { GetDollarParams, GetCurrencyParams, ConvertParams, GetSpreadParams } from "./schemas.js";

export interface Rate {
  moneda: string;
  casa: string;
  nombre: string;
  compra: number | null;
  venta: number | null;
  fechaActualizacion: string;
}

const DOLLAR_TYPE_SET = new Set<string>(DOLLAR_TYPES);

/** DolarAPI paths are case-sensitive and lowercase: /v1/dolares/blue, /v1/cotizaciones/eur. */
function pathCode(code: string): string {
  return encodeURIComponent(code.trim().toLowerCase());
}

function ratePath(code: string): string {
  const lower = code.trim().toLowerCase();
  return DOLLAR_TYPE_SET.has(lower) ? `/v1/dolares/${pathCode(lower)}` : `/v1/cotizaciones/${pathCode(lower)}`;
}

function requireRate(value: unknown, side: "compra" | "venta", code: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`DolarAPI returned no usable ${side} rate for ${code} (${String(value)})`);
  }
  return value;
}

export async function getAllDollars(client: DolarApiClient): Promise<unknown> {
  return client.get<Rate[]>("/v1/dolares");
}

export async function getDollar(client: DolarApiClient, params: GetDollarParams): Promise<unknown> {
  return client.get<Rate>(`/v1/dolares/${pathCode(params.type)}`);
}

export async function getAllCurrencies(client: DolarApiClient): Promise<unknown> {
  return client.get<Rate[]>("/v1/cotizaciones");
}

export async function getCurrency(client: DolarApiClient, params: GetCurrencyParams): Promise<unknown> {
  return client.get<Rate>(`/v1/cotizaciones/${pathCode(params.currency)}`);
}

export async function convert(client: DolarApiClient, params: ConvertParams): Promise<unknown> {
  const from = params.from.trim().toUpperCase();
  const to = (params.to ?? "ARS").trim().toUpperCase();

  if (from !== "ARS" && to !== "ARS") {
    throw new Error("At least one side of the conversion must be ARS. Use 'from' or 'to' as ARS.");
  }
  if (from === "ARS" && to === "ARS") {
    return { from, to, rate: 1, amount: params.amount, converted: params.amount };
  }

  const fromArs = from === "ARS";
  const other = fromArs ? to : from;
  const data = await client.get<Rate>(ratePath(other));
  const side = params.use_buy ? "compra" : "venta";
  const rate = requireRate(data[side], side, other);
  const converted = fromArs ? params.amount / rate : params.amount * rate;

  return { from, to, rate, amount: params.amount, converted: Number(converted.toFixed(2)) };
}

export async function getSpread(client: DolarApiClient, params: GetSpreadParams): Promise<unknown> {
  const [a, b] = await Promise.all([
    client.get<Rate>(`/v1/dolares/${pathCode(params.type_a)}`),
    client.get<Rate>(`/v1/dolares/${pathCode(params.type_b)}`),
  ]);

  const ventaA = requireRate(a.venta, "venta", params.type_a);
  const ventaB = requireRate(b.venta, "venta", params.type_b);
  const spreadVenta = ventaB - ventaA;

  return {
    type_a: { name: a.nombre, venta: a.venta, compra: a.compra },
    type_b: { name: b.nombre, venta: b.venta, compra: b.compra },
    spread_venta: Number(spreadVenta.toFixed(2)),
    spread_percent: Number(((spreadVenta / ventaA) * 100).toFixed(2)),
  };
}
