import type { SignalCaseFile } from "./caseSignals.ts";
import {
  buildSupplierAliasKey,
  resolveSupplierIdentity,
  type SupplierIdentityConfidence,
  type SupplierIdentityMethod,
} from "./entityResolution.ts";

export interface SupplierProfile {
  supplierKey: string;
  supplierLabel: string;
  identityMethod: SupplierIdentityMethod;
  identityConfidence: SupplierIdentityConfidence;
  caseCount: number;
  agencyCount: number;
  totalAmount: number;
  amountCaseCount: number;
  singleBidCaseCount: number;
  lowCompetitionCaseCount: number;
  caseIds: string[];
}

export interface SupplierAgencyProfile {
  supplierKey: string;
  agencyKey: string;
  agencyLabel: string;
  caseCount: number;
  totalAmount: number;
  singleBidCaseCount: number;
  lowCompetitionCaseCount: number;
  caseIds: string[];
}

export interface SupplierAliasGroup {
  aliasKey: string;
  variants: string[];
  caseIds: string[];
}

export interface CaseSignalContext {
  supplierProfiles: Map<string, SupplierProfile>;
  supplierAgencyProfiles: Map<string, SupplierAgencyProfile>;
  aliasGroups: Map<string, SupplierAliasGroup>;
  caseMetricsById: Map<string, CaseContextMetrics>;
}

export interface CaseContextMetrics {
  supplierProfile: SupplierProfile | null;
  supplierAgencyProfile: SupplierAgencyProfile | null;
  aliasGroup: SupplierAliasGroup | null;
}

export function buildCaseSignalContext(cases: SignalCaseFile[]): CaseSignalContext {
  const supplierProfiles = new Map<string, MutableSupplierProfile>();
  const supplierAgencyProfiles = new Map<string, MutableSupplierAgencyProfile>();
  const aliasGroups = new Map<string, MutableSupplierAliasGroup>();

  for (const caseFile of cases) {
    const supplierIdentity = resolveSupplierIdentity(caseFile);
    if (!supplierIdentity) continue;

    const supplierKey = supplierIdentity.key;
    const supplierLabel = supplierIdentity.label;
    const agencyKey = normalizeKey(caseFile.agencyName);
    const agencyLabel = firstPresent(caseFile.agencyName, caseFile.agencyCode, "Organismo sin nombre");
    const amountValue = positiveAmount(caseFile.amount?.value);
    const bidderCount = numberOrNull(caseFile.bidderCount);
    const isSingleBid = bidderCount === 1;
    const isLowCompetition = bidderCount !== null && bidderCount <= 3;

    const supplierProfile = supplierProfiles.get(supplierKey) ?? {
      supplierKey,
      supplierLabel,
      identityMethod: supplierIdentity.method,
      identityConfidence: supplierIdentity.confidence,
      agencies: new Set<string>(),
      caseCount: 0,
      totalAmount: 0,
      amountCaseCount: 0,
      singleBidCaseCount: 0,
      lowCompetitionCaseCount: 0,
      caseIds: [],
    };
    supplierProfile.caseCount += 1;
    supplierProfile.agencies.add(agencyKey);
    supplierProfile.caseIds.push(caseFile.id);
    if (amountValue !== null) {
      supplierProfile.totalAmount += amountValue;
      supplierProfile.amountCaseCount += 1;
    }
    if (isSingleBid) supplierProfile.singleBidCaseCount += 1;
    if (isLowCompetition) supplierProfile.lowCompetitionCaseCount += 1;
    supplierProfiles.set(supplierKey, supplierProfile);

    const supplierAgencyKey = `${supplierKey}::${agencyKey}`;
    const supplierAgencyProfile = supplierAgencyProfiles.get(supplierAgencyKey) ?? {
      supplierKey,
      agencyKey,
      agencyLabel,
      caseCount: 0,
      totalAmount: 0,
      singleBidCaseCount: 0,
      lowCompetitionCaseCount: 0,
      caseIds: [],
    };
    supplierAgencyProfile.caseCount += 1;
    supplierAgencyProfile.caseIds.push(caseFile.id);
    if (amountValue !== null) supplierAgencyProfile.totalAmount += amountValue;
    if (isSingleBid) supplierAgencyProfile.singleBidCaseCount += 1;
    if (isLowCompetition) supplierAgencyProfile.lowCompetitionCaseCount += 1;
    supplierAgencyProfiles.set(supplierAgencyKey, supplierAgencyProfile);

    const aliasKey = buildSupplierAliasKey(caseFile.supplierName);
    if (aliasKey) {
      const aliasGroup = aliasGroups.get(aliasKey) ?? {
        aliasKey,
        variants: new Set<string>(),
        caseIds: [],
      };
      aliasGroup.variants.add(clean(caseFile.supplierName));
      aliasGroup.caseIds.push(caseFile.id);
      aliasGroups.set(aliasKey, aliasGroup);
    }
  }

  const finalizedSupplierProfiles = new Map<string, SupplierProfile>();
  supplierProfiles.forEach((profile, key) => {
    finalizedSupplierProfiles.set(key, {
      supplierKey: profile.supplierKey,
      supplierLabel: profile.supplierLabel,
      identityMethod: profile.identityMethod,
      identityConfidence: profile.identityConfidence,
      caseCount: profile.caseCount,
      agencyCount: profile.agencies.size,
      totalAmount: profile.totalAmount,
      amountCaseCount: profile.amountCaseCount,
      singleBidCaseCount: profile.singleBidCaseCount,
      lowCompetitionCaseCount: profile.lowCompetitionCaseCount,
      caseIds: profile.caseIds,
    });
  });

  const finalizedSupplierAgencyProfiles = new Map<string, SupplierAgencyProfile>();
  supplierAgencyProfiles.forEach((profile, key) => {
    finalizedSupplierAgencyProfiles.set(key, { ...profile });
  });

  const finalizedAliasGroups = new Map<string, SupplierAliasGroup>();
  aliasGroups.forEach((group, key) => {
    finalizedAliasGroups.set(key, {
      aliasKey: group.aliasKey,
      variants: Array.from(group.variants).sort((left, right) => left.localeCompare(right)),
      caseIds: group.caseIds,
    });
  });

  return {
    supplierProfiles: finalizedSupplierProfiles,
    supplierAgencyProfiles: finalizedSupplierAgencyProfiles,
    aliasGroups: finalizedAliasGroups,
    caseMetricsById: buildCaseMetrics(cases, finalizedSupplierProfiles, finalizedSupplierAgencyProfiles, finalizedAliasGroups),
  };
}

