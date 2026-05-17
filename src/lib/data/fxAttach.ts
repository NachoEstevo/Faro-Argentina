import {
  convertAmountToUsd,
  type FxAnchorCandidate,
  type FxConversion,
  type FxConversionNote,
  type FxSeriesRegistry,
} from "./fx.ts";

export interface AmountWithFx {
  value: number;
  currency: string;
  label: string;
  usdEquivalent: FxConversion | null;
  usdConversionNote?: FxConversionNote;
}

export function attachFx(
  amount: { value: number; currency: string; label: string } | null,
  candidates: FxAnchorCandidate[],
  registry: FxSeriesRegistry | undefined,
): AmountWithFx | null {
  if (!amount) return null;
  if (!registry) {
    return { ...amount, usdEquivalent: null, usdConversionNote: "currency_not_supported" };
  }
  const { conversion, note } = convertAmountToUsd({
    amount: amount.value,
    currency: amount.currency,
    anchorCandidates: candidates,
    series: registry,
  });
  return { ...amount, usdEquivalent: conversion, usdConversionNote: note };
}

export function yearAsAnchor(isoDate: string | null | undefined): string | null {
  if (!isoDate || isoDate.length < 4) return null;
  return `${isoDate.slice(0, 4)}-01-01`;
}

export function yearNumberAsAnchor(year: number | null | undefined): string | null {
  if (!year || !Number.isFinite(year)) return null;
  return `${year}-01-01`;
}
