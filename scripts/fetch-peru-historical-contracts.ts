import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import {
  buildPeruHistoricalSnapshotRows,
  selectPeruHistoricalContracts,
  type PeruHistoricalYearRows,
} from "../src/lib/data/peruHistoricalContracts.ts";
import { visitXlsxRows } from "../src/lib/data/xlsx.ts";
import type { PeruContractRow } from "../src/lib/data/crossCountryCases.ts";

const years = (process.env.PERU_HISTORICAL_YEARS ?? "2018,2019,2020,2021,2022,2023,2024")
  .split(",")
  .map((year) => Number(year.trim()))
  .filter((year) => Number.isInteger(year));
const perYear = Number(process.env.PERU_HISTORICAL_PER_YEAR ?? "12");
const minimumAmountPen = Number(process.env.PERU_HISTORICAL_MIN_AMOUNT_PEN ?? "100000");
const ocdsDelayMs = Number(process.env.PERU_HISTORICAL_OCDS_DELAY_MS ?? "250");
const maxPreselectedRows = Math.max(perYear * 100, 1000);
const officialDatasetUrl =
  "https://www.datosabiertos.gob.pe/dataset/contratos-de-las-entidades-organismo-supervisor-de-las-contrataciones-del-estado-osce";
const outputDir = new URL("../data/official/pe/", import.meta.url);
const selectedOutputPath = new URL(
  "../data/official/pe/oece-contratos-historicos-seleccionados.json",
  import.meta.url,
);
const ocdsOutputPath = new URL(
  "../data/official/pe/oece-ocds-seace-v3-historical-releases.sample.json",
  import.meta.url,
);
const currentCasesPath = new URL("../src/data/crossCountryCaseFiles.json", import.meta.url);
const manifestPath = new URL("../data/official/snapshot-manifest.json", import.meta.url);

await mkdir(outputDir, { recursive: true });

const generatedAt = new Date().toISOString();
const existingCaseIds = await readExistingPeruCaseIds();
const rowsByYear: PeruHistoricalYearRows[] = [];

