import { getCaseReportById } from "../caseRepository.ts";
import type { CaseReportView } from "../data/caseReport.ts";
import { toPublicCuratedContributionEvidence } from "../data/userContributions.ts";
import { listPublishedCuratedContributionEvidence } from "./contributionReviewStorage.ts";

export async function getCaseReportByIdWithCuratedEvidence(id: string): Promise<CaseReportView | null> {
  const report = getCaseReportById(id);
  if (!report) return null;
  try {
    const curatedEvidence = await listPublishedCuratedContributionEvidence(id);
    return { ...report, curatedEvidence: curatedEvidence.map(toPublicCuratedContributionEvidence) };
  } catch {
    return report;
  }
}
