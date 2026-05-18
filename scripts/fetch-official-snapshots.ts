import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import {
  buildChileOcdsListUrl,
  buildChileOcdsRawPath,
  buildChileOcdsSnapshotPlan,
  type ChileOcdsSnapshotPeriod,
} from "../src/lib/data/chileOcdsSnapshots.ts";
import { readXlsxRows } from "../src/lib/data/xlsx.ts";

const chileCompraTicket =
  process.env.CHILECOMPRA_TICKET ?? "F8537A18-6766-4DEF-9E59-426B4FEE2844";
const chileCompraDate = process.env.CHILECOMPRA_SAMPLE_DATE ?? "15052026";
const chileCompraState = process.env.CHILECOMPRA_STATE ?? "adjudicada";
const chileCompraDetailLimit = Number(process.env.CHILECOMPRA_DETAIL_LIMIT ?? "25");
const chileCompraDetailDelayMs = Number(process.env.CHILECOMPRA_DETAIL_DELAY_MS ?? "1500");
const chileCompraOcdsYear = Number(process.env.CHILECOMPRA_OCDS_YEAR ?? "2026");
const chileCompraOcdsMonth = Number(process.env.CHILECOMPRA_OCDS_MONTH ?? "1");
const chileCompraOcdsLimit = Number(process.env.CHILECOMPRA_OCDS_LIMIT ?? "500");
const chileCompraOcdsHistoricalYears = parseNumberList(
  process.env.CHILECOMPRA_OCDS_HISTORICAL_YEARS ?? "2019,2020,2021,2022,2023,2024,2025",
);
const chileCompraOcdsHistoricalMonth = Number(process.env.CHILECOMPRA_OCDS_HISTORICAL_MONTH ?? "1");
const chileCompraOcdsHistoricalLimit = Number(process.env.CHILECOMPRA_OCDS_HISTORICAL_LIMIT ?? "25");
const chileCompraOcdsPeriods = process.env.CHILECOMPRA_OCDS_PERIODS;
const chileCompraOcdsDelayMs = Number(process.env.CHILECOMPRA_OCDS_DELAY_MS ?? "75");
const peruRange = process.env.PERU_MEF_RANGE ?? "bytes=0-120000";
const peruOeceContractLimit = Number(process.env.PERU_OECE_CONTRACT_LIMIT ?? "500");
const reuseFetchedSnapshots = process.env.FARO_REUSE_SNAPSHOTS === "1";
const chileOcdsSnapshotPlan = buildChileOcdsSnapshotPlan({
  override: chileCompraOcdsPeriods,
  currentYear: chileCompraOcdsYear,
  currentMonth: chileCompraOcdsMonth,
  currentLimit: chileCompraOcdsLimit,
  historicalYears: chileCompraOcdsHistoricalYears,
  historicalMonth: chileCompraOcdsHistoricalMonth,
  historicalLimit: chileCompraOcdsHistoricalLimit,
});

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
const peDistrictCentroidsOutputPath = new URL(
  "../data/official/pe/idep-district-centroids.json",
  import.meta.url,
);
const clOutputPath = new URL(
  "../data/official/cl/mercado-publico-licitaciones-adjudicadas-2026-05-15.sample.json",
  import.meta.url,
);
const clCommuneCentroidsOutputPath = new URL(
  "../data/official/cl/ciren-commune-centroids.json",
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
const peDistrictLayerUrl =
  "https://www.idep.gob.pe/geoportal/rest/services/DATOS_GEOESPACIALES/L%C3%8DMITES/MapServer/5";
const clCommuneLayerUrl =
  "https://esri.ciren.cl/server/rest/services/LIMITES_ADMINISTRATIVOS/MapServer/3";

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
const peDistrictCentroidsSnapshot = await fetchPeruDistrictCentroids();
const peOcdsSnapshot = await fetchPeruOcdsContractReleases();
const clCommuneCentroidsSnapshot = await fetchChileCommuneCentroids();
const clOcdsSnapshots = await fetchChileCompraOcdsProcesses();
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
    peDistrictCentroidsSnapshot,
    peOcdsSnapshot,
    clCommuneCentroidsSnapshot,
    ...clOcdsSnapshots,
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
  const reused = await reuseJsonSnapshot({
    sourceId: "PE-OECE-OCDS",
    outputPath: peOcdsOutputPath,
    rawPath: "data/official/pe/oece-ocds-seace-v3-contract-releases.sample.json",
    fetchUrl: "https://contratacionesabiertas.oece.gob.pe/api/v1/release/seace_v3/{tenderId}",
    recordKey: "releases",
    failedKeyPath: ["selection", "failedReleases"],
  });
  if (reused) return reused;

  const buffer = await readFile(peContractsOutputPath);
  const rows = readXlsxRows(buffer, { limit: peruOeceContractLimit }).rows;
  const tenderIds = Array.from(new Set(
    rows.slice(0, peruOeceContractLimit)
      .map((row) => String(row.codigoconvocatoria ?? "").trim())
      .filter(Boolean),
  ));
  const fetchedAt = new Date().toISOString();
  const releases = [];
  const failedReleases = [];

  for (const tenderId of tenderIds) {
    const fetchUrl = buildPeruOcdsReleaseUrl(tenderId);
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      failedReleases.push({ tenderId, fetchUrl, status: response.status });
      await sleep(250);
      continue;
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
      basis: `First ${peruOeceContractLimit} PE-OECE-CONTRATOS rows used by the case builder`,
      tenderIds,
      failedReleases,
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
    failedCount: failedReleases.length,
    partial: true,
    fileHash: hashText(text),
    byteSize: Buffer.byteLength(text, "utf8"),
  };
}

