import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const fxOutputDir = new URL("../data/official/fx/", import.meta.url);
const manifestPath = new URL("../data/official/snapshot-manifest.json", import.meta.url);

const startYear = Number(process.env.FX_START_YEAR ?? "2000");
const endYear = Number(process.env.FX_END_YEAR ?? new Date().getFullYear());

interface SnapshotEntry {
  sourceId: string;
  rawPath: string;
  fetchUrl: string;
  fetchedAt: string;
  contentType: string;
  contentLength: string;
  partial: boolean;
  fileHash: string;
  byteSize: number;
}

interface Manifest {
  generatedAt: string;
  snapshots: SnapshotEntry[];
}

await mkdir(fxOutputDir, { recursive: true });
const manifest = await readManifest();

await fetchArgentina();
await fetchPeru();
await fetchChile();

manifest.generatedAt = new Date().toISOString();
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log("Manifest updated.");

async function fetchArgentina(): Promise<void> {
  const sourceId = "AR-BCRA-COM-A3500";
  const fetchUrl =
    "https://infra.datos.gob.ar/catalog/sspm/dataset/175/distribution/175.1/download/tipos-de-cambio-historicos.csv";
  const outputName = "ar-bcra-com-a3500.csv";
  console.log(`Fetching ${sourceId} from ${fetchUrl}`);
  const response = await fetch(fetchUrl);
  if (!response.ok) throw new Error(`${sourceId}: ${response.status} ${response.statusText}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const outputPath = new URL(outputName, fxOutputDir);
  await writeFile(outputPath, buffer);
  const hash = sha256(buffer);
  upsert({
    sourceId,
    rawPath: `data/official/fx/${outputName}`,
    fetchUrl,
    fetchedAt: new Date().toISOString(),
    contentType: response.headers.get("content-type") ?? "text/csv",
    contentLength: String(buffer.byteLength),
    partial: false,
    fileHash: `sha256-${hash}`,
    byteSize: buffer.byteLength,
  });
  console.log(`  wrote ${buffer.byteLength} bytes, sha256-${hash.slice(0, 12)}...`);
}

async function fetchPeru(): Promise<void> {
  const sourceId = "PE-BCRP-SBS-VENTA";
  const fetchUrl = `https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PD04640PD/csv/${startYear}-01-01/${endYear}-12-31`;
  const outputName = "pe-bcrp-sbs-venta.csv";
  console.log(`Fetching ${sourceId} from ${fetchUrl}`);
  const response = await fetch(fetchUrl);
  if (!response.ok) throw new Error(`${sourceId}: ${response.status} ${response.statusText}`);
  const rawText = await response.text();
  const csv = bcrpRawToCsv(rawText);
  const buffer = Buffer.from(csv, "utf8");
  const outputPath = new URL(outputName, fxOutputDir);
  await writeFile(outputPath, buffer);
  const hash = sha256(buffer);
  upsert({
    sourceId,
    rawPath: `data/official/fx/${outputName}`,
    fetchUrl,
    fetchedAt: new Date().toISOString(),
    contentType: "text/csv",
    contentLength: String(buffer.byteLength),
    partial: false,
    fileHash: `sha256-${hash}`,
    byteSize: buffer.byteLength,
  });
  console.log(`  wrote ${buffer.byteLength} bytes, sha256-${hash.slice(0, 12)}...`);
}

async function fetchChile(): Promise<void> {
  const sourceId = "CL-BCCH-DOLAR-OBSERVADO";
  const outputName = "cl-bcch-dolar-observado.csv";
  console.log(`Fetching ${sourceId} (year ${startYear}..${endYear}) via mindicador.cl`);
  const rows: string[] = ["fecha,dolar_observado"];
  const baseUrl = "https://mindicador.cl/api/dolar";
  for (let year = startYear; year <= endYear; year += 1) {
    const url = `${baseUrl}/${year}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${sourceId}: year ${year} returned ${response.status}`);
    }
    const payload = (await response.json()) as MindicadorPayload;
    for (const entry of payload.serie) {
      const isoDate = entry.fecha.slice(0, 10);
      rows.push(`${isoDate},${entry.valor}`);
    }
  }
  const csv = rows.join("\n") + "\n";
  const buffer = Buffer.from(csv, "utf8");
  const outputPath = new URL(outputName, fxOutputDir);
  await writeFile(outputPath, buffer);
  const hash = sha256(buffer);
  upsert({
    sourceId,
    rawPath: `data/official/fx/${outputName}`,
    fetchUrl: `${baseUrl}/{year}`,
    fetchedAt: new Date().toISOString(),
    contentType: "text/csv",
    contentLength: String(buffer.byteLength),
    partial: false,
    fileHash: `sha256-${hash}`,
    byteSize: buffer.byteLength,
  });
  console.log(`  wrote ${buffer.byteLength} bytes, sha256-${hash.slice(0, 12)}...`);
}

function bcrpRawToCsv(rawText: string): string {
  const monthIndex: Record<string, string> = {
    ene: "01",
    feb: "02",
    mar: "03",
    abr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    ago: "08",
    set: "09",
    sep: "09",
    oct: "10",
    nov: "11",
    dic: "12",
  };
  const lines = rawText
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&[a-z]+;/gi, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const rows: string[] = ["fecha,tipo_cambio_sbs_venta"];
  for (const line of lines) {
    const match = line.match(/^"?(\d{2})\.(\w{3})\.(\d{2})"?,"?([\d.]+)"?$/);
    if (!match) continue;
    const [, dd, monAbbr, yy, valueRaw] = match;
    const mm = monthIndex[monAbbr.toLowerCase()];
    if (!mm) continue;
    const yyNum = Number(yy);
    if (!Number.isFinite(yyNum)) continue;
    const yyyy = yyNum >= 70 ? `19${yy}` : `20${yy}`;
    rows.push(`${yyyy}-${mm}-${dd},${valueRaw}`);
  }
  return rows.join("\n") + "\n";
}

interface MindicadorPayload {
  serie: Array<{ fecha: string; valor: number }>;
}

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

async function readManifest(): Promise<Manifest> {
  const text = await readFile(manifestPath, "utf8");
  return JSON.parse(text) as Manifest;
}

function upsert(entry: SnapshotEntry): void {
  const index = manifest.snapshots.findIndex((s) => s.sourceId === entry.sourceId);
  if (index === -1) manifest.snapshots.push(entry);
  else manifest.snapshots[index] = entry;
}
