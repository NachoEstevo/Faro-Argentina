import {
  buildCaseSignalContext,
  buildCaseSignalContextsByCountry,
  buildCaseSignals,
  selectLeadCaseSignal,
  type CaseSignalContext,
  type CaseSignal,
  type SignalCaseFile,
} from "./caseSignals.ts";
import type { CountryCode } from "./sourceCatalog.ts";

export interface CaseLeadFilters {
  countryCode?: CountryCode;
  sourceId?: string;
  caseType?: string;
  query?: string;
  limit?: number;
}

export interface CaseLead {
  leadId: string;
  caseId: string;
  countryCode: CountryCode;
  caseTitle: string;
  sourceId: string;
  sourceName: string;
  caseType: string | null;
  primarySignal: CaseSignal;
  signalCount: number;
  why: string;
  caveat: string;
  evidence: string;
  nextAction: string;
  sortScore: number;
}

export function buildCaseLeads(
  cases: SignalCaseFile[],
  filters: CaseLeadFilters = {},
): CaseLead[] {
  const scopedCases = cases.filter((caseFile) => matchesScopeFilters(caseFile, filters));
  const signalContexts = buildCaseSignalContextsByCountry(scopedCases);
  return cases
    .filter((caseFile) => matchesFilters(caseFile, filters))
    .map((caseFile) => toCaseLead(
      caseFile,
      signalContexts.get(caseFile.countryCode) ?? buildCaseSignalContext([caseFile]),
    ))
    .filter((lead): lead is CaseLead => lead !== null)
    .sort((left, right) => right.sortScore - left.sortScore || left.caseId.localeCompare(right.caseId))
    .slice(0, clampLimit(filters.limit));
}

function toCaseLead(caseFile: SignalCaseFile, signalContext: CaseSignalContext): CaseLead | null {
  const signals = buildCaseSignals(caseFile, signalContext);
  const primarySignal = selectLeadCaseSignal(signals);
  if (!primarySignal) return null;

  return {
    leadId: `${caseFile.id}-${primarySignal.code}`,
    caseId: caseFile.id,
    countryCode: caseFile.countryCode as CountryCode,
    caseTitle: caseFile.title,
    sourceId: caseFile.receipt.sourceId,
    sourceName: caseFile.receipt.sourceName,
    caseType: caseFile.caseType ?? null,
    primarySignal,
    signalCount: signals.length,
    why: `${primarySignal.label}: ${primarySignal.summary}`,
    caveat: primarySignal.caveat,
    evidence: primarySignal.evidence,
    nextAction: primarySignal.action,
    sortScore: primarySignal.priority * 100 + Math.min(signals.length, 20),
  };
}

function matchesFilters(caseFile: SignalCaseFile, filters: CaseLeadFilters): boolean {
  if (!matchesScopeFilters(caseFile, filters)) return false;

  const query = clean(filters.query).toLowerCase();
  if (query.length === 0) return true;

  return [
    caseFile.id,
    caseFile.title,
    caseFile.workNumber,
    caseFile.procedureNumber,
    caseFile.agencyName,
    caseFile.contractingUnit,
    caseFile.supplierName,
    caseFile.supplierDocument,
    caseFile.receipt.sourceId,
    caseFile.receipt.sourceName,
  ]
    .filter((value): value is string => value !== null && value !== undefined)
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function matchesScopeFilters(caseFile: SignalCaseFile, filters: CaseLeadFilters): boolean {
  if (filters.countryCode && caseFile.countryCode !== filters.countryCode) return false;
  if (filters.sourceId && caseFile.receipt.sourceId !== filters.sourceId) return false;
  if (filters.caseType && caseFile.caseType !== filters.caseType) return false;
  return true;
}

function clampLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) return 12;
  return Math.min(Math.max(Math.trunc(Number(limit)), 1), 50);
}

function clean(value: string | null | undefined): string {
  return String(value ?? "").trim();
}
