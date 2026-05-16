import payload from "../data/argentinaWorkCases.json" with { type: "json" };
import crossCountryPayload from "../data/crossCountryCaseFiles.json" with { type: "json" };
import type { ArgentinaWorkCase } from "./data/argentinaWorks.ts";
import {
  buildCaseCollectionPack as buildCollectionPack,
  filterCaseFiles as filterCollectionCases,
  type CaseCollectionFilters,
  type CaseCollectionPack,
} from "./data/caseCollections.ts";
import {
  buildCaseLeads,
  type CaseLead,
  type CaseLeadFilters,
} from "./data/caseLeads.ts";
import { buildCoverageReport, type CoverageReport } from "./data/coverage.ts";
import type { CrossCountryCaseFile } from "./data/crossCountryCases.ts";
import {
  buildCaseSignalFeed,
  buildCaseSignals,
  type CaseSignal,
  type CaseSignalFeed,
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

export type FaroCaseFile = ArgentinaWorkCase | CrossCountryCaseFile;

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

interface CrossCountryPayload {
  generatedAt: string;
  datasets: Array<CaseDataset<CrossCountryCaseFile>>;
  cases: CrossCountryCaseFile[];
}

const rawArgentinaWorkDataset = payload as CaseDataset<ArgentinaWorkCase>;
const crossCountryCasePayload = crossCountryPayload as CrossCountryPayload;

export const sourceCatalogEntries = sourceCatalogPayload as SourceCatalogEntry[];

export const argentinaWorkDataset = buildExplorerDataset(rawArgentinaWorkDataset);
export const crossCountryDatasets = crossCountryCasePayload.datasets;
export const crossCountryCaseFiles = crossCountryCasePayload.cases;

export const dataSpineCoverage: CoverageReport = buildCoverageReport({
  sources: sourceCatalogEntries,
  caseDatasets: [rawArgentinaWorkDataset, ...crossCountryDatasets],
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
  return buildCollectionPack(allCaseFiles(), filters);
}

export function buildSignalFeed(filters: CaseCollectionFilters): CaseSignalFeed {
  return buildCaseSignalFeed(filterCaseFiles(filters) as SignalCaseFile[]);
}

export function buildLeadFeed(filters: CaseLeadFilters = {}): CaseLeadFeed {
  const filteredCases = filterCaseFiles(filters);
  const leads = buildCaseLeads(filteredCases as SignalCaseFile[], filters);

  return {
    feedType: "faro_case_lead_feed",
    generatedAt: new Date().toISOString(),
    stats: {
      cases: filteredCases.length,
      leads: leads.length,
    },
    filters,
    leads,
  };
}

export function getExpedienteById(id: string): ExpedienteView | null {
  const caseFile = getCaseById(id);
  if (!caseFile) return null;
  return buildExpediente(caseFile as ExpedienteCaseFile);
}

export function buildEvidencePack(caseFile: FaroCaseFile): EvidencePack {
  return {
    packType: "faro_evidence_pack",
    generatedAt: new Date().toISOString(),
    caseFile,
    receipt: caseFile.receipt,
    relatedReceipts: getRelatedReceipts(caseFile),
    signals: buildCaseSignals(caseFile as SignalCaseFile),
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

function allCaseFiles(): FaroCaseFile[] {
  return [...argentinaWorkDataset.cases, ...crossCountryCaseFiles];
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
