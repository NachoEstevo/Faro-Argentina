import { verifyAdminAccess } from "../../../../../lib/server/adminAccess.ts";
import { readContributionAttachment } from "../../../../../lib/server/contributionReviewStorage.ts";

export async function GET(request: Request) {
  const accessFailure = verifyAdminAccess(request);
  if (accessFailure) {
    return Response.json(accessFailure, { status: accessFailure.status });
  }
  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? "";
  if (!key.startsWith("submissions/")) {
    return Response.json(
      { error: "invalid_attachment_key", message: "Archivo no disponible para revisión." },
      { status: 400 },
    );
  }

  try {
    const attachment = await readContributionAttachment(key);
    return new Response(Buffer.from(attachment.body), {
      headers: {
        "content-type": attachment.contentType,
        "content-disposition": `inline; filename="${attachment.filename}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch {
    return Response.json(
      { error: "attachment_not_found", message: "No encontramos el archivo solicitado." },
      { status: 404 },
    );
  }
}
