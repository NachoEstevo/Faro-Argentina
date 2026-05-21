import type { FxConversion, FxConversionNote } from "../data/fx.ts";

export interface AmountInput {
  value: number;
  currency: string;
  label: string;
  usdEquivalent: FxConversion | null;
  usdConversionNote?: FxConversionNote;
}

export interface FormattedAmount {
  primary: string;
  usdSegment: string | null;
  note?: FxConversionNote;
  showMissingChip: boolean;
}

/**
 * Like formatAmountWithUsd but with USD as the primary line and the local
 * currency as the secondary line. Used in compact summary surfaces (e.g.
 * the case panel facts grid) where USD reads as the argentina-contracts anchor.
 * Drops the FX source/date suffix to keep the secondary line short; that
 * provenance metadata still lives in the technical-details accordion.
 */
export function formatAmountUsdFirst(amount: AmountInput | null | undefined): FormattedAmount {
  if (!amount) {
    return { primary: "—", usdSegment: null, showMissingChip: false };
  }
  const local = `${amount.currency} ${Math.round(amount.value).toLocaleString("es-AR")}`;
  if (amount.currency === "USD") {
    return { primary: local, usdSegment: null, showMissingChip: false };
  }
  if (amount.usdEquivalent) {
    const usdRounded = Math.round(amount.usdEquivalent.usd).toLocaleString("es-AR");
    return { primary: `US$ ${usdRounded}`, usdSegment: local, showMissingChip: false };
  }
  const note = amount.usdConversionNote;
  const showMissingChip = note !== undefined && note !== "already_usd";
  return { primary: local, usdSegment: null, note, showMissingChip };
}

export function formatAmountWithUsd(amount: AmountInput | null | undefined): FormattedAmount {
  if (!amount) {
    return { primary: "—", usdSegment: null, showMissingChip: false };
  }

  const primary = `${amount.currency} ${Math.round(amount.value).toLocaleString("es-AR")}`;

  if (amount.usdEquivalent) {
    const usd = amount.usdEquivalent;
    const usdRounded = Math.round(usd.usd).toLocaleString("es-AR");
    const fxDateLabel = formatIsoDate(usd.fxDate);
    const sourceLabel = shortSourceLabel(usd.fxSource.sourceId);
    const usdSegment = `≈ US$ ${usdRounded} (al ${fxDateLabel}, ${sourceLabel})`;
    return { primary, usdSegment, showMissingChip: false };
  }

  const note = amount.usdConversionNote;
  const showMissingChip = note !== undefined && note !== "already_usd";
  return { primary, usdSegment: null, note, showMissingChip };
}

function formatIsoDate(iso: string): string {
  const [yyyy, mm, dd] = iso.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

function shortSourceLabel(sourceId: string): string {
  if (sourceId.startsWith("AR-BCRA")) return "BCRA A 3500";
  return sourceId;
}
