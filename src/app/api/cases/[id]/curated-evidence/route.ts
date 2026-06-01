import { toPublicCuratedContributionEvidence } from "../../../../../lib/data/userContributions.ts";
import { listPublishedCuratedContributionEvidence } from "../../../../../lib/server/contributionReviewStorage.ts";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteProps) {
  const { id } = await params;
  try {
    const evidence = await listPublishedCuratedContributionEvidence(decodeURIComponent(id));
    return Response.json(
      {
        evidenceType: "faro_public_curated_contribution_evidence_v1",
        generatedAt: new Date().toISOString(),
        caseId: decodeURIComponent(id),
        evidence: evidence.map(toPublicCuratedContributionEvidence),
      },
      {
        headers: {
          "cache-control": "private, no-store",
        },
      },
    );
  } catch {
    return Response.json(
      {
        evidenceType: "faro_public_curated_contribution_evidence_v1",
        generatedAt: new Date().toISOString(),
        caseId: decodeURIComponent(id),
        evidence: [],
      },
      {
        headers: {
          "cache-control": "private, no-store",
        },
      },
    );
  }
}
