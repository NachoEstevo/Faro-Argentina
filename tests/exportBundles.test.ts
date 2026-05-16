import test from "node:test";
import assert from "node:assert/strict";

import argentinaDataset from "../src/data/argentinaWorkCases.json" with { type: "json" };
import crossCountryDataset from "../src/data/crossCountryCaseFiles.json" with { type: "json" };
import {
  buildEvidencePack,
  buildLeadFeed,
  getCaseById,
  getExpedienteById,
} from "../src/lib/caseRepository.ts";
import {
  buildCaseCollectionPack,
  filterCaseFiles,
  type ExportableCaseFile,
} from "../src/lib/data/caseCollections.ts";

const cases = [
  ...argentinaDataset.cases,
  ...crossCountryDataset.cases,
] as ExportableCaseFile[];

test("filterCaseFiles filters by country, source and case type", () => {
  const peContracts = filterCaseFiles(cases, {
    countryCode: "PE",
    sourceId: "PE-OECE-CONTRATOS",
    caseType: "procurement_contract",
  });

  assert.equal(peContracts.length, 25);
  assert.equal(peContracts.every((caseFile) => caseFile.countryCode === "PE"), true);
  assert.equal(
    peContracts.every((caseFile) => caseFile.receipt.sourceId === "PE-OECE-CONTRATOS"),
    true,
  );
});

test("buildCaseCollectionPack creates a country export with receipts and source summaries", () => {
  const pack = buildCaseCollectionPack(cases, { countryCode: "PE" });

  assert.equal(pack.packType, "faro_case_collection");
  assert.equal(pack.filters.countryCode, "PE");
  assert.equal(pack.stats.caseFiles, 50);
  assert.equal(pack.stats.receipts, 75);
  assert.deepEqual(pack.sourceIds.sort(), ["PE-MEF-GASTO-DIARIO", "PE-OECE-CONTRATOS", "PE-OECE-OCDS"]);
  assert.equal(pack.cases.every((caseFile) => caseFile.countryCode === "PE"), true);
  assert.equal(pack.receipts[0]?.sourceId.startsWith("PE-"), true);
  assert.equal(
    pack.cases.some((caseFile) =>
      caseFile.relatedReceipts?.some((receipt) => receipt.sourceId === "PE-OECE-OCDS"),
    ),
    true,
  );
  assert.match(pack.verificationSteps.join("\n"), /No publicar conclusiones/);
});

test("buildCaseCollectionPack exports Argentina contract cases by source and type", () => {
  const pack = buildCaseCollectionPack(cases, {
    countryCode: "AR",
    sourceId: "AR-CONTRATAR-CONTRATOS",
    caseType: "procurement_contract",
  });

  assert.equal(pack.stats.caseFiles, 50);
  assert.equal(pack.stats.receipts > pack.stats.caseFiles, true);
  assert.deepEqual(pack.sourceIds, [
    "AR-CONTRATAR-ACTAS-APERTURA",
    "AR-CONTRATAR-CONTRATOS",
    "AR-CONTRATAR-OBRAS",
    "AR-CONTRATAR-OFERTAS",
    "AR-CONTRATAR-PROCEDIMIENTOS",
    "AR-CONTRATAR-UBICACION",
    "AR-SIPRO-PROVEEDORES",
  ]);
  assert.equal(pack.cases.every((caseFile) => caseFile.supplierDocument), true);
  assert.equal(
    pack.cases.some((caseFile) =>
      "bidderCount" in caseFile && Number(caseFile.bidderCount) > 1
    ),
    true,
  );
  assert.equal(
    pack.receipts.some((receipt) => receipt.sourceId === "AR-CONTRATAR-OBRAS"),
    true,
  );
  assert.equal(
    pack.receipts.some((receipt) => receipt.sourceId === "AR-SIPRO-PROVEEDORES"),
    true,
  );
  assert.equal(
    pack.receipts.some((receipt) => receipt.sourceId === "AR-CONTRATAR-OFERTAS"),
    true,
  );
});

test("buildCaseCollectionPack exports Chile award evidence with official act context", () => {
  const pack = buildCaseCollectionPack(cases, { countryCode: "CL" });
  const [caseFile] = pack.cases as Array<ExportableCaseFile & {
    awardedAt?: string | null;
    awardActUrl?: string | null;
    bidderCount?: number | null;
    signals?: Array<{ code: string }>;
  }>;

  assert.equal(pack.stats.caseFiles, 25);
  assert.equal(pack.stats.signals > 0, true);
  assert.equal(caseFile?.awardedAt, "2026-05-15");
  assert.match(caseFile?.awardActUrl ?? "", /mercadopublico\.cl/);
  assert.equal(caseFile?.bidderCount, 13);
  assert.equal(Array.isArray(caseFile?.signals), true);
  assert.equal(pack.signals.some((signal) => signal.code === "official_award_act"), true);
  assert.equal(pack.signals.some((signal) => signal.code === "missing_official_geometry"), true);
  assert.equal(pack.cases.every((caseFile) => Boolean(caseFile.supplierName)), true);
  assert.match(caseFile?.receipt.sourceUrl ?? "", /mercadopublico\.cl/);
  assert.doesNotMatch(caseFile?.receipt.sourceUrl ?? "", /modules\/api\.aspx/);
});

