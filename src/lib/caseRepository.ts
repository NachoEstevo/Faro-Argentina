import payload from "../data/argentinaWorkCases.json" with { type: "json" };
import historicalJudicialPayload from "../data/argentinaHistoricalJudicialCases.json" with { type: "json" };
import argentinaContractPayload from "../data/argentinaContractCases.json" with { type: "json" };
import articleCitationPayload from "../data/articleCitations.json" with { type: "json" };
import type { ArgentinaHistoricalJudicialCase } from "./data/argentinaHistoricalJudicial.ts";
import type { ArgentinaWorkCase } from "./data/argentinaWorks.ts";
import {
  getArticleCitationsForCase,
  type ArticleCitation,
} from "./data/articleCitations.ts";
import {
  buildCaseCollectionPack as buildCollectionPack,
  filterCaseFiles as filterCollectionCases,
  type CaseCollectionFilters,
  type CaseCollectionPack,
} from "./data/caseCollections.ts";
import {
  buildCaseReportView,
  type CaseReportView,
} from "./data/caseReport.ts";
import {
  buildCaseLeads,
  type CaseLead,
  type CaseLeadFilters,
} from "./data/caseLeads.ts";
import { buildCoverageReport, type CoverageReport } from "./data/coverage.ts";
import type { ArgentinaContractCaseFile } from "./data/argentinaContractCases.ts";
import {
  buildCaseSignalContext,
  buildCaseSignalContextsByCountry,
  buildCaseSignalFeed,
  buildCaseSignals,
  type CaseSignal,
  type CaseSignalFeed,
  type CaseSignalContext,
  type SignalCaseFile,
} from "./data/caseSignals.ts";
import {
  buildExpediente,
  type ExpedienteCaseFile,
  type ExpedienteView,
} from "./data/expediente.ts";
import type { EvidenceReceipt } from "./data/evidenceReceipts.ts";
import type { CsvSnapshotProfile, JsonSnapshotProfile } from "./data/snapshots.ts";
import type { SourceCatalogEntry } from "./data/sourceCatalog.ts";
import { shouldExposeCaseOnMap } from "./data/uiGates.ts";
import type { XlsxSnapshotProfile } from "./data/xlsx.ts";

import sourceCatalogPayload from "../../data/sources/source-catalog.json" with { type: "json" };

export type FaroCaseFile =
  | ArgentinaWorkCase
  | ArgentinaContractCaseFile
  | ArgentinaHistoricalJudicialCase;

export interface CaseDataset<TCase extends FaroCaseFile = FaroCaseFile> {
  generatedAt: string;
  source: {
    sourceId: string;
    sourceName: string;
    sourceUrl: string;
    filePath: string;
    fileHash: string;
  };
  snapshotProfile: CsvSnapshotProfile | JsonSnapshotProfile | XlsxSnapshotProfile;
  stats: {
    rawRows: number;
    caseFiles: number;
    mapReadyCases: number;
  };
  cases: TCase[];
}

export interface EvidencePack {
  packType: "faro_evidence_pack";
  generatedAt: string;
  caseFile: FaroCaseFile;
  receipt: FaroCaseFile["receipt"];
  relatedReceipts: EvidenceReceipt[];
  contextualCitations: ArticleCitation[];
  signals: CaseSignal[];
  caveats: string[];
  verificationSteps: string[];
}

export interface CaseLeadFeed {
  feedType: "faro_case_lead_feed";
  generatedAt: string;
  stats: {
    cases: number;
    leads: number;
  };
  filters: CaseLeadFilters;
  leads: CaseLead[];
}

export interface InvestigationCasePack {
  caseId: string;
  expediente: ExpedienteView;
  evidencePack: EvidencePack;
}

interface ArgentinaContractPayload {
  generatedAt: string;
  datasets: Array<CaseDataset<ArgentinaContractCaseFile>>;
  cases: ArgentinaContractCaseFile[];
}

interface ArgentinaHistoricalJudicialPayload {
  generatedAt: string;
  datasets: Array<CaseDataset<ArgentinaHistoricalJudicialCase>>;
  cases: ArgentinaHistoricalJudicialCase[];
}

