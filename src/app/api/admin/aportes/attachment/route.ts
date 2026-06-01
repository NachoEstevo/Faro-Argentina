import { requireFaroReviewer } from "../../../../../lib/server/faroAuth.ts";
import { assertRateLimit } from "../../../../../lib/server/requestGuards.ts";
import {
  ContributionReviewOperationError,
  readContributionAttachmentForReview,
} from "../../../../../lib/server/contributionReviewStorage.ts";

const ADMIN_ATTACHMENT_READ_WINDOW_MS = 60_000;
const ADMIN_ATTACHMENT_READ_LIMIT = 60;

export async function GET(request: Request) {
  const auth = await requireFaroReviewer();
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, message: auth.message },
      { status: auth.status },
    );
  }
  const rateLimit = assertRateLimit(
    `admin_attachment:${auth.user.clerkUserId}:${clientIdentifier(request)}`,
    {
      namespace: "admin_attachment",
      windowMs: ADMIN_ATTACHMENT_READ_WINDOW_MS,
      limit: ADMIN_ATTACHMENT_READ_LIMIT,
      error: "admin_attachment_rate_limited",
      message: "Demasiadas aperturas de adjuntos en poco tiempo. Esperá un momento y volvé a intentar.",
    },
  );
  if (!rateLimit.ok) {
    return Response.json(
      { error: rateLimit.error, message: rateLimit.message },
      { status: rateLimit.status },
    );
  }
  const url = new URL(request.url);
  const submissionId = url.searchParams.get("submissionId") ?? "";
  const attachmentId = url.searchParams.get("attachmentId") ?? "";

  try {
    const attachment = await readContributionAttachmentForReview({
      submissionId,
      attachmentId,
      reviewer: auth.user,
    });
    return new Response(Buffer.from(attachment.body), {
      headers: {
        "content-type": attachment.contentType,
        "content-disposition": `inline; filename="${attachment.filename}"`,
        "cache-control": "private, no-store",
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
      { error: "attachment_not_found", message: "No encontramos el archivo solicitado." },
      { status: 404 },
    );
  }
}

function clientIdentifier(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    new URL(request.url).host;
}
