import payload from "@/data/argentinaWorkCases.json";
import crossCountryPayload from "@/data/crossCountryCaseFiles.json";
import type { ArgentinaWorkCase } from "@/lib/data/argentinaWorks";
import {
  buildCaseCollectionPack as buildCollectionPack,
  filterCaseFiles as filterCollectionCases,
  type CaseCollectionFilters,
  type CaseCollectionPack,
} from "@/lib/data/caseCollections";
import { buildCoverageReport, type CoverageReport } from "@/lib/data/coverage";
import type { CrossCountryCaseFile } from "@/lib/data/crossCountryCases";
import {
  buildCaseSignalFeed,
  buildCaseSignals,
  type CaseSignal,
  type CaseSignalFeed,
  type SignalCaseFile,
} from "@/lib/data/caseSignals";
import type { CsvSnapshotProfile, JsonSnapshotProfile } from "@/lib/data/snapshots";
import type { SourceCatalogEntry } from "@/lib/data/sourceCatalog";
import { shouldExposeCaseOnMap } from "@/lib/data/uiGates";
import type { XlsxSnapshotProfile } from "@/lib/data/xlsx";

import sourceCatalogPayload from "../../data/sources/source-catalog.json";

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
  signals: CaseSignal[];
  caveats: string[];
  verificationSteps: string[];
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

export function buildEvidencePack(caseFile: FaroCaseFile): EvidencePack {
  return {
    packType: "faro_evidence_pack",
    generatedAt: new Date().toISOString(),
    caseFile,
    receipt: caseFile.receipt,
    signals: buildCaseSignals(caseFile as SignalCaseFile),
    caveats: caseFile.caveats,
    verificationSteps: [
      "Abrir la fuente oficial indicada en el receipt.",
      "Buscar el numero de obra y procedimiento en el dataset original.",
      "Cruzar con contratos, pagos y avance fisico antes de publicar conclusiones.",
      "Si se usa Sentinel-2, revisar nubes, fecha de escena y resolucion antes de inferir avance.",
    ],
  };
}

function allCaseFiles(): FaroCaseFile[] {
  return [...argentinaWorkDataset.cases, ...crossCountryCaseFiles];
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
