import type { EvidenceReceipt } from "./evidenceReceipts.ts";
import type { FxConversion, FxConversionNote } from "./fx.ts";
import type { GeoEvidenceItem } from "./geoEvidence.ts";

export type ArgentinaContractCaseType = "procurement_contract";

export interface ArgentinaContractCaseFile {
  id: string;
  countryCode: "AR";
  caseType: ArgentinaContractCaseType;
  workNumber: string;
  publicWorkNumber?: string | null;
  year: number | null;
  title: string;
  procedureNumber: string;
  agencyName: string;
  agencyCode: string;
  contractingUnit: string;
  executionTerm: string | null;
  executionTermType: string | null;
  coordinates: { lat: number; lon: number } | null;
  locationName?: string | null;
  locationSource?: string | null;
  geoEvidence?: GeoEvidenceItem[];
  publishedAt?: string | null;
  closedAt?: string | null;
  openingAt?: string | null;
  awardedAt?: string | null;
  awardActUrl?: string | null;
  awardNumber?: string | null;
  procedureState?: string | null;
  bidderCount?: number | null;
  offerCount?: number | null;
  claimCount?: number | null;
  buyerUnitCode?: string | null;
  buyerUnitRut?: string | null;
  buyerAddress?: string | null;
  buyerDepartment?: string | null;
  buyerRegion?: string | null;
  buyerCommune?: string | null;
  procurementMethodDetails?: string | null;
  itemCount?: number | null;
  awardedLineCount?: number | null;
  workProvince?: string | null;
  workDepartment?: string | null;
  workLocality?: string | null;
  evidenceLevel: "official_dataset";
  amount: {
    value: number;
    currency: string;
    label: string;
    usdEquivalent: FxConversion | null;
    usdConversionNote?: FxConversionNote;
  } | null;
  officialBudget?: {
    value: number;
    currency: string;
    label: string;
    usdEquivalent: FxConversion | null;
    usdConversionNote?: FxConversionNote;
  } | null;
  supplierName: string | null;
  supplierDocument: string | null;
  supplierLocality?: string | null;
  supplierProvince?: string | null;
  receipt: EvidenceReceipt;
  relatedReceipts?: EvidenceReceipt[];
  caveats: string[];
}
