import { NextResponse } from "next/server";

import { buildSignalFeed } from "@/lib/caseRepository";
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

  return NextResponse.json(
    buildSignalFeed({
      countryCode: country ?? undefined,
      sourceId,
      caseType,
      query,
    }),
  );
}
