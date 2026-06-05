import type { SignalCaseFile } from "./caseSignals.ts";
import type { EvidenceClaim } from "./evidenceClaimMatrix.ts";
import {
  competitionClaim,
  declaredAmountClaim,
  officialBudgetClaim,
  officialRecordClaim,
  supplierIdentityClaim,
} from "./evidenceClaimDirectRules.ts";
import {
  budgetExecutionClaim,
  declaredProgressClaim,
  judicialContextClaim,
  officialLocationClaim,
  providerPaymentClaim,
} from "./evidenceClaimContextRules.ts";
import { sourceIdsForCase } from "./evidenceClaimRuleUtils.ts";

export function buildEvidenceClaims(caseFile: SignalCaseFile): EvidenceClaim[] {
  const sourceIds = sourceIdsForCase(caseFile);
  return [
    officialRecordClaim(caseFile, sourceIds),
    declaredAmountClaim(caseFile, sourceIds),
    officialBudgetClaim(caseFile, sourceIds),
    supplierIdentityClaim(caseFile, sourceIds),
    competitionClaim(caseFile, sourceIds),
    officialLocationClaim(caseFile, sourceIds),
    declaredProgressClaim(caseFile, sourceIds),
    providerPaymentClaim(),
    judicialContextClaim(caseFile, sourceIds),
    budgetExecutionClaim(caseFile, sourceIds),
  ];
}
