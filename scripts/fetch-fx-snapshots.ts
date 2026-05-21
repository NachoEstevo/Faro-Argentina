import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const fxOutputDir = new URL("../data/official/fx/", import.meta.url);
const manifestPath = new URL("../data/official/snapshot-manifest.json", import.meta.url);

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
