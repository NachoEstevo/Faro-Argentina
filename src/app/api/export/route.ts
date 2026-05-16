import { NextResponse } from "next/server";

import { buildCaseCollectionPack } from "@/lib/caseRepository";
import type { CountryCode } from "@/lib/data/sourceCatalog";

const countries: CountryCode[] = ["AR", "PE", "CL"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const country = url.searchParams.get("country") as CountryCode | null;
  const sourceId = url.searchParams.get("sourceId") ?? undefined;
  const caseType = url.searchParams.get("caseType") ?? undefined;
  const query = url.searchParams.get("q") ?? undefined;

  if (country && !countries.includes(country)) {
    return NextResponse.json({ error: "unsupported_country" }, { status: 400 });
  }

  const pack = buildCaseCollectionPack({
    countryCode: country ?? undefined,
    sourceId,
    caseType,
    query,
  });

  return new Response(JSON.stringify(pack, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${buildFileName(country, sourceId, caseType)}"`,
    },
  });
}

function buildFileName(
  country: CountryCode | null,
  sourceId: string | undefined,
  caseType: string | undefined,
): string {
  return [
    "faro",
    country ?? "all",
    sourceId ?? "all-sources",
    caseType ?? "all-types",
  ].join("-").toLowerCase().replace(/[^a-z0-9-]+/g, "-") + ".evidence.json";
}
