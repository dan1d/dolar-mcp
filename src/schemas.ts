import { z } from "zod";

/** Dollar "casas" served by DolarAPI under /v1/dolares/<type>. Single source for the schema hint and the routing in convert(). */
export const DOLLAR_TYPES = ["blue", "oficial", "bolsa", "contadoconliqui", "cripto", "mayorista", "tarjeta"] as const;
export type DollarType = (typeof DOLLAR_TYPES)[number];

const dollarTypeHint = `Dollar type: ${DOLLAR_TYPES.join(", ")} (case-insensitive)`;

export const GetDollarSchema = z.object({
  type: z.string().min(1).describe(dollarTypeHint),
});

export const GetCurrencySchema = z.object({
  currency: z.string().min(1).describe("Currency code: EUR, BRL, UYU, CLP, COP, PEN, MXN, etc. (case-insensitive)"),
});

export const ConvertSchema = z.object({
  amount: z.number().positive().describe("Amount to convert"),
  from: z.string().min(1).describe("Source currency or dollar type (e.g. USD, blue, EUR, ARS). Case-insensitive."),
  to: z.string().min(1).optional().describe("Target currency or dollar type (default: ARS). At least one side must be ARS."),
  use_buy: z
    .boolean()
    .optional()
    .describe("Use the buy (compra) rate instead of the sell (venta) rate. Applies the same way in both directions (default: false)."),
});

export const GetSpreadSchema = z.object({
  type_a: z.string().min(1).describe("First dollar type (e.g. oficial)"),
  type_b: z.string().min(1).describe("Second dollar type (e.g. blue)"),
});

export type GetDollarParams = z.infer<typeof GetDollarSchema>;
export type GetCurrencyParams = z.infer<typeof GetCurrencySchema>;
export type ConvertParams = z.infer<typeof ConvertSchema>;
export type GetSpreadParams = z.infer<typeof GetSpreadSchema>;
