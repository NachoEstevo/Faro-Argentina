import { NextResponse } from "next/server";

import { buildSignalFeed } from "@/lib/caseRepository";
import { paginateItems, parsePagination } from "@/lib/api/pagination";
import type { CountryCode } from "@/lib/data/sourceCatalog";

const countries: CountryCode[] = ["AR", "PE", "CL"];
const defaultLimit = 100;
const maxLimit = 200;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const country = url.searchParams.get("country") as CountryCode | null;
  const sourceId = url.searchParams.get("sourceId") ?? undefined;
  const caseType = url.searchParams.get("caseType") ?? undefined;
  const query = url.searchParams.get("q") ?? undefined;

  if (country && !countries.includes(country)) {
    return NextResponse.json({ error: "unsupported_country" }, { status: 400 });
  }

  const feed = buildSignalFeed({
    countryCode: country ?? undefined,
    sourceId,
    caseType,
    query,
  });
  const result = paginateItems(
    feed.signals,
    parsePagination(url.searchParams, { defaultLimit, maxLimit }),
  );

  return NextResponse.json({
    ...feed,
    signals: result.items,
    pagination: {
      ...result.pagination,
      defaultLimit,
      maxLimit,
    },
  });
}