async function fetchPeruDistrictCentroids() {
  const reused = await reuseJsonSnapshot({
    sourceId: "PE-IDEP-LIMITE-DISTRITAL",
    outputPath: peDistrictCentroidsOutputPath,
    rawPath: "data/official/pe/idep-district-centroids.json",
    fetchUrl: `${peDistrictLayerUrl}/query`,
    recordKey: "centroids",
  });
  if (reused) return reused;

  const features = await fetchArcGisFeatures({
    sourceId: "PE-IDEP-LIMITE-DISTRITAL",
    layerUrl: peDistrictLayerUrl,
    outFields: "UBIGEO,NOMBDEP,NOMBPROV,NOMBDIST",
    pageSize: 100,
  });
  const centroids = features.flatMap((feature) => {
    const centroid = centroidFromRings(feature.geometry?.rings);
    if (!centroid) return [];
    return [{
      countryCode: "PE",
      code: String(feature.attributes.UBIGEO ?? "").trim(),
      region: String(feature.attributes.NOMBDEP ?? "").trim(),
      province: String(feature.attributes.NOMBPROV ?? "").trim(),
      district: String(feature.attributes.NOMBDIST ?? "").trim(),
      coordinates: roundPoint({ lat: centroid.y, lon: centroid.x }),
      sourceId: "PE-IDEP-LIMITE-DISTRITAL",
    }];
  });
  const text = `${JSON.stringify({
    sourceId: "PE-IDEP-LIMITE-DISTRITAL",
    sourceName: "IDEP limite distrital",
    sourceUrl: peDistrictLayerUrl,
    generatedAt: new Date().toISOString(),
    centroids,
  }, null, 2)}\n`;
  await writeFile(peDistrictCentroidsOutputPath, text, "utf8");

  return {
    sourceId: "PE-IDEP-LIMITE-DISTRITAL",
    rawPath: "data/official/pe/idep-district-centroids.json",
    fetchUrl: `${peDistrictLayerUrl}/query`,
    fetchedAt: new Date().toISOString(),
    contentType: "application/json",
    recordCount: centroids.length,
    partial: false,
    fileHash: hashText(text),
    byteSize: Buffer.byteLength(text, "utf8"),
  };
}

