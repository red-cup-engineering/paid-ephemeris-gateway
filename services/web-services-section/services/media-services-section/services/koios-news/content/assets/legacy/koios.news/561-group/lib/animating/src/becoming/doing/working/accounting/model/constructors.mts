// model/constructors.ts — convenience constructors for model entries. Each returns a typed plain
// object with all fields populated (nulls for missing optionals). These are thin wrappers; the
// interfaces in types.ts are the canonical shape.

import type {
  Transaction, Posting, Cost, Price, BalanceAssertion, Amount, Source,
  OpenDirective, CloseDirective, CommodityDirective, PriceDirective,
  PadDirective, BalanceDirective, OptionDirective, IncludeDirective,
  Malformed,
} from "./types.mjs";

export const posting = ({
  account,
  amount = null,
  cost = null,
  price = null,
  balanceAssertion = null,
  meta = {},
}: {
  account: string;
  amount?: Amount | null;
  cost?: Cost | null;
  price?: Price | null;
  balanceAssertion?: BalanceAssertion | null;
  meta?: Record<string, unknown>;
}): Posting => ({ account, amount, cost, price, balanceAssertion, meta });

export const transaction = ({
  id = null,
  date,
  time = null,
  flag = null,
  payee = null,
  narration = "",
  postings = [],
  tags = [],
  links = [],
  meta = {},
  code = null,
  source = null,
}: {
  id?: string | null;
  date: string;
  time?: string | null;
  flag?: string | null;
  payee?: string | null;
  narration?: string;
  postings?: readonly Posting[];
  tags?: readonly string[];
  links?: readonly string[];
  meta?: Record<string, unknown>;
  code?: string | null;
  source?: Source | null;
}): Transaction => ({ id, date, time, flag, payee, narration, postings, tags, links, meta, code, source });

export const txnId = (date: string, ordinal: number): string => `txn:${date}:${ordinal}`;

export const open = ({
  date = null,
  account,
  commodities = [],
  booking = null,
  source = null,
}: {
  date?: string | null;
  account: string;
  commodities?: readonly string[];
  booking?: string | null;
  source?: Source | null;
}): OpenDirective => ({ directive: "open", date, account, commodities, booking, source });

export const close = ({
  date,
  account,
  source = null,
}: {
  date: string;
  account: string;
  source?: Source | null;
}): CloseDirective => ({ directive: "close", date, account, source });

export const commodity = ({
  date = null,
  symbol,
  precision = null,
  meta = {},
  source = null,
}: {
  date?: string | null;
  symbol: string;
  precision?: number | null;
  meta?: Record<string, unknown>;
  source?: Source | null;
}): CommodityDirective => ({ directive: "commodity", date, symbol, precision, meta, source });

export const price = ({
  date,
  commodity: sym,
  amount,
  source = null,
}: {
  date: string;
  commodity: string;
  amount: Amount;
  source?: Source | null;
}): PriceDirective => ({ directive: "price", date, commodity: sym, amount, source });

export const pad = ({
  date,
  account,
  padAccount,
  source = null,
}: {
  date: string;
  account: string;
  padAccount: string;
  source?: Source | null;
}): PadDirective => ({ directive: "pad", date, account, padAccount, source });

export const balance = ({
  date,
  account,
  amount,
  tolerance = null,
  source = null,
}: {
  date: string;
  account: string;
  amount: Amount;
  tolerance?: string | null;
  source?: Source | null;
}): BalanceDirective => ({ directive: "balance", date, account, amount, tolerance, source });

export const option = ({
  key = null,
  value = null,
  source = null,
}: {
  key?: string | null;
  value?: string | null;
  source?: Source | null;
}): OptionDirective => ({ directive: "option", date: null, key, value, source });

export const include = ({
  path = null,
  resolved = false,
  error = null,
  source = null,
}: {
  path?: string | null;
  resolved?: boolean;
  error?: string | null;
  source?: Source | null;
}): IncludeDirective => ({ directive: "include", date: null, path, resolved, error, source });

export const malformed = ({
  raw,
  reason,
  source = null,
}: {
  raw: string;
  reason: string;
  source?: Source | null;
}): Malformed => ({ kind: "malformed", raw, reason, source });
