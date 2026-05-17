import { NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { buildCaseCollectionPack, investigatorCaseFiles } from "@/lib/caseRepository";
import { buildCollectionExportManifest } from "@/lib/api/exportManifest";
import {
  buildCoreStaticExportFilters,
  buildStaticExportFileName,
  buildStaticExportHref,
  findStaticExportArtifact,
  type StaticExportArtifact,
} from "@/lib/data/staticExportArtifacts";
import type { CountryCode } from "@/lib/data/sourceCatalog";

const countries: CountryCode[] = ["AR", "PE", "CL"];
const functionPayloadGuardBytes = 4_000_000;
const staticExportArtifacts = buildCoreStaticExportFilters(investigatorCaseFiles).map((filters) => ({
  filters,
  fileName: buildStaticExportFileName(filters),
  href: buildStaticExportHref(filters),
}));

export async function GET(request: Request) {
  const url = new URL(request.url);
  const country = url.searchParams.get("country") as CountryCode | null;
  const sourceId = url.searchParams.get("sourceId") ?? undefined;
  const caseType = url.searchParams.get("caseType") ?? undefined;
  const query = url.searchParams.get("q") ?? undefined;

  if (country && !countries.includes(country)) {
    return NextResponse.json({ error: "unsupported_country" }, { status: 400 });
  }

  const filters = {
    countryCode: country ?? undefined,
    sourceId,
    caseType,
    query,
  };
  const artifact = query ? null : findStaticExportArtifact(filters, staticExportArtifacts);
  if (artifact && staticExportExists(artifact)) {
    return NextResponse.redirect(new URL(artifact.href, url.origin), 303);
  }

  const pack = buildCaseCollectionPack({
    countryCode: filters.countryCode,
    sourceId,
    caseType,
    query,
  });
  const body = JSON.stringify(pack, null, 2);

  if (Buffer.byteLength(body, "utf8") > functionPayloadGuardBytes) {
    return NextResponse.json(
      buildCollectionExportManifest(pack, artifact),
      {
        headers: {
          "x-faro-export-mode": artifact ? "static-artifact-missing" : "manifest",
        },
      },
    );
  }

  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${buildFileName(country, sourceId, caseType)}"`,
      "x-faro-export-mode": "inline",
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

function staticExportExists(artifact: StaticExportArtifact): boolean {
  return existsSync(join(process.cwd(), "public", artifact.href.replace(/^\//, "")));
}
