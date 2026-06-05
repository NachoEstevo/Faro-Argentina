import type { SignalCaseFile } from "./caseSignals.ts";
import { buildEvidenceClaims } from "./evidenceClaimRules.ts";

export type EvidenceClaimCode =
  | "official_record"
  | "declared_amount"
  | "official_budget"
  | "supplier_identity"
  | "competition"
  | "official_location"
  | "declared_progress"
  | "provider_payment"
  | "judicial_context"
  | "budget_execution";

export type EvidenceClaimStatus = "supported" | "partial" | "not_supported";
export type EvidenceClaimConfidence = "high" | "medium" | "low";

export interface EvidenceClaim {
  code: EvidenceClaimCode;
  label: string;
  status: EvidenceClaimStatus;
  confidence: EvidenceClaimConfidence;
  sourceIds: string[];
  evidence: string;
  caveat: string;
  nextStep: string;
}

export interface EvidenceClaimMatrix {
  matrixType: "faro_evidence_claim_matrix_v1";
  caseId: string;
  summary: {
    supported: number;
    partial: number;
    notSupported: number;
    criticalGaps: EvidenceClaimCode[];
  };
  claims: EvidenceClaim[];
}

export function buildEvidenceClaimMatrix(caseFile: SignalCaseFile): EvidenceClaimMatrix {
  const claims = buildEvidenceClaims(caseFile);
  const criticalGaps = claims
    .filter((claim) =>
      claim.status === "not_supported" &&
      (claim.code === "provider_payment" || claim.code === "official_location")
    )
    .map((claim) => claim.code);

  return {
    matrixType: "faro_evidence_claim_matrix_v1",
    caseId: caseFile.id,
    summary: {
      supported: claims.filter((claim) => claim.status === "supported").length,
      partial: claims.filter((claim) => claim.status === "partial").length,
      notSupported: claims.filter((claim) => claim.status === "not_supported").length,
      criticalGaps,
    },
    claims,
  };
}