const rawArgentinaWorkDataset = payload as CaseDataset<ArgentinaWorkCase>;
const argentinaContractCasePayload = argentinaContractPayload as ArgentinaContractPayload;
const argentinaHistoricalJudicialPayload = historicalJudicialPayload as ArgentinaHistoricalJudicialPayload;
const articleCitations = articleCitationPayload.citations as ArticleCitation[];
const argentinaWorkCaseFiles = withStableDuplicateCaseIds(rawArgentinaWorkDataset.cases);
const normalizedArgentinaWorkDataset: CaseDataset<ArgentinaWorkCase> = {
  ...rawArgentinaWorkDataset,
  cases: argentinaWorkCaseFiles,
};

export const sourceCatalogEntries = sourceCatalogPayload as SourceCatalogEntry[];

export const argentinaWorkDataset = buildExplorerDataset(normalizedArgentinaWorkDataset);
export const argentinaContractDatasets = argentinaContractCasePayload.datasets;
export const argentinaContractCaseFiles = argentinaContractCasePayload.cases;
export const argentinaHistoricalJudicialDatasets = argentinaHistoricalJudicialPayload.datasets;
export const argentinaHistoricalJudicialCaseFiles = argentinaHistoricalJudicialPayload.cases;
export const investigatorCaseFiles: FaroCaseFile[] = withContextualCitations([
  ...argentinaWorkCaseFiles,
  ...argentinaContractCaseFiles,
  ...argentinaHistoricalJudicialCaseFiles,
]);
const investigatorSignalContext: CaseSignalContext = buildCaseSignalContext(
  investigatorCaseFiles as SignalCaseFile[],
);
const investigatorSignalContextsByCountry = buildCaseSignalContextsByCountry(
  investigatorCaseFiles as SignalCaseFile[],
);

export const dataSpineCoverage: CoverageReport = buildCoverageReport({
  sources: sourceCatalogEntries,
  caseDatasets: [
    rawArgentinaWorkDataset,
    ...argentinaContractDatasets,
    ...argentinaHistoricalJudicialDatasets,
  ],
});

export function getCaseById(id: string): FaroCaseFile | null {
  return allCaseFiles().find((caseFile) => caseFile.id === id) ?? null;
}

export function getCasesByCountry(countryCode: FaroCaseFile["countryCode"]): FaroCaseFile[] {
  return allCaseFiles().filter((caseFile) => caseFile.countryCode === countryCode);
}

export function filterCaseFiles(filters: CaseCollectionFilters): FaroCaseFile[] {
  return filterCollectionCases(allCaseFiles(), filters) as FaroCaseFile[];
}

export function buildCaseCollectionPack(filters: CaseCollectionFilters): CaseCollectionPack {
  return buildCollectionPack(allCaseFiles(), filters, articleCitations);
}

export function buildSignalFeed(filters: CaseCollectionFilters): CaseSignalFeed {
  const filteredCases = filterCaseFiles(filters) as SignalCaseFile[];
  const contextCases = filterCaseFiles({
    countryCode: filters.countryCode,
    sourceId: filters.sourceId,
    caseType: filters.caseType,
  }) as SignalCaseFile[];
  return buildCaseSignalFeed(filteredCases, contextCases);
}

export function buildLeadFeed(filters: CaseLeadFilters = {}): CaseLeadFeed {
  const prefilteredCases = filterCaseFiles({
    countryCode: filters.countryCode,
    sourceId: filters.sourceId,
    caseType: filters.caseType,
  });
  const leads = buildCaseLeads(prefilteredCases as SignalCaseFile[], filters);

  return {
    feedType: "faro_case_lead_feed",
    generatedAt: new Date().toISOString(),
    stats: {
      cases: prefilteredCases.length,
      leads: leads.length,
    },
    filters,
    leads,
  };
}

export function getExpedienteById(id: string): ExpedienteView | null {
  const caseFile = getCaseById(id);
  if (!caseFile) return null;
  return buildExpediente(
    caseFile as ExpedienteCaseFile,
    signalContextForCase(caseFile),
    getContextualCitationsForCase(caseFile.id),
  );
}

