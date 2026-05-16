import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import { readXlsxRows } from "../src/lib/data/xlsx.ts";

const chileCompraTicket =
  process.env.CHILECOMPRA_TICKET ?? "F8537A18-6766-4DEF-9E59-426B4FEE2844";
const chileCompraDate = process.env.CHILECOMPRA_SAMPLE_DATE ?? "15052026";
const chileCompraState = process.env.CHILECOMPRA_STATE ?? "adjudicada";
const chileCompraDetailLimit = Number(process.env.CHILECOMPRA_DETAIL_LIMIT ?? "25");
const chileCompraDetailDelayMs = Number(process.env.CHILECOMPRA_DETAIL_DELAY_MS ?? "1500");
const peruRange = process.env.PERU_MEF_RANGE ?? "bytes=0-120000";

const peOutputPath = new URL(
  "../data/official/pe/mef-2026-gasto-diario.sample.csv",
  import.meta.url,
);
const arContractsOutputPath = new URL(
  "../data/official/ar/onc-contratar-contratos.csv",
  import.meta.url,
);
const arProceduresOutputPath = new URL(
  "../data/official/ar/onc-contratar-procedimientos.csv",
  import.meta.url,
);
const arOffersOutputPath = new URL(
  "../data/official/ar/onc-contratar-ofertas.csv",
  import.meta.url,
);
const arWorksOutputPath = new URL(
  "../data/official/ar/onc-contratar-obras.csv",
  import.meta.url,
);
const arLocationsOutputPath = new URL(
  "../data/official/ar/onc-contratar-ubicacion-geografica.csv",
  import.meta.url,
);
const arOpeningActsOutputPath = new URL(
  "../data/official/ar/onc-contratar-actas-apertura.csv",
  import.meta.url,
);
const arSuppliersOutputPath = new URL(
  "../data/official/ar/sipro-proveedores.csv",
  import.meta.url,
);
const peContractsOutputPath = new URL(
  "../data/official/pe/oece-contratos-2025.xlsx",
  import.meta.url,
);
const peOcdsOutputPath = new URL(
  "../data/official/pe/oece-ocds-seace-v3-contract-releases.sample.json",
  import.meta.url,
);
const clOutputPath = new URL(
  "../data/official/cl/mercado-publico-licitaciones-adjudicadas-2026-05-15.sample.json",
  import.meta.url,
);
const manifestPath = new URL("../data/official/snapshot-manifest.json", import.meta.url);

const peMefUrl = "https://fs.datosabiertos.mef.gob.pe/datastorefiles/2026-Gasto-Diario.csv";
const arContractsUrl =
  "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.4/download/onc-contratar-contratos.csv";
const arProceduresUrl =
  "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.1/download/onc-contratar-procedimientos.csv";
const arOffersUrl =
  "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.3/download/onc-contratar-ofertas.csv";
const arWorksUrl =
  "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.5/download/onc-contratar-obras.csv";
const arLocationsUrl =
  "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.6/download/onc-contratar-ubicacion-geografica.csv";
const arOpeningActsUrl =
  "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.8/download/onc-contratar-actas-apertura.csv";
const arSuppliersUrl =
  "https://infra.datos.gob.ar/catalog/modernizacion/dataset/2/distribution/2.11/download/proveedores.csv";
const peOeceContractsUrl =
  "https://conosce.osce.gob.pe/buscador/assets/67ae6c4a/reportes/contratos/2025/CONOSCE_CONTRATOS2025_0.xlsx";
const clListUrl = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?fecha=${chileCompraDate}&estado=${chileCompraState}&ticket=${chileCompraTicket}`;

await mkdir(new URL("../data/official/pe/", import.meta.url), { recursive: true });
await mkdir(new URL("../data/official/cl/", import.meta.url), { recursive: true });
await mkdir(new URL("../data/official/ar/", import.meta.url), { recursive: true });

const arContractsSnapshot = await fetchTextSnapshot({
  sourceId: "AR-CONTRATAR-CONTRATOS",
  url: arContractsUrl,
  outputPath: arContractsOutputPath,
  rawPath: "data/official/ar/onc-contratar-contratos.csv",
});
const arProceduresSnapshot = await fetchTextSnapshot({
  sourceId: "AR-CONTRATAR-PROCEDIMIENTOS",
  url: arProceduresUrl,
  outputPath: arProceduresOutputPath,
  rawPath: "data/official/ar/onc-contratar-procedimientos.csv",
});
const arOffersSnapshot = await fetchTextSnapshot({
  sourceId: "AR-CONTRATAR-OFERTAS",
  url: arOffersUrl,
  outputPath: arOffersOutputPath,
  rawPath: "data/official/ar/onc-contratar-ofertas.csv",
});
const arWorksSnapshot = await fetchTextSnapshot({
  sourceId: "AR-CONTRATAR-OBRAS",
  url: arWorksUrl,
  outputPath: arWorksOutputPath,
  rawPath: "data/official/ar/onc-contratar-obras.csv",
});
const arLocationsSnapshot = await fetchTextSnapshot({
  sourceId: "AR-CONTRATAR-UBICACION",
  url: arLocationsUrl,
  outputPath: arLocationsOutputPath,
  rawPath: "data/official/ar/onc-contratar-ubicacion-geografica.csv",
});
const arOpeningActsSnapshot = await fetchTextSnapshot({
  sourceId: "AR-CONTRATAR-ACTAS-APERTURA",
  url: arOpeningActsUrl,
  outputPath: arOpeningActsOutputPath,
  rawPath: "data/official/ar/onc-contratar-actas-apertura.csv",
});
const arSuppliersSnapshot = await fetchTextSnapshot({
  sourceId: "AR-SIPRO-PROVEEDORES",
  url: arSuppliersUrl,
  outputPath: arSuppliersOutputPath,
  rawPath: "data/official/ar/sipro-proveedores.csv",
});
const peSnapshot = await fetchPeruMefSample();
const peContractsSnapshot = await fetchPeruOeceContracts();
const peOcdsSnapshot = await fetchPeruOcdsContractReleases();
const clSnapshot = await fetchChileCompraSample();

await writeFile(manifestPath, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  snapshots: [
    arContractsSnapshot,
    arProceduresSnapshot,
    arOffersSnapshot,
    arWorksSnapshot,
    arLocationsSnapshot,
    arOpeningActsSnapshot,
    arSuppliersSnapshot,
    peSnapshot,
    peContractsSnapshot,
    peOcdsSnapshot,
    clSnapshot,
  ],
}, null, 2)}\n`, "utf8");

