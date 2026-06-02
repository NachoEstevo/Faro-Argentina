import { readCuratedContributionMedia } from "../../../../../../../lib/server/contributionReviewStorage.ts";

interface RouteProps {
  params: Promise<{ id: string; evidenceId: string }>;
}

export async function GET(_request: Request, { params }: RouteProps) {
  const { id, evidenceId } = await params;
  try {
    const media = await readCuratedContributionMedia({
      expedienteId: decodeURIComponent(id),
      evidenceId: decodeURIComponent(evidenceId),
    });
    const body = new ArrayBuffer(media.body.byteLength);
    new Uint8Array(body).set(media.body);
    return new Response(body, {
      headers: {
        "content-type": media.contentType,
        "cache-control": "private, no-store",
        "content-disposition": `inline; filename="${media.filename.replace(/"/g, "")}"`,
      },
    });
  } catch {
    return Response.json(
      {
        error: "curated_media_not_found",
        message: "No encontramos esa imagen curada publicada.",
      },
      { status: 404, headers: { "cache-control": "private, no-store" } },
    );
  }
}
