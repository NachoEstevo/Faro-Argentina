import test from "node:test";
import assert from "node:assert/strict";

import argentinaDataset from "../src/data/argentinaWorkCases.json" with { type: "json" };
import argentinaContractDataset from "../src/data/argentinaContractCases.json" with { type: "json" };
import argentinaInvestmentMapDataset from "../src/data/argentinaInvestmentMapCases.json" with { type: "json" };
import historicalJudicialDataset from "../src/data/argentinaHistoricalJudicialCases.json" with { type: "json" };
import {
  buildEvidencePack,
  buildCaseCollectionPack as buildRepositoryCaseCollectionPack,
  buildLeadFeed,
  buildSignalFeed,
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
  ...argentinaContractDataset.cases,
  ...argentinaInvestmentMapDataset.cases,
  ...historicalJudicialDataset.cases,
] as ExportableCaseFile[];

test("filterCaseFiles filters by country, source and case type", () => {
  const argentinaContracts = filterCaseFiles(cases, {
    countryCode: "AR",
    sourceId: "AR-CONTRATAR-CONTRATOS",
    caseType: "procurement_contract",
  });

  assert.equal(argentinaContracts.length, 389);
  assert.equal(argentinaContracts.every((caseFile) => caseFile.countryCode === "AR"), true);
  assert.equal(
    argentinaContracts.every((caseFile) => caseFile.receipt.sourceId === "AR-CONTRATAR-CONTRATOS"),
    true,
  );
});