async function fetchChileCommuneCentroids() {
  const reused = await reuseJsonSnapshot({
    sourceId: "CL-CIREN-LIMITE-COMUNAL",
    outputPath: clCommuneCentroidsOutputPath,
    rawPath: "data/official/cl/ciren-commune-centroids.json",
    fetchUrl: `${clCommuneLayerUrl}/query`,
    recordKey: "centroids",
  });
  if (reused) return reused;

  const features = await fetchArcGisFeatures({
    sourceId: "CL-CIREN-LIMITE-COMUNAL",
    layerUrl: clCommuneLayerUrl,
    outFields: "codreg,codpro,codcom,nomreg,nompro,nomcom",
    pageSize: 50,
    geometryPrecision: 0,
    maxAllowableOffset: 5000,
  });
  const centroids = features.flatMap((feature) => {
    const webMercatorCentroid = centroidFromRings(feature.geometry?.rings);
    if (!webMercatorCentroid) return [];
    return [{
      countryCode: "CL",
      code: String(feature.attributes.codcom ?? "").trim(),
      region: String(feature.attributes.nomreg ?? "").trim(),
      province: String(feature.attributes.nompro ?? "").trim(),
      commune: String(feature.attributes.nomcom ?? "").trim(),
      coordinates: roundPoint(webMercatorToWgs84(webMercatorCentroid)),
      sourceId: "CL-CIREN-LIMITE-COMUNAL",
    }];
  });
  const text = `${JSON.stringify({
    sourceId: "CL-CIREN-LIMITE-COMUNAL",
    sourceName: "CIREN limite comunal Chile continental",
    sourceUrl: clCommuneLayerUrl,
    generatedAt: new Date().toISOString(),
    centroids,
  }, null, 2)}\n`;
  await writeFile(clCommuneCentroidsOutputPath, text, "utf8");

  return {
    sourceId: "CL-CIREN-LIMITE-COMUNAL",
    rawPath: "data/official/cl/ciren-commune-centroids.json",
    fetchUrl: `${clCommuneLayerUrl}/query`,
    fetchedAt: new Date().toISOString(),
    contentType: "application/json",
    recordCount: centroids.length,
    partial: false,
    fileHash: hashText(text),
    byteSize: Buffer.byteLength(text, "utf8"),
  };
}

