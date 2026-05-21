import { NextResponse } from "next/server";

import { buildLeadFeed } from "@/lib/caseRepository";
import type { CountryCode } from "@/lib/data/sourceCatalog";

const countries: CountryCode[] = ["AR"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const country = url.searchParams.get("country") as CountryCode | null;

  if (country && !countries.includes(country)) {
    return NextResponse.json({ error: "unsupported_country" }, { status: 400 });
  }

  return NextResponse.json(
    buildLeadFeed({
      countryCode: country ?? undefined,
      sourceId: valueOrUndefined(url.searchParams.get("sourceId")),
      caseType: valueOrUndefined(url.searchParams.get("caseType")),
      query: valueOrUndefined(url.searchParams.get("q")),
      limit: numberOrUndefined(url.searchParams.get("limit")),
    }),
  );
}

function valueOrUndefined(value: string | null): string | undefined {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function numberOrUndefined(value: string | null): number | undefined {
  if (value === null) return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}