for (const year of years) {
  const fetchUrl = buildPeruContractsUrl(year);
  const response = await fetch(fetchUrl);
  if (!response.ok) throw new Error(`PE historical contracts ${year} fetch failed with ${response.status}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  const fileHash = `sha256-${createHash("sha256").update(buffer).digest("hex")}`;
  const { rows, rowCount } = await readTopCandidateRows(buffer);
  rowsByYear.push({
    year,
    fetchUrl,
    fileHash,
    rowCount,
    rows,
  });
  console.log(JSON.stringify({ year, rowCount, preselectedRows: rows.length }));
}

const selected = buildPeruHistoricalSnapshotRows(selectPeruHistoricalContracts(rowsByYear, {
  years,
  perYear,
  minimumAmountPen,
  existingCaseIds,
}));
const tenderIds = Array.from(new Set(selected.map((item) => item.row.codigoconvocatoria.trim()))).filter(Boolean);
const ocds = await fetchOcdsReleases(tenderIds);

const selectedPayload = {
  sourceId: "PE-OECE-CONTRATOS-HISTORICOS",
  sourceName: "OECE contratos historicos seleccionados",
  sourceUrl: officialDatasetUrl,
  generatedAt,
  officialDatasetUrl,
  selection: {
    years,
    perYear,
    minimumAmountPen,
    method: "top_pen_contract_amount_per_year_after_required_field_checks",
    requiredFields: [
      "codigo_contrato",
      "codigoconvocatoria",
      "descripcion_proceso",
      "ruc_contratista",
      "urlcontrato",
      "fecha_suscripcion_contrato_or_fecha_publicacion_contrato",
    ],
    excludedExistingCaseIds: existingCaseIds.size,
  },
  sourceFiles: rowsByYear.map(({ year, fetchUrl, fileHash, rowCount, rows }) => ({
    year,
    fetchUrl,
    fileHash,
    rowCount,
    preselectedRows: rows.length,
  })),
  selected,
};

await writeFile(selectedOutputPath, `${JSON.stringify(selectedPayload, null, 2)}\n`, "utf8");
await writeFile(ocdsOutputPath, `${JSON.stringify({
  sourceId: "PE-OECE-OCDS",
  sourceName: "Portal de contrataciones abiertas OCDS",
  sourceUrl: "https://contratacionesabiertas.oece.gob.pe/descargas",
  apiPattern: "https://contratacionesabiertas.oece.gob.pe/api/v1/release/seace_v3/{tenderId}",
  generatedAt,
  partial: true,
  selection: {
    basis: "Selected PE-OECE-CONTRATOS-HISTORICOS tender IDs",
    tenderIds,
    failedReleases: ocds.failedReleases,
  },
  releases: ocds.releases,
}, null, 2)}\n`, "utf8");
await updateManifest({
  generatedAt,
  selectedCount: selected.length,
  ocdsReleaseCount: ocds.releases.length,
  failedOcdsReleaseCount: ocds.failedReleases.length,
});

console.log(JSON.stringify({
  selected: selected.length,
  tenderIds: tenderIds.length,
  ocdsReleases: ocds.releases.length,
  failedOcdsReleases: ocds.failedReleases.length,
}, null, 2));

async function readTopCandidateRows(buffer: Buffer): Promise<{ rows: PeruContractRow[]; rowCount: number }> {
  const rows: PeruContractRow[] = [];
  const summary = await visitXlsxRows(buffer, (row) => {
    const contractRow = row as unknown as PeruContractRow;
    const amount = readAmount(contractRow);
    if (amount === null || amount < minimumAmountPen) return;
    rows.push(contractRow);
    if (rows.length > maxPreselectedRows) {
      rows.sort((left, right) => (readAmount(right) ?? 0) - (readAmount(left) ?? 0));
      rows.length = maxPreselectedRows;
    }
  });
  rows.sort((left, right) => (readAmount(right) ?? 0) - (readAmount(left) ?? 0));
  return { rows: rows.slice(0, maxPreselectedRows), rowCount: summary.rowCount };
}

function readAmount(row: PeruContractRow): number | null {
  return parseAmount(row.monto_contratado_item) ?? parseAmount(row.monto_contratado_total);
}

function parseAmount(value: string | null | undefined): number | null {
  const amount = Number(clean(value));
  return Number.isFinite(amount) ? amount : null;
}

async function readExistingPeruCaseIds(): Promise<Set<string>> {
  try {
    const payload = JSON.parse(await readFile(currentCasesPath, "utf8")) as {
      datasets?: Array<{
        cases?: Array<{
          id: string;
          countryCode: string;
          receipt?: { sourceId?: string };
        }>;
      }>;
      cases?: Array<{
        id: string;
        countryCode: string;
        receipt?: { sourceId?: string };
      }>;
    };
    const cases = payload.datasets?.flatMap((dataset) => dataset.cases ?? []) ?? payload.cases ?? [];
    return new Set(cases
      .filter((caseFile) =>
        caseFile.countryCode === "PE" &&
        caseFile.receipt?.sourceId !== "PE-OECE-CONTRATOS-HISTORICOS"
      )
      .map((caseFile) => caseFile.id));
  } catch {
    return new Set();
  }
}

async function fetchOcdsReleases(tenderIds: string[]) {
  const releases = [];
  const failedReleases = [];
  for (const tenderId of tenderIds) {
    const fetchUrl = buildPeruOcdsReleaseUrl(tenderId);
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      failedReleases.push({ tenderId, fetchUrl, status: response.status });
      await sleep(ocdsDelayMs);
      continue;
    }
    releases.push({ tenderId, fetchUrl, package: await response.json() });
    await sleep(ocdsDelayMs);
  }
  return { releases, failedReleases };
}

function buildPeruContractsUrl(year: number): string {
  return `https://conosce.osce.gob.pe/buscador/assets/67ae6c4a/reportes/contratos/${year}/CONOSCE_CONTRATOS${year}_0.xlsx`;
}

function buildPeruOcdsReleaseUrl(tenderId: string): string {
  return `https://contratacionesabiertas.oece.gob.pe/api/v1/release/seace_v3/${encodeURIComponent(tenderId)}`;
}

async function updateManifest({
  generatedAt,
  selectedCount,
  ocdsReleaseCount,
  failedOcdsReleaseCount,
}: {
  generatedAt: string;
  selectedCount: number;
  ocdsReleaseCount: number;
  failedOcdsReleaseCount: number;
}): Promise<void> {
  let manifest: {
    generatedAt?: string;
    snapshots?: Array<Record<string, unknown> & { rawPath?: string }>;
  } = {};
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8")) as typeof manifest;
  } catch {
    manifest = {};
  }

  const selectedText = await readFile(selectedOutputPath, "utf8");
  const ocdsText = await readFile(ocdsOutputPath, "utf8");
  const historicalEntries = [
    {
      sourceId: "PE-OECE-CONTRATOS-HISTORICOS",
      rawPath: "data/official/pe/oece-contratos-historicos-seleccionados.json",
      fetchUrl: officialDatasetUrl,
      fetchedAt: generatedAt,
      contentType: "application/json",
      recordCount: selectedCount,
      partial: true,
      derived: true,
      fileHash: hashText(selectedText),
      byteSize: Buffer.byteLength(selectedText, "utf8"),
    },
    {
      sourceId: "PE-OECE-OCDS",
      rawPath: "data/official/pe/oece-ocds-seace-v3-historical-releases.sample.json",
      fetchUrl: "https://contratacionesabiertas.oece.gob.pe/api/v1/release/seace_v3/{tenderId}",
      fetchedAt: generatedAt,
      contentType: "application/json",
      recordCount: ocdsReleaseCount,
      failedCount: failedOcdsReleaseCount,
      partial: true,
      derived: true,
      fileHash: hashText(ocdsText),
      byteSize: Buffer.byteLength(ocdsText, "utf8"),
    },
  ];

  const historicalRawPaths = new Set(historicalEntries.map((entry) => entry.rawPath));
  const snapshots = (manifest.snapshots ?? [])
    .filter((entry) => !entry.rawPath || !historicalRawPaths.has(entry.rawPath));
  snapshots.splice(findPeruOcdsManifestInsertIndex(snapshots), 0, ...historicalEntries);

  await writeFile(manifestPath, `${JSON.stringify({
    ...manifest,
    generatedAt: manifest.generatedAt ?? generatedAt,
    snapshots,
  }, null, 2)}\n`, "utf8");
}

function findPeruOcdsManifestInsertIndex(snapshots: Array<{ rawPath?: string }>): number {
  const index = snapshots.findIndex((entry) =>
    entry.rawPath === "data/official/pe/oece-ocds-seace-v3-contract-releases.sample.json"
  );
  return index === -1 ? snapshots.length : index + 1;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clean(value: string | number | null | undefined): string {
  return String(value ?? "").trim();
}

function hashText(text: string): string {
  return `sha256-${createHash("sha256").update(text).digest("hex")}`;
}