test("buildCaseCollectionPack creates a country export with receipts and source summaries", () => {
  const pack = buildCaseCollectionPack(cases, { countryCode: "AR" });

  assert.equal(pack.packType, "faro_case_collection");
  assert.equal(pack.filters.countryCode, "AR");
  assert.equal(pack.stats.caseFiles, cases.length);
  assert.equal(pack.stats.receipts > pack.stats.caseFiles, true);
  assert.equal(pack.sourceIds.every((sourceId) => sourceId.startsWith("AR-")), true);
  assert.equal(pack.cases.every((caseFile) => caseFile.countryCode === "AR"), true);
  assert.equal(pack.receipts[0]?.sourceId.startsWith("AR-"), true);
  assert.equal(
    pack.cases.some((caseFile) =>
      caseFile.relatedReceipts?.some((receipt) => receipt.sourceId === "AR-CONTRATAR-OBRAS"),
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

  assert.equal(pack.stats.caseFiles, 389);
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

test("buildCaseCollectionPack exports Mapa de Inversiones progress cases without map geometry", () => {
  const pack = buildCaseCollectionPack(cases, {
    countryCode: "AR",
    sourceId: "AR-MAPA-INVERSIONES-OBRAS",
    caseType: "public_works_progress",
  });

  assert.equal(pack.stats.caseFiles, 7285);
  assert.deepEqual(pack.sourceIds, ["AR-MAPA-INVERSIONES-OBRAS"]);
  assert.equal(pack.cases.every((caseFile) => caseFile.receipt.locatorType === "official_detail"), true);
  assert.equal(pack.cases.every((caseFile) => "coordinates" in caseFile && caseFile.coordinates === null), true);
});

test("buildCaseCollectionPack includes collection-aware supplier review signals", () => {
  const pack = buildCaseCollectionPack(cases, {
    countryCode: "AR",
    sourceId: "AR-CONTRATAR-CONTRATOS",
    caseType: "procurement_contract",
  });

  const repeatedCase = pack.cases.find((caseFile) => caseFile.id === "AR-CONTRACT-40/31-1005-CON20");
  assert.ok(repeatedCase);
  assert.equal(
    repeatedCase.signals.some((signal) => signal.code === "repeat_single_bid_winner"),
    true,
  );
  assert.equal(
    pack.signals.some((signal) =>
      signal.caseId === "AR-CONTRACT-40/31-1005-CON20" &&
      signal.code === "repeat_single_bid_winner"
    ),
    true,
  );
});

test("buildCaseCollectionPack keeps supplier context when query narrows the exported rows", () => {
  const pack = buildCaseCollectionPack(cases, {
    countryCode: "AR",
    sourceId: "AR-CONTRATAR-CONTRATOS",
    caseType: "procurement_contract",
    query: "40/31-1005-CON20",
  });

  assert.equal(pack.stats.caseFiles, 1);
  assert.equal(pack.cases[0]?.id, "AR-CONTRACT-40/31-1005-CON20");
  assert.equal(pack.cases[0]?.signals[0]?.code, "repeat_single_bid_winner");
  assert.equal(pack.signals[0]?.code, "repeat_single_bid_winner");
});

test("buildCaseCollectionPack exports Argentina judicial context with related receipts", () => {
  const pack = buildCaseCollectionPack(cases, {
    countryCode: "AR",
    caseType: "supplier_judicial_context",
    query: "CONSTRUMEX",
  });

  assert.equal(pack.stats.caseFiles, 1);
  assert.equal(pack.cases[0]?.id, "AR-HIST-JUD-CUADERNOS-CAMARITA-CONSTRUMEX");
  assert.equal(pack.sourceIds.includes("AR-MPF-CUADERNOS-CAMARITA"), true);
  assert.equal(pack.sourceIds.includes("AR-CONTRATAR-CONTRATOS"), true);
  assert.equal(pack.receipts.length >= 4, true);
  assert.equal(
    pack.signals.some((signal) => signal.code === "official_judicial_context"),
    true,
  );
  assert.match(pack.verificationSteps.join("\n"), /fuentes? oficial/i);
});

test("buildCaseCollectionPack keeps contextual article citations separate from official receipts", () => {
  const pack = buildRepositoryCaseCollectionPack({
    countryCode: "AR",
    caseType: "judicial_context",
    query: "Vialidad",
  });

  assert.equal(pack.stats.caseFiles, 1);
  assert.equal(pack.cases[0]?.id, "AR-HIST-JUD-VIALIDAD-CFP-5048-SENTENCIA-FIRME");
  assert.equal(pack.contextualCitations.length >= 2, true);
  assert.equal(pack.stats.contextualCitations, pack.contextualCitations.length);
  assert.equal(
    pack.contextualCitations.every((citation) => citation.contextRole === "journalism_context"),
    true,
  );
  assert.equal(pack.sourceIds.includes("AP-NEWS"), false);
  assert.equal(pack.sourceIds.includes("CHEQUEADO"), false);
  assert.equal(
    pack.receipts.some((receipt) => receipt.sourceId === "AP-NEWS" || receipt.sourceId === "CHEQUEADO"),
    false,
  );
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

test("buildLeadFeed keeps Causa Vialidad visible as official judicial context", () => {
  const feed = buildLeadFeed({ countryCode: "AR", query: "baez", limit: 10 });

  assert.equal(
    feed.leads.some((lead) =>
      lead.caseId === "AR-HIST-JUD-VIALIDAD-CFP-5048-SENTENCIA-FIRME" &&
      lead.primarySignal.code === "official_judicial_context"
    ),
    true,
  );
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

test("getExpedienteById exposes article citations only as investigation context", () => {
  const expediente = getExpedienteById("AR-HIST-JUD-VIALIDAD-CFP-5048-SENTENCIA-FIRME");

  assert.ok(expediente);
  assert.equal(expediente.investigationContext.contextualCitations.length >= 2, true);
  assert.equal(expediente.officialTrail.related.some((receipt) => receipt.sourceId === "AP-NEWS"), false);
  assert.match(
    expediente.investigationContext.contextualCitations[0]?.ui.caveat ?? "",
    /no reemplaza la fuente oficial/i,
  );
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

test("buildEvidencePack appends contextual citations without changing receipt semantics", () => {
  const sourceCaseFile = getCaseById("AR-HIST-JUD-VIALIDAD-CFP-5048-SENTENCIA-FIRME");
  assert.ok(sourceCaseFile);

  const pack = buildEvidencePack(sourceCaseFile);

  assert.equal(pack.contextualCitations.length >= 2, true);
  assert.equal(pack.relatedReceipts.some((receipt) => receipt.sourceId === "AP-NEWS"), false);
  assert.equal(
    pack.contextualCitations.every((citation) =>
      citation.caveats.some((caveat) => /no reemplaza la fuente oficial/i.test(caveat))
    ),
    true,
  );
});

test("buildEvidencePack handles decoded slash-containing case ids", () => {
  const decodedCaseId = decodeURIComponent("AR-CONTRACT-40%2F31-1003-CON21");
  const sourceCaseFile = getCaseById(decodedCaseId);
  assert.ok(sourceCaseFile);

  const pack = buildEvidencePack(sourceCaseFile);

  assert.equal(pack.caseFile.id, "AR-CONTRACT-40/31-1003-CON21");
  assert.equal(pack.receipt.recordId, "40/31-1003-CON21");
});

test("buildEvidencePack includes repository-wide supplier review context", () => {
  const sourceCaseFile = getCaseById("AR-CONTRACT-40/31-1005-CON20");
  assert.ok(sourceCaseFile);

  const pack = buildEvidencePack(sourceCaseFile);

  assert.equal(
    pack.signals.some((signal) => signal.code === "repeat_single_bid_winner"),
    true,
  );
  assert.doesNotMatch(JSON.stringify(pack.signals), /fraude|delito|culpable|corrup|abuso|favorit|incumpl|irregular/i);
});

test("buildSignalFeed keeps comparison context when query narrows signal rows", () => {
  const feed = buildSignalFeed({
    countryCode: "AR",
    sourceId: "AR-CONTRATAR-CONTRATOS",
    caseType: "procurement_contract",
    query: "40/31-1005-CON20",
  });

  assert.equal(feed.signals.length > 0, true);
  assert.equal(feed.signals[0]?.caseId, "AR-CONTRACT-40/31-1005-CON20");
  assert.equal(feed.signals[0]?.code, "repeat_single_bid_winner");
});
