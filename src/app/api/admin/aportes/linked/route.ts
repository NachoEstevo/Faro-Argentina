import { requireFaroReviewer } from "../../../../../lib/server/faroAuth.ts";
import {
  ContributionReviewOperationError,
  isContributionReviewLinkTarget,
  listLinkedContributionReviews,
} from "../../../../../lib/server/contributionReviewStorage.ts";

export async function GET(request: Request) {
  const auth = await requireFaroReviewer();
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, message: auth.message },
      { status: auth.status },
    );
  }

  const url = new URL(request.url);
  const targetType = url.searchParams.get("targetType") ?? "";
  const targetId = url.searchParams.get("targetId") ?? "";
  if (!isContributionReviewLinkTarget(targetType)) {
    return Response.json(
      {
        error: "invalid_review_link_target",
        message: "Elegí si querés revisar un expediente o una carpeta.",
      },
      { status: 400 },
    );
  }

  try {
    const linked = await listLinkedContributionReviews({ targetType, targetId });
    return Response.json({
      viewType: "faro_admin_linked_aportes_v1",
      generatedAt: new Date().toISOString(),
      storageMode: linked.storageMode,
      target: linked.target,
      stats: {
        linkedContributions: linked.contributions.length,
        privateFiles: linked.contributions.reduce(
          (total, item) => total + item.contribution.attachments.length,
          0,
        ),
      },
      contributions: linked.contributions.map(({ contribution, link }) => ({
        id: contribution.id,
        title: contribution.title,
        status: contribution.status,
        explanation: contribution.explanation,
        publicSourceUrl: contribution.publicSourceUrl,
        relatedCase: contribution.relatedCase,
        missingVerification: contribution.missingVerification,
        contactName: contribution.contactName,
        contactEmail: contribution.contactEmail,
        createdAt: contribution.createdAt,
        attachments: contribution.attachments,
        link,
      })),
    });
  } catch (error) {
    if (error instanceof ContributionReviewOperationError) {
      return Response.json(
        { error: error.error, message: error.message },
        { status: error.status },
      );
    }
    return Response.json(
      { error: "linked_aportes_unavailable", message: "No se pudo cargar el material asociado." },
      { status: 500 },
    );
  }
}
