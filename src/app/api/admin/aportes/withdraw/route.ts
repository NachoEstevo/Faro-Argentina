import { assertAdminMutationAllowed } from "../../../../../lib/server/adminRequestGuards.ts";
import { requireFaroAdmin } from "../../../../../lib/server/faroAuth.ts";
import {
  ContributionReviewOperationError,
  withdrawContributionEvidence,
} from "../../../../../lib/server/contributionReviewStorage.ts";

export async function POST(request: Request) {
  const guard = assertAdminMutationAllowed(request);
  if (!guard.ok) {
    return Response.json(
      { error: guard.error, message: guard.message },
      { status: guard.status },
    );
  }
  const auth = await requireFaroAdmin();
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, message: auth.message },
      { status: auth.status },
    );
  }

  const payload = await request.json().catch(() => null) as {
    evidenceId?: string;
  } | null;

  try {
    const result = await withdrawContributionEvidence({
      evidenceId: payload?.evidenceId ?? "",
      reviewer: auth.user,
    });
    return Response.json({
      ok: true,
      storageMode: result.storageMode,
      evidence: result.evidence,
    });
  } catch (error) {
    if (error instanceof ContributionReviewOperationError) {
      return Response.json(
        { error: error.error, message: error.message },
        { status: error.status },
      );
    }
    return Response.json(
      {
        error: "curated_evidence_not_found",
        message: "No encontramos esa evidencia curada.",
      },
      { status: 404 },
    );
  }
}