async function fetchChileCompraSample() {
  const reused = await reuseJsonSnapshot({
    sourceId: "CL-MERCADO-PUBLICO-API",
    outputPath: clOutputPath,
    rawPath: "data/official/cl/mercado-publico-licitaciones-adjudicadas-2026-05-15.sample.json",
    fetchUrl: redactTicket(clListUrl),
    recordKey: "details",
  });
  if (reused) return reused;

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

async function fetchChileCompraOcdsProcesses() {
  const snapshots = [];
  for (const period of chileOcdsSnapshotPlan) {
    snapshots.push(await fetchChileCompraOcdsPeriod(period));
  }
  return snapshots;
}

async function fetchChileCompraOcdsPeriod(period: ChileOcdsSnapshotPeriod) {
  const rawPath = buildChileOcdsRawPath(period);
  const outputPath = new URL(`../${rawPath}`, import.meta.url);
  const fetchUrl = buildChileOcdsListUrl(period);
  const reused = await reuseJsonSnapshot({
    sourceId: "CL-CHILECOMPRA-OCDS-PROCESOS",
    outputPath,
    rawPath,
    fetchUrl,
    recordKey: "records",
    failedKeyPath: ["selection", "failedRecords"],
  });
  if (reused) return reused;

  const list = await fetchJson<ChileOcdsListResponse>(fetchUrl, {
    retries: 3,
    retryDelayMs: 5_000,
  });
  const entries = list.data.slice(0, period.limit);
  const fetchedAt = new Date().toISOString();
  const records = [];
  const failedRecords = [];

  for (const entry of entries) {
    try {
      const tenderPackage = await fetchJson<unknown>(forceHttps(entry.urlTender), {
        retries: 2,
        retryDelayMs: 2_000,
      });
      const awardPackage = entry.urlAward
        ? await fetchJson<unknown>(forceHttps(entry.urlAward), {
          retries: 2,
          retryDelayMs: 2_000,
        })
        : null;
      records.push({
        ocid: entry.ocid,
        urlTender: forceHttps(entry.urlTender),
        urlAward: entry.urlAward ? forceHttps(entry.urlAward) : null,
        urlPlanning: entry.urlPlanning ? forceHttps(entry.urlPlanning) : null,
        tenderPackage,
        awardPackage,
      });
    } catch (error) {
      failedRecords.push({
        ocid: entry.ocid,
        urlTender: entry.urlTender,
        urlAward: entry.urlAward,
        error: error instanceof Error ? error.message : "unknown_fetch_error",
      });
    }
    await sleep(chileCompraOcdsDelayMs);
  }

  const payload = {
    sourceId: "CL-CHILECOMPRA-OCDS-PROCESOS",
    sourceName: "ChileCompra descargas OCDS procesos",
    sourceUrl: "https://datos-abiertos.chilecompra.cl/descargas/procesos-ocds",
    fetchUrl,
    fetchedAt,
    selection: {
      year: period.year,
      month: period.month,
      limit: period.limit,
      totalAvailable: list.pagination.total,
      failedRecords,
    },
    records,
  };
  const text = `${JSON.stringify(payload)}\n`;
  await writeFile(outputPath, text, "utf8");

  return {
    sourceId: "CL-CHILECOMPRA-OCDS-PROCESOS",
    rawPath,
    fetchUrl,
    fetchedAt,
    contentType: "application/json",
    recordCount: records.length,
    failedCount: failedRecords.length,
    partial: true,
    fileHash: hashText(text),
    byteSize: Buffer.byteLength(text, "utf8"),
  };
}

function parseNumberList(value: string): number[] {
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item));
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

function forceHttps(url: string): string {
  return url.replace(/^http:/i, "https:");
}

async function reuseJsonSnapshot({
  sourceId,
  outputPath,
  rawPath,
  fetchUrl,
  recordKey,
  failedKeyPath,
}: {
  sourceId: string;
  outputPath: URL;
  rawPath: string;
  fetchUrl: string;
  recordKey: string;
  failedKeyPath?: string[];
}) {
  if (!reuseFetchedSnapshots) return null;
  try {
    const text = await readFile(outputPath, "utf8");
    const payload = JSON.parse(text) as Record<string, unknown>;
    const records = Array.isArray(payload[recordKey]) ? payload[recordKey] : [];
    const failed = failedKeyPath ? getNestedArray(payload, failedKeyPath) : [];
    return {
      sourceId,
      rawPath,
      fetchUrl,
      fetchedAt: new Date().toISOString(),
      contentType: "application/json",
      recordCount: records.length,
      failedCount: failed.length,
      partial: true,
      reused: true,
      fileHash: hashText(text),
      byteSize: Buffer.byteLength(text, "utf8"),
    };
  } catch {
    return null;
  }
}

function getNestedArray(payload: Record<string, unknown>, path: string[]): unknown[] {
  let current: unknown = payload;
  for (const key of path) {
    if (!current || typeof current !== "object") return [];
    current = (current as Record<string, unknown>)[key];
  }
  return Array.isArray(current) ? current : [];
}

function buildPeruOcdsReleaseUrl(tenderId: string): string {
  return `https://contratacionesabiertas.oece.gob.pe/api/v1/release/seace_v3/${encodeURIComponent(tenderId)}`;
}

