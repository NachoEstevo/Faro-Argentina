import { buildEvidencePack, getCaseById } from "@/lib/caseRepository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const caseFile = getCaseById(decodeURIComponent(id));
  if (!caseFile) {
    return Response.json({ error: "case_not_found" }, { status: 404 });
  }

  const body = JSON.stringify(buildEvidencePack(caseFile), null, 2);
  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${caseFile.id}.evidence.json"`,
    },
  });
}
