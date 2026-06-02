import { assertAdminMutationAllowed } from "../../../../../lib/server/adminRequestGuards.ts";
import { toPublicCuratedContributionEvidence } from "../../../../../lib/data/userContributions.ts";
import { requireFaroAdmin } from "../../../../../lib/server/faroAuth.ts";
import {
  ContributionReviewOperationError,
  promoteContributionEvidence,
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
    submissionId?: string;
    expedienteId?: string;
    status?: string;
    title?: string;
    caption?: string;
    caveat?: string;
    sourceLabel?: string;
    permissionNote?: string;
    reviewedByName?: string;
    internalNote?: string;
    attachmentId?: string;
    mediaAltText?: string;
  } | null;

  try {
    const result = await promoteContributionEvidence({
      submissionId: payload?.submissionId ?? "",
      expedienteId: payload?.expedienteId ?? "",
      status: payload?.status === "published_curated" ? "published_curated" : "candidate",
      title: payload?.title ?? "",
      caption: payload?.caption ?? "",
      caveat: payload?.caveat ?? "",
      sourceLabel: payload?.sourceLabel ?? "",
      permissionNote: payload?.permissionNote ?? "",
      reviewedByName: payload?.reviewedByName,
      internalNote: payload?.internalNote,
      attachmentId: payload?.attachmentId,
      mediaAltText: payload?.mediaAltText,
      reviewer: auth.user,
    });
    return Response.json({
      ok: true,
      storageMode: result.storageMode,
      contribution: result.contribution,
      evidence: {
        ...result.evidence,
        media: toPublicCuratedContributionEvidence(result.evidence).media,
      },
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
        error: "submission_not_found",
        message: "No encontramos ese aporte en la bandeja privada.",
      },
      { status: 404 },
    );
  }
}
