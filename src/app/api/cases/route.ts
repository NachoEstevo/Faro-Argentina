import { NextResponse } from "next/server";

import { getCasesByCountry } from "@/lib/caseRepository";
import type { CountryCode } from "@/lib/data/sourceCatalog";

const countries: CountryCode[] = ["AR", "PE", "CL"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const country = url.searchParams.get("country") as CountryCode | null;
  const selectedCountries = country ? [country] : countries;

  if (country && !countries.includes(country)) {
    return NextResponse.json({ error: "unsupported_country" }, { status: 400 });
  }

  return NextResponse.json({
    countries: Object.fromEntries(
      selectedCountries.map((countryCode) => [
        countryCode,
        getCasesByCountry(countryCode),
      ]),
    ),
  });
}