export function buildCaseSignalContextsByCountry(cases: SignalCaseFile[]): Map<string, CaseSignalContext> {
  const casesByCountry = new Map<string, SignalCaseFile[]>();
  for (const caseFile of cases) {
    const countryCases = casesByCountry.get(caseFile.countryCode) ?? [];
    countryCases.push(caseFile);
    casesByCountry.set(caseFile.countryCode, countryCases);
  }

  const contexts = new Map<string, CaseSignalContext>();
  casesByCountry.forEach((countryCases, countryCode) => {
    contexts.set(countryCode, buildCaseSignalContext(countryCases));
  });
  return contexts;
}

export function emptyCaseSignalContext(): CaseSignalContext {
  return {
    supplierProfiles: new Map(),
    supplierAgencyProfiles: new Map(),
    aliasGroups: new Map(),
    caseMetricsById: new Map(),
  };
}

function buildCaseMetrics(
  cases: SignalCaseFile[],
  supplierProfiles: Map<string, SupplierProfile>,
  supplierAgencyProfiles: Map<string, SupplierAgencyProfile>,
  aliasGroups: Map<string, SupplierAliasGroup>,
) {
  const metrics = new Map<string, CaseContextMetrics>();
  for (const caseFile of cases) {
    const supplierIdentity = resolveSupplierIdentity(caseFile);
    const supplierKey = supplierIdentity?.key ?? null;
    const agencyKey = normalizeKey(caseFile.agencyName);
    const aliasKey = buildSupplierAliasKey(caseFile.supplierName);
    metrics.set(caseFile.id, {
      supplierProfile: supplierKey ? supplierProfiles.get(supplierKey) ?? null : null,
      supplierAgencyProfile: supplierKey ? supplierAgencyProfiles.get(`${supplierKey}::${agencyKey}`) ?? null : null,
      aliasGroup: aliasKey ? aliasGroups.get(aliasKey) ?? null : null,
    });
  }
  return metrics;
}

function normalizeKey(value: string | null | undefined): string {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function positiveAmount(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function numberOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function firstPresent(...values: Array<string | null | undefined>): string {
  return values.find((value) => clean(value).length > 0) ?? "Sin dato";
}

function clean(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

interface MutableSupplierProfile {
  supplierKey: string;
  supplierLabel: string;
  identityMethod: SupplierIdentityMethod;
  identityConfidence: SupplierIdentityConfidence;
  agencies: Set<string>;
  caseCount: number;
  totalAmount: number;
  amountCaseCount: number;
  singleBidCaseCount: number;
  lowCompetitionCaseCount: number;
  caseIds: string[];
}

interface MutableSupplierAgencyProfile {
  supplierKey: string;
  agencyKey: string;
  agencyLabel: string;
  caseCount: number;
  totalAmount: number;
  singleBidCaseCount: number;
  lowCompetitionCaseCount: number;
  caseIds: string[];
}

interface MutableSupplierAliasGroup {
  aliasKey: string;
  variants: Set<string>;
  caseIds: string[];
}
