export interface SearchCardsOptions {
  token?: string | null;
  cardCode?: string | null;
  query?: string | null;
}

export interface ExportCardsOptions {
  clientIds?: string[];
  qrSize?: number;
  mode?: "client" | "blank" | "all";
}