async function fetchArcGisFeatures({
  sourceId,
  layerUrl,
  outFields,
  pageSize,
  geometryPrecision,
  maxAllowableOffset,
}: {
  sourceId: string;
  layerUrl: string;
  outFields: string;
  pageSize: number;
  geometryPrecision?: number;
  maxAllowableOffset?: number;
}): Promise<ArcGisFeature[]> {
  const features: ArcGisFeature[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const url = new URL(`${layerUrl}/query`);
    url.searchParams.set("where", "1=1");
    url.searchParams.set("outFields", outFields);
    url.searchParams.set("returnGeometry", "true");
    url.searchParams.set("resultOffset", String(offset));
    url.searchParams.set("resultRecordCount", String(pageSize));
    if (geometryPrecision !== undefined) {
      url.searchParams.set("geometryPrecision", String(geometryPrecision));
    }
    if (maxAllowableOffset !== undefined) {
      url.searchParams.set("maxAllowableOffset", String(maxAllowableOffset));
    }
    url.searchParams.set("f", "json");

    const payload = await fetchJson<ArcGisQueryResponse>(url.toString(), {
      retries: 3,
      retryDelayMs: 2_000,
    });
    if (payload.error) {
      throw new Error(`${sourceId} ArcGIS query failed: ${payload.error.message}`);
    }

    const page = payload.features ?? [];
    features.push(...page);
    if (!payload.exceededTransferLimit && page.length < pageSize) break;
  }
  return features;
}

function centroidFromRings(
  rings: Array<Array<[number, number]>> | undefined,
): { x: number; y: number } | null {
  if (!rings || rings.length === 0) return null;
  let weightedX = 0;
  let weightedY = 0;
  let totalArea = 0;

  rings.forEach((ring) => {
    const centroid = ringCentroid(ring);
    if (!centroid) return;
    weightedX += centroid.x * centroid.area;
    weightedY += centroid.y * centroid.area;
    totalArea += centroid.area;
  });

  if (Math.abs(totalArea) > 0) {
    return {
      x: weightedX / totalArea,
      y: weightedY / totalArea,
    };
  }

  const points = rings.flat();
  if (points.length === 0) return null;
  return {
    x: points.reduce((sum, point) => sum + point[0], 0) / points.length,
    y: points.reduce((sum, point) => sum + point[1], 0) / points.length,
  };
}

function ringCentroid(ring: Array<[number, number]>): { x: number; y: number; area: number } | null {
  if (ring.length < 3) return null;
  let twiceArea = 0;
  let centroidX = 0;
  let centroidY = 0;

  for (let index = 0; index < ring.length - 1; index += 1) {
    const current = ring[index];
    const next = ring[index + 1];
    if (!current || !next) continue;
    const cross = current[0] * next[1] - next[0] * current[1];
    twiceArea += cross;
    centroidX += (current[0] + next[0]) * cross;
    centroidY += (current[1] + next[1]) * cross;
  }

  if (twiceArea === 0) return null;
  return {
    x: centroidX / (3 * twiceArea),
    y: centroidY / (3 * twiceArea),
    area: Math.abs(twiceArea / 2),
  };
}

function webMercatorToWgs84(point: { x: number; y: number }): { lat: number; lon: number } {
  const earthRadius = 6378137;
  return {
    lat: (2 * Math.atan(Math.exp(point.y / earthRadius)) - Math.PI / 2) * 180 / Math.PI,
    lon: point.x * 180 / 20037508.34,
  };
}

function roundPoint(point: { lat: number; lon: number }): { lat: number; lon: number } {
  return {
    lat: Number(point.lat.toFixed(6)),
    lon: Number(point.lon.toFixed(6)),
  };
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

interface ChileOcdsListResponse {
  pagination: {
    total: number;
  };
  data: Array<{
    ocid: string;
    urlTender: string;
    urlAward?: string;
    urlPlanning?: string;
  }>;
}

interface ArcGisQueryResponse {
  features?: ArcGisFeature[];
  exceededTransferLimit?: boolean;
  error?: {
    message: string;
  };
}

interface ArcGisFeature {
  attributes: Record<string, string | number | null>;
  geometry?: {
    rings?: Array<Array<[number, number]>>;
  };
}
