export type FxAnchorField = "contract_signed" | "opening" | "published" | "year";

export interface FxAnchorCandidate {
  field: FxAnchorField;
  date: string | null;
}

export interface FxSourceMeta {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  snapshotHash: string;
}

export interface FxRateEntry {
  rate: number;
  sourceMeta: FxSourceMeta;
}

export type FxSeries = Map<string, FxRateEntry>;
export type FxSeriesRegistry = Map<string, FxSeries>;

export interface FxConversion {
  usd: number;
  fxRate: number;
  fxDate: string;
  anchorDate: string;
  anchorField: FxAnchorField;
  fxSource: FxSourceMeta;
}

export type FxConversionNote =
  | "no_anchor_date"
  | "no_fx_for_anchor_dates"
  | "currency_not_supported"
  | "already_usd";

export interface FxConversionResult {
  conversion: FxConversion | null;
  note?: FxConversionNote;
}

export function convertAmountToUsd(input: {
  amount: number;
  currency: string;
  anchorCandidates: FxAnchorCandidate[];
  series: FxSeriesRegistry;
}): FxConversionResult {
  if (input.currency === "USD") {
    return { conversion: null, note: "already_usd" };
  }

  const series = input.series.get(input.currency);
  if (!series) {
    return { conversion: null, note: "currency_not_supported" };
  }

  const candidates = input.anchorCandidates.filter(
    (candidate): candidate is FxAnchorCandidate & { date: string } => candidate.date !== null,
  );
  if (candidates.length === 0) {
    return { conversion: null, note: "no_anchor_date" };
  }

  for (const candidate of candidates) {
    const entry = series.get(candidate.date);
    if (!entry) continue;
    return {
      conversion: {
        usd: input.amount / entry.rate,
        fxRate: entry.rate,
        fxDate: candidate.date,
        anchorDate: candidate.date,
        anchorField: candidate.field,
        fxSource: entry.sourceMeta,
      },
    };
  }

  return { conversion: null, note: "no_fx_for_anchor_dates" };
}
