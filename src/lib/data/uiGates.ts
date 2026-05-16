import { shouldExposeReceiptInUi, type EvidenceReceipt } from "./evidenceReceipts.ts";

interface MapCandidate {
  coordinates: { lat: number; lon: number } | null;
  evidenceLevel: string;
  receipt: EvidenceReceipt;
  caveats: string[];
}

export interface UiExposureStatus {
  expose: boolean;
  reasons: string[];
}

export function getMapExposureStatus(caseFile: MapCandidate): UiExposureStatus {
  const reasons: string[] = [];

  if (!caseFile.coordinates) reasons.push("missing_coordinates");
  if (!shouldExposeReceiptInUi(caseFile.receipt)) reasons.push("missing_receipt");
  if (caseFile.caveats.length === 0) reasons.push("missing_caveats");
  if (caseFile.evidenceLevel !== "official_dataset") reasons.push("unsupported_evidence_level");

  return {
    expose: reasons.length === 0,
    reasons,
  };
}

export function shouldExposeCaseOnMap(caseFile: MapCandidate): boolean {
  return getMapExposureStatus(caseFile).expose;
}
