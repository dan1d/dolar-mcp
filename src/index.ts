import { DolarApiClient } from "./client.js";
import {
  getAllDollars,
  getDollar,
  getAllCurrencies,
  getCurrency,
  convert,
  getSpread,
} from "./actions.js";
import type {
  GetDollarParams,
  GetCurrencyParams,
  ConvertParams,
  GetSpreadParams,
} from "./schemas.js";

export function createDolarTools() {
  const client = new DolarApiClient();

  return {
    tools: {
      get_all_dollars: () => getAllDollars(client),
      get_dollar: (params: GetDollarParams) => getDollar(client, params),
      get_all_currencies: () => getAllCurrencies(client),
      get_currency: (params: GetCurrencyParams) => getCurrency(client, params),
      convert: (params: ConvertParams) => convert(client, params),
      get_spread: (params: GetSpreadParams) => getSpread(client, params),
    },
  };
}

export { DolarApiClient } from "./client.js";
export {
  getAllDollars,
  getDollar,
  getAllCurrencies,
  getCurrency,
  convert,
  getSpread,
} from "./actions.js";
export type {
  GetDollarParams,
  GetCurrencyParams,
  ConvertParams,
  GetSpreadParams,
} from "./schemas.js";
