import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCaseCollectionPack,
  buildSignalFeed,
  getCasesByCountry,
  investigatorCaseFiles,
} from "../src/lib/caseRepository.ts";
import { buildCollectionExportManifest } from "../src/lib/api/exportManifest.ts";
import { paginateItems } from "../src/lib/api/pagination.ts";
import {
  buildCoreStaticExportFilters,
  buildStaticExportFileName,
  findStaticExportArtifact,
} from "../src/lib/data/staticExportArtifacts.ts";

const vercelFunctionPayloadLimit = 4_500_000;

test("/api/cases defaults to paginated country collections", async () => {
  const ar = paginateItems(getCasesByCountry("AR"), { offset: 0, limit: 100 });
  const pe = paginateItems(getCasesByCountry("PE"), { offset: 0, limit: 100 });
  const cl = paginateItems(getCasesByCountry("CL"), { offset: 0, limit: 100 });

  assert.equal(ar.items.length, 100);
  assert.equal(pe.items.length, 100);
  assert.equal(cl.items.length, 100);
  assert.equal(ar.pagination.hasMore, true);
  assert.equal(pe.pagination.hasMore, true);
  assert.equal(cl.pagination.hasMore, true);
});

test("/api/signals defaults to a bounded response under Vercel's Function payload cap", async () => {
  const feed = buildSignalFeed({});
  const result = paginateItems(feed.signals, { offset: 0, limit: 100 });
  const body = JSON.stringify({ ...feed, signals: result.items, pagination: result.pagination });

  assert.equal(result.items.length, 100);
  assert.equal(result.pagination.returned, 100);
  assert.equal(result.pagination.hasMore, true);
  assert.equal(result.pagination.total, feed.stats.signals);
  assert.equal(Buffer.byteLength(body, "utf8") < vercelFunctionPayloadLimit, true);
});

test("/api/export can map core exports to deterministic static artifact paths", () => {
  const artifacts = buildCoreStaticExportFilters(investigatorCaseFiles).map((filters) => ({
    filters,
    fileName: buildStaticExportFileName(filters),
    href: `/exports/${buildStaticExportFileName(filters)}`,
  }));
  const artifact = findStaticExportArtifact({ countryCode: "PE" }, artifacts);

  assert.equal(artifact?.fileName, "faro-pe-all-sources-all-types.evidence.json");
  assert.equal(artifact?.href, "/exports/faro-pe-all-sources-all-types.evidence.json");
});

test("/api/export returns a bounded manifest for non-static large exports", async () => {
  const pack = buildCaseCollectionPack({ countryCode: "PE", query: "CONTRATO" });
  const body = JSON.stringify(buildCollectionExportManifest(pack, null));
  const payload = JSON.parse(body) as {
    packType: string;
    reason: string;
    stats: { caseFiles: number };
    caseEvidenceLinks: unknown[];
  };

  assert.equal(payload.packType, "faro_collection_export_manifest");
  assert.equal(payload.reason, "function_payload_guard");
  assert.equal(payload.caseEvidenceLinks.length, payload.stats.caseFiles);
  assert.equal(Buffer.byteLength(body, "utf8") < vercelFunctionPayloadLimit, true);
});
