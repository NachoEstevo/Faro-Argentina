import { NextResponse } from "next/server";

import {
  dataSpineCoverage,
  sourceCatalogEntries,
} from "@/lib/caseRepository";

export async function GET() {
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    coverage: dataSpineCoverage,
    sources: sourceCatalogEntries.map((source) => ({
      sourceId: source.sourceId,
      countryCode: source.countryCode,
      name: source.name,
      agency: source.agency,
      category: source.category,
      priority: source.priority,
      accessMode: source.accessMode,
      format: source.format,
      sourceUrl: source.sourceUrl,
      downloadUrl: source.downloadUrl,
      updateFrequency: source.updateFrequency,
      keyFields: source.keyFields,
      caveats: source.caveats,
    })),
  });
}
