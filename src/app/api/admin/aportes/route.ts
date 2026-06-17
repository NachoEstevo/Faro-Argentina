import { CONTRIBUTION_REVIEW_STATUSES, type ContributionReviewStatus } from "../../../../lib/data/userContributions.ts";
import { assertAdminMutationAllowed } from "../../../../lib/server/adminRequestGuards.ts";
import { requireFaroReviewer } from "../../../../lib/server/faroAuth.ts";
import { appendContributionAuditEvent } from "../../../../lib/server/contributionAuditDb.ts";
import {
  ContributionReviewOperationError,
  isContributionReviewStatus,
  isContributionReviewLinkTarget,
  linkContributionToReviewTarget,
  listContributionReviews,
  updateContributionInboxState,
  updateContributionReview,
} from "../../../../lib/server/contributionReviewStorage.ts";
import { isProductDatabaseConfigured } from "../../../../lib/server/productDb.ts";

export async function GET(request: Request) {
  const auth = await requireFaroReviewer();
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, message: auth.message },
      { status: auth.status },
    );
  }

  const inbox = await listContributionReviews();
  if (isProductDatabaseConfigured()) {
    await appendContributionAuditEvent({
      action: "admin_inbox_opened",
      actor: auth.user,
      targetType: "admin_inbox",
      targetId: "aportes",
      metadata: {
        storageMode: inbox.storageMode,
        submissionCount: inbox.submissions.length,
        userAgent: request.headers.get("user-agent") ?? undefined,
      },
    }).catch(() => null);
  }
  return Response.json({
    inboxType: "faro_admin_aportes_inbox_v1",
    generatedAt: new Date().toISOString(),
    storageMode: inbox.storageMode,
    statuses: CONTRIBUTION_REVIEW_STATUSES,
    stats: inbox.stats,
    submissions: inbox.submissions,
  });
}

export async function PATCH(request: Request) {
  const guard = assertAdminMutationAllowed(request);
  if (!guard.ok) {
    return Response.json(
      { error: guard.error, message: guard.message },
      { status: guard.status },
    );
  }
  const auth = await requireFaroReviewer();
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, message: auth.message },
      { status: auth.status },
    );
  }

  const payload = await request.json().catch(() => null) as {
    submissionId?: string;
    status?: string;
    inboxState?: string;
    note?: string;
  } | null;
  if (payload?.inboxState) {
    if (payload.inboxState !== "active" && payload.inboxState !== "archived" && payload.inboxState !== "removed") {
      return Response.json(
        {
          error: "invalid_inbox_state",
          message: "Elegí una acción de bandeja válida.",
        },
        { status: 400 },
      );
    }
    if (!payload?.submissionId) {
      return Response.json(
        {
          error: "missing_submission_id",
          message: "Falta el identificador del aporte.",
        },
        { status: 400 },
      );
    }
    try {
      const result = await updateContributionInboxState({
        submissionId: payload.submissionId,
        inboxState: payload.inboxState,
        note: payload.note,
        reviewer: auth.user,
      });
      return Response.json({
        ok: true,
        changed: result.changed,
        storageMode: result.storageMode,
        contribution: result.contribution,
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
  const status = payload?.status ?? "";
  if (!isContributionReviewStatus(status)) {
    return Response.json(
      {
        error: "invalid_review_status",
        message: "Elegí un estado de revisión válido.",
      },
      { status: 400 },
    );
  }
  if (!payload?.submissionId) {
    return Response.json(
      {
        error: "missing_submission_id",
        message: "Falta el identificador del aporte.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await updateContributionReview({
      submissionId: payload.submissionId,
      status: status as ContributionReviewStatus,
      note: payload.note,
      reviewer: auth.user,
    });
    return Response.json({
      ok: true,
      changed: result.changed,
      storageMode: result.storageMode,
      contribution: result.contribution,
    });
  } catch {
    return Response.json(
      {
        error: "submission_not_found",
        message: "No encontramos ese aporte en la bandeja privada.",
      },
      { status: 404 },
    );
  }
}

export async function POST(request: Request) {
  const guard = assertAdminMutationAllowed(request);
  if (!guard.ok) {
    return Response.json(
      { error: guard.error, message: guard.message },
      { status: guard.status },
    );
  }
  const auth = await requireFaroReviewer();
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, message: auth.message },
      { status: auth.status },
    );
  }

  const payload = await request.json().catch(() => null) as {
    submissionId?: string;
    targetType?: string;
    targetId?: string;
    targetLabel?: string;
    note?: string;
  } | null;

  if (!payload?.submissionId) {
    return Response.json(
      {
        error: "missing_submission_id",
        message: "Falta el identificador del aporte.",
      },
      { status: 400 },
    );
  }
  const targetType = payload.targetType ?? "";
  if (!isContributionReviewLinkTarget(targetType)) {
    return Response.json(
      {
        error: "invalid_review_link_target",
        message: "Elegí si el aporte se vincula a un expediente o a un espacio privado.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await linkContributionToReviewTarget({
      submissionId: payload.submissionId,
      targetType,
      targetId: payload.targetId ?? "",
      targetLabel: payload.targetLabel,
      note: payload.note,
      reviewer: auth.user,
    });
    return Response.json({
      ok: true,
      storageMode: result.storageMode,
      contribution: result.contribution,
      link: result.link,
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
