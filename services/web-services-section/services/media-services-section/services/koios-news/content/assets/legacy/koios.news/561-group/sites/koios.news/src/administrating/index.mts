// administrating — internal offices for operating Koios.News.

import { developingOfficeReading, type DevelopingOfficeReading } from "./developing/index.mjs";

export type AdministratingOfficeReading = Readonly<{
  office: "administrating";
  developing: DevelopingOfficeReading;
}>;

export function administratingOfficeReading(input: Readonly<{ adSenseEnabled?: boolean }> = {}): AdministratingOfficeReading {
  return Object.freeze({
    office: "administrating",
    developing: developingOfficeReading(input),
  });
}

export { developingOfficeReading } from "./developing/index.mjs";
export type { DevelopingOfficeReading } from "./developing/index.mjs";
