import { getInvestigationCasePacks } from "../../../../lib/caseRepository.ts";

const maxCaseIds = 40;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ids = parseCaseIds(url.searchParams.get("ids"));

  if (ids.length === 0) {
    return Response.json({ error: "missing_case_ids" }, { status: 400 });
  }
  if (ids.length > maxCaseIds) {
    return Response.json({ error: "too_many_case_ids", limit: maxCaseIds }, { status: 400 });
  }

  const result = getInvestigationCasePacks(ids);
  if (result.missingCaseIds.length > 0) {
    return Response.json(
      { error: "case_not_found", missingCaseIds: result.missingCaseIds },
      { status: 404 },
    );
  }

  return Response.json({
    packType: "faro_investigation_case_pack_response",
    generatedAt: new Date().toISOString(),
    casePacks: result.casePacks,
  });
}

function parseCaseIds(value: string | null): string[] {
  return [...new Set(
    String(value ?? "")
      .split(",")
      .map((item) => decodeURIComponent(item).trim())
      .filter(Boolean),
  )];
}