async function fetchPeruMefSample() {
  const response = await fetch(peMefUrl, {
    headers: { Range: peruRange },
  });
  if (!response.ok && response.status !== 206) {
    throw new Error(`PE MEF fetch failed with ${response.status}`);
  }

  const raw = Buffer.from(await response.arrayBuffer()).toString("utf8");
  const text = trimToCompleteRows(raw);
  await writeFile(peOutputPath, text, "utf8");

  return {
    sourceId: "PE-MEF-GASTO-DIARIO",
    rawPath: "data/official/pe/mef-2026-gasto-diario.sample.csv",
    fetchUrl: peMefUrl,
    fetchedAt: new Date().toISOString(),
    contentType: response.headers.get("content-type") ?? "text/csv",
    contentRange: response.headers.get("content-range"),
    partial: true,
    fileHash: hashText(text),
    byteSize: Buffer.byteLength(text, "utf8"),
  };
}

async function fetchTextSnapshot({
  sourceId,
  url,
  outputPath,
  rawPath,
}: {
  sourceId: string;
  url: string;
  outputPath: URL;
  rawPath: string;
}) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${sourceId} fetch failed with ${response.status}`);
  const text = await response.text();
  await writeFile(outputPath, text, "utf8");
  return {
    sourceId,
    rawPath,
    fetchUrl: url,
    fetchedAt: new Date().toISOString(),
    contentType: response.headers.get("content-type") ?? "text/csv",
    contentLength: response.headers.get("content-length"),
    partial: false,
    fileHash: hashText(text),
    byteSize: Buffer.byteLength(text, "utf8"),
  };
}

async function fetchPeruOeceContracts() {
  const response = await fetch(peOeceContractsUrl);
  if (!response.ok) {
    throw new Error(`PE OECE contracts fetch failed with ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(peContractsOutputPath, buffer);

  return {
    sourceId: "PE-OECE-CONTRATOS",
    rawPath: "data/official/pe/oece-contratos-2025.xlsx",
    fetchUrl: peOeceContractsUrl,
    fetchedAt: new Date().toISOString(),
    contentType:
      response.headers.get("content-type") ??
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    contentLength: response.headers.get("content-length"),
    partial: false,
    fileHash: hashBuffer(buffer),
    byteSize: buffer.byteLength,
  };
}

async function fetchPeruOcdsContractReleases() {
  const buffer = await readFile(peContractsOutputPath);
  const rows = readXlsxRows(buffer, { limit: 30 }).rows;
  const tenderIds = Array.from(new Set(
    rows.slice(0, 25)
      .map((row) => String(row.codigoconvocatoria ?? "").trim())
      .filter(Boolean),
  ));
  const fetchedAt = new Date().toISOString();
  const releases = [];

  for (const tenderId of tenderIds) {
    const fetchUrl = buildPeruOcdsReleaseUrl(tenderId);
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`PE OECE OCDS release ${tenderId} failed with ${response.status}`);
    }
    releases.push({ tenderId, fetchUrl, package: await response.json() });
    await sleep(250);
  }

  const payload = {
    sourceId: "PE-OECE-OCDS",
    sourceName: "Portal de contrataciones abiertas OCDS",
    sourceUrl: "https://contratacionesabiertas.oece.gob.pe/descargas",
    apiPattern: "https://contratacionesabiertas.oece.gob.pe/api/v1/release/seace_v3/{tenderId}",
    partial: true,
    selection: {
      basis: "First 25 PE-OECE-CONTRATOS rows used by the demo case builder",
      tenderIds,
    },
    releases,
  };
  const text = `${JSON.stringify(payload)}\n`;
  await writeFile(peOcdsOutputPath, text, "utf8");

  return {
    sourceId: "PE-OECE-OCDS",
    rawPath: "data/official/pe/oece-ocds-seace-v3-contract-releases.sample.json",
    fetchUrl: payload.apiPattern,
    fetchedAt,
    contentType: "application/json",
    recordCount: releases.length,
    partial: true,
    fileHash: hashText(text),
    byteSize: Buffer.byteLength(text, "utf8"),
  };
}

