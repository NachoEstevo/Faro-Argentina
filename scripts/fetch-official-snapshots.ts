import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const chileCompraTicket =
  process.env.CHILECOMPRA_TICKET ?? "F8537A18-6766-4DEF-9E59-426B4FEE2844";
const chileCompraDate = process.env.CHILECOMPRA_SAMPLE_DATE ?? "15052026";
const chileCompraState = process.env.CHILECOMPRA_STATE ?? "adjudicada";
const chileCompraDetailLimit = Number(process.env.CHILECOMPRA_DETAIL_LIMIT ?? "3");
const peruRange = process.env.PERU_MEF_RANGE ?? "bytes=0-120000";

const peOutputPath = new URL(
  "../data/official/pe/mef-2026-gasto-diario.sample.csv",
  import.meta.url,
);
const clOutputPath = new URL(
  "../data/official/cl/mercado-publico-licitaciones-adjudicadas-2026-05-15.sample.json",
  import.meta.url,
);
const manifestPath = new URL("../data/official/snapshot-manifest.json", import.meta.url);

const peMefUrl = "https://fs.datosabiertos.mef.gob.pe/datastorefiles/2026-Gasto-Diario.csv";
const clListUrl = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?fecha=${chileCompraDate}&estado=${chileCompraState}&ticket=${chileCompraTicket}`;

await mkdir(new URL("../data/official/pe/", import.meta.url), { recursive: true });
await mkdir(new URL("../data/official/cl/", import.meta.url), { recursive: true });

const peSnapshot = await fetchPeruMefSample();
const clSnapshot = await fetchChileCompraSample();

await writeFile(manifestPath, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  snapshots: [peSnapshot, clSnapshot],
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

async function fetchChileCompraSample() {
  const list = await fetchJson<ChileListResponse>(clListUrl);
  const listing = list.Listado.slice(0, chileCompraDetailLimit);
  const details: ChileDetailResponse[] = [];
  for (const item of listing) {
    details.push(await fetchChileDetail(item));
    await sleep(750);
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

  return {
    sourceId: "CL-MERCADO-PUBLICO-API",
    rawPath: "data/official/cl/mercado-publico-licitaciones-adjudicadas-2026-05-15.sample.json",
    fetchUrl: redactTicket(clListUrl),
    fetchedAt: new Date().toISOString(),
    contentType: "application/json",
    recordCount: details.length,
    partial: true,
    fileHash: hashText(text),
    byteSize: Buffer.byteLength(text, "utf8"),
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch failed with ${response.status}: ${redactTicket(url)}`);
  return response.json() as Promise<T>;
}

async function fetchChileDetail(item: ChileListItem): Promise<ChileDetailResponse> {
  try {
    return await fetchJson<ChileDetailResponse>(buildChileCompraDetailUrl(item.CodigoExterno));
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

function trimToCompleteRows(text: string): string {
  const lastBreak = text.lastIndexOf("\n");
  if (lastBreak < 0) return text;
  return text.slice(0, lastBreak + 1);
}

function hashText(text: string): string {
  return `sha256-${createHash("sha256").update(text).digest("hex")}`;
}

function redactTicket(url: string): string {
  return url.replace(/ticket=[^&]+/i, "ticket=<redacted>");
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
