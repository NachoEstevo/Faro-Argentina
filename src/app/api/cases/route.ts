import { NextResponse } from "next/server";

import { getCasesByCountry } from "@/lib/caseRepository";
import { paginateItems, parsePagination } from "@/lib/api/pagination";
import type { CountryCode } from "@/lib/data/sourceCatalog";

const countries: CountryCode[] = ["AR", "PE", "CL"];
const defaultLimit = 100;
const maxLimit = 200;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const country = url.searchParams.get("country") as CountryCode | null;
  const selectedCountries = country ? [country] : countries;

  if (country && !countries.includes(country)) {
    return NextResponse.json({ error: "unsupported_country" }, { status: 400 });
  }

  const page = parsePagination(url.searchParams, { defaultLimit, maxLimit });
  const entries = selectedCountries.map((countryCode) => {
    const result = paginateItems(getCasesByCountry(countryCode), page);
    return [countryCode, result] as const;
  });

  return NextResponse.json({
    countries: Object.fromEntries(entries.map(([countryCode, result]) => [countryCode, result.items])),
    pagination: {
      defaultLimit,
      maxLimit,
      countries: Object.fromEntries(
        entries.map(([countryCode, result]) => [countryCode, result.pagination]),
      ),
    },
  });
}