async function fetchChileCompraSample() {
  try {
    const list = await fetchJson<ChileListResponse>(clListUrl);
    const listing = list.Listado.slice(0, chileCompraDetailLimit);
    const details: ChileDetailResponse[] = [];
    for (const item of listing) {
      details.push(await fetchChileDetail(item));
      await sleep(chileCompraDetailDelayMs);
    }
    const payload = {
      sourceId: "CL-MERCADO-PUBLICO-API",
      sampleDate: chileCompraDate,
      sampleState: chileCompraState,
      list: {
        ...list,
        FechaCreacion: null,
        Listado: listing,
      },
      details: details.map((detail) => ({
        ...detail,
        FechaCreacion: null,
      })),
    };
    const text = `${JSON.stringify(payload, null, 2)}\n`;
    await writeFile(clOutputPath, text, "utf8");
    return buildChileSnapshotEntry(text, details.length);
  } catch (error) {
    const cached = await readFile(clOutputPath, "utf8");
    const parsed = JSON.parse(cached) as { details?: unknown[] };
    return {
      ...buildChileSnapshotEntry(cached, parsed.details?.length ?? 0),
      fetchWarning: error instanceof Error ? error.message : "unknown_fetch_error",
    };
  }
}

function buildChileSnapshotEntry(text: string, recordCount: number) {
  return {
    sourceId: "CL-MERCADO-PUBLICO-API",
    rawPath: "data/official/cl/mercado-publico-licitaciones-adjudicadas-2026-05-15.sample.json",
    fetchUrl: redactTicket(clListUrl),
    fetchedAt: new Date().toISOString(),
    contentType: "application/json",
    recordCount,
    partial: true,
    fileHash: hashText(text),
    byteSize: Buffer.byteLength(text, "utf8"),
  };
}

async function fetchJson<T>(
  url: string,
  options: { retries?: number; retryDelayMs?: number } = {},
): Promise<T> {
  const retries = options.retries ?? 0;
  const retryDelayMs = options.retryDelayMs ?? 0;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url);
    if (response.ok) return response.json() as Promise<T>;
    if (response.status !== 429 || attempt === retries) {
      throw new Error(`Fetch failed with ${response.status}: ${redactTicket(url)}`);
    }
    await sleep(retryDelayMsFor(response, retryDelayMs, attempt));
  }
  throw new Error(`Fetch failed: ${redactTicket(url)}`);
}

async function fetchChileDetail(item: ChileListItem): Promise<ChileDetailResponse> {
  try {
    return await fetchJson<ChileDetailResponse>(buildChileCompraDetailUrl(item.CodigoExterno), {
      retries: 3,
      retryDelayMs: 10_000,
    });
  } catch (error) {
    return {
      Cantidad: 1,
      FechaCreacion: null,
      Version: "v1",
      Listado: [item],
      fetchWarning: error instanceof Error ? error.message : "unknown_fetch_error",
    };
  }
}

function buildChileCompraDetailUrl(code: string): string {
  return `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?codigo=${encodeURIComponent(code)}&ticket=${chileCompraTicket}`;
}

function buildPeruOcdsReleaseUrl(tenderId: string): string {
  return `https://contratacionesabiertas.oece.gob.pe/api/v1/release/seace_v3/${encodeURIComponent(tenderId)}`;
}

function trimToCompleteRows(text: string): string {
  const lastBreak = text.lastIndexOf("\n");
  if (lastBreak < 0) return text;
  return text.slice(0, lastBreak + 1);
}

function hashText(text: string): string {
  return `sha256-${createHash("sha256").update(text).digest("hex")}`;
}

function hashBuffer(buffer: Buffer): string {
  return `sha256-${createHash("sha256").update(buffer).digest("hex")}`;
}

function redactTicket(url: string): string {
  return url.replace(/ticket=[^&]+/i, "ticket=<redacted>");
}

function retryDelayMsFor(response: Response, fallbackMs: number, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  const retryAfterSeconds = retryAfter ? Number(retryAfter) : null;
  if (retryAfterSeconds && Number.isFinite(retryAfterSeconds)) {
    return Math.max(retryAfterSeconds * 1000, fallbackMs);
  }
  return fallbackMs * (attempt + 1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ChileListItem {
  CodigoExterno: string;
  Nombre: string;
  CodigoEstado: number;
  FechaCierre: string | null;
}

interface ChileListResponse {
  Cantidad: number;
  FechaCreacion: string | null;
  Version: string;
  Listado: ChileListItem[];
}

interface ChileDetailResponse {
  Cantidad: number;
  FechaCreacion: string | null;
  Version: string;
  Listado: unknown[];
  fetchWarning?: string;
}
