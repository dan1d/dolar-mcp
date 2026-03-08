export interface GetDollarParams {
  type: string;
}

export interface GetCurrencyParams {
  currency: string;
}

export interface ConvertParams {
  amount: number;
  from: string;
  to?: string;
  use_buy?: boolean;
}

export interface GetSpreadParams {
  type_a: string;
  type_b: string;
}