export function getCaseReportById(id: string): CaseReportView | null {
  const caseFile = getCaseById(id);
  if (!caseFile) return null;
  return buildCaseReportView(
    caseFile as ExpedienteCaseFile,
    signalContextForCase(caseFile),
    getContextualCitationsForCase(caseFile.id),
  );
}

export function getInvestigationCasePacks(ids: string[]): {
  casePacks: InvestigationCasePack[];
  missingCaseIds: string[];
} {
  const casePacks: InvestigationCasePack[] = [];
  const missingCaseIds: string[] = [];
  for (const id of ids) {
    const caseFile = getCaseById(id);
    const expediente = caseFile ? getExpedienteById(id) : null;
    if (!caseFile || !expediente) {
      missingCaseIds.push(id);
      continue;
    }
    casePacks.push({
      caseId: id,
      expediente,
      evidencePack: buildEvidencePack(caseFile),
    });
  }
  return { casePacks, missingCaseIds };
}

export function buildEvidencePack(caseFile: FaroCaseFile): EvidencePack {
  return {
    packType: "faro_evidence_pack",
    generatedAt: new Date().toISOString(),
    caseFile,
    receipt: caseFile.receipt,
    relatedReceipts: getRelatedReceipts(caseFile),
    contextualCitations: getContextualCitationsForCase(caseFile.id),
    signals: buildCaseSignals(caseFile as SignalCaseFile, signalContextForCase(caseFile)),
    caveats: caseFile.caveats,
    verificationSteps: [
      "Abrir la fuente oficial indicada en el receipt.",
      "Buscar el numero de obra, contrato o procedimiento en el dataset original.",
      "Revisar receipts relacionados antes de tratar el caso como evidencia cruzada.",
      "Cruzar contratos, pagos y avance fisico antes de publicar conclusiones.",
      "Si se usa Sentinel-2, revisar nubes, fecha de escena y resolucion antes de inferir avance.",
    ],
  };
}

export function getContextualCitationsForCase(caseId: string): ArticleCitation[] {
  return getArticleCitationsForCase(caseId, articleCitations);
}

function signalContextForCase(caseFile: FaroCaseFile): CaseSignalContext {
  return investigatorSignalContextsByCountry.get(caseFile.countryCode) ?? investigatorSignalContext;
}

function allCaseFiles(): FaroCaseFile[] {
  return investigatorCaseFiles;
}

function withContextualCitations<TCase extends FaroCaseFile>(cases: TCase[]): TCase[] {
  return cases.map((caseFile) => {
    const contextualCitations = getArticleCitationsForCase(caseFile.id, articleCitations);
    if (contextualCitations.length === 0) return caseFile;
    return {
      ...caseFile,
      contextualCitations,
    };
  });
}

function withStableDuplicateCaseIds<TCase extends FaroCaseFile>(cases: TCase[]): TCase[] {
  const totals = new Map<string, number>();
  cases.forEach((caseFile) => {
    totals.set(caseFile.id, (totals.get(caseFile.id) ?? 0) + 1);
  });

  const seen = new Map<string, number>();
  return cases.map((caseFile) => {
    const total = totals.get(caseFile.id) ?? 0;
    if (total <= 1) return caseFile;

    const index = (seen.get(caseFile.id) ?? 0) + 1;
    seen.set(caseFile.id, index);
    if (index === 1) return caseFile;
    return {
      ...caseFile,
      id: `${caseFile.id}--row-${index}`,
    };
  });
}

function getRelatedReceipts(caseFile: FaroCaseFile): EvidenceReceipt[] {
  if (!("relatedReceipts" in caseFile)) return [];
  return caseFile.relatedReceipts ?? [];
}

function buildExplorerDataset(
  dataset: CaseDataset<ArgentinaWorkCase>,
): CaseDataset<ArgentinaWorkCase> {
  const cases = dataset.cases.filter(shouldExposeCaseOnMap);
  return {
    ...dataset,
    stats: {
      ...dataset.stats,
      mapReadyCases: cases.length,
    },
    cases,
  };
}