test("buildLeadFeed exposes ranked Argentina case leads", () => {
  const feed = buildLeadFeed({ countryCode: "AR", limit: 5 });

  assert.equal(feed.feedType, "faro_case_lead_feed");
  assert.equal(feed.filters.countryCode, "AR");
  assert.equal(feed.stats.cases > 0, true);
  assert.equal(feed.leads.length > 0, true);
  assert.equal(feed.leads.length <= 5, true);
  assert.equal(feed.leads.every((lead) => lead.countryCode === "AR"), true);

  const priorities = feed.leads.map((lead) => lead.primarySignal.priority);
  assert.deepEqual([...priorities].sort((left, right) => right - left), priorities);
});

test("buildLeadFeed lets lead query matching find cases beyond collection query fields", () => {
  const feed = buildLeadFeed({
    countryCode: "AR",
    query: "ANSAL CONSTRUCCIONES SRL",
    limit: 10,
  });

  assert.equal(
    feed.leads.some((lead) => lead.caseId === "AR-CONTRACT-40/31-1003-CON21"),
    true,
  );
});

test("getExpedienteById returns an expediente view for lead cases", () => {
  const lead = buildLeadFeed({ countryCode: "AR", limit: 1 }).leads[0];
  assert.ok(lead);

  const expediente = getExpedienteById(lead.caseId);

  assert.equal(expediente?.expedienteType, "faro_expediente_v1");
  assert.equal(expediente?.summary.caseId, lead.caseId);
  assert.equal((expediente?.whyItAppeared.length ?? 0) > 0, true);
});

test("getCaseById keeps invalid-geometry official records available as data gaps", () => {
  const sourceCaseFile = getCaseById("AR-WORK-279-0003-OBR19");
  assert.ok(sourceCaseFile);

  const pack = buildEvidencePack(sourceCaseFile);

  assert.equal(pack.caseFile.id, "AR-WORK-279-0003-OBR19");
  assert.equal(pack.signals.some((signal) => signal.code === "geometry_needs_review"), true);
  assert.equal(pack.signals.some((signal) => signal.code === "official_geometry"), false);
  assert.equal(pack.signals.some((signal) => signal.code === "sentinel_candidate"), false);
});

test("getCaseById exposes duplicate official rows with stable runtime ids", () => {
  const sourceCaseFile = getCaseById("AR-WORK-501-0003-OBR22--row-2");
  assert.ok(sourceCaseFile);

  const pack = buildEvidencePack(sourceCaseFile);

  assert.equal(pack.caseFile.id, "AR-WORK-501-0003-OBR22--row-2");
  assert.equal(pack.receipt.recordId, "501-0003-OBR22");
  assert.equal(pack.signals.some((signal) => signal.code === "geometry_needs_review"), true);
  assert.equal(pack.signals.some((signal) => signal.code === "official_geometry"), false);
});

test("buildEvidencePack includes receipts, signals and official-source verification steps", () => {
  const caseFile = buildLeadFeed({ countryCode: "AR", limit: 1 }).leads[0];
  assert.ok(caseFile);

  const sourceCaseFile = getCaseById(caseFile.caseId);
  assert.ok(sourceCaseFile);

  const pack = buildEvidencePack(sourceCaseFile);

  assert.equal(pack.packType, "faro_evidence_pack");
  assert.equal(Array.isArray(pack.relatedReceipts), true);
  assert.equal(Array.isArray(pack.signals), true);
  assert.equal(pack.signals.length > 0, true);
  assert.equal(Array.isArray(pack.verificationSteps), true);
  assert.match(pack.verificationSteps.join("\n"), /fuente oficial/i);
});

test("buildEvidencePack handles decoded slash-containing case ids", () => {
  const decodedCaseId = decodeURIComponent("AR-CONTRACT-40%2F31-1003-CON21");
  const sourceCaseFile = getCaseById(decodedCaseId);
  assert.ok(sourceCaseFile);

  const pack = buildEvidencePack(sourceCaseFile);

  assert.equal(pack.caseFile.id, "AR-CONTRACT-40/31-1003-CON21");
  assert.equal(pack.receipt.recordId, "40/31-1003-CON21");
});
