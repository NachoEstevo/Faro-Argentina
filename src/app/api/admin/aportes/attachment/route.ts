import { requireFaroReviewer } from "../../../../../lib/server/faroAuth.ts";
import {
  ContributionReviewOperationError,
  readContributionAttachmentForReview,
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
