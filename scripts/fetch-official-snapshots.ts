import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const arOutputDir = new URL("../data/official/ar/", import.meta.url);
const manifestPath = new URL("../data/official/snapshot-manifest.json", import.meta.url);

const argentinaSources = [
  {
    sourceId: "AR-CONTRATAR-CONTRATOS",
    rawPath: "data/official/ar/onc-contratar-contratos.csv",
    outputPath: new URL("../data/official/ar/onc-contratar-contratos.csv", import.meta.url),
    url: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.4/download/onc-contratar-contratos.csv",
  },
  {
    sourceId: "AR-CONTRATAR-PROCEDIMIENTOS",
    rawPath: "data/official/ar/onc-contratar-procedimientos.csv",
    outputPath: new URL("../data/official/ar/onc-contratar-procedimientos.csv", import.meta.url),
    url: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.1/download/onc-contratar-procedimientos.csv",
  },
  {
    sourceId: "AR-CONTRATAR-OFERTAS",
    rawPath: "data/official/ar/onc-contratar-ofertas.csv",
    outputPath: new URL("../data/official/ar/onc-contratar-ofertas.csv", import.meta.url),
    url: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.3/download/onc-contratar-ofertas.csv",
  },
  {
    sourceId: "AR-CONTRATAR-OBRAS",
    rawPath: "data/official/ar/onc-contratar-obras.csv",
    outputPath: new URL("../data/official/ar/onc-contratar-obras.csv", import.meta.url),
    url: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.5/download/onc-contratar-obras.csv",
  },
  {
    sourceId: "AR-CONTRATAR-UBICACION",
    rawPath: "data/official/ar/onc-contratar-ubicacion-geografica.csv",
    outputPath: new URL("../data/official/ar/onc-contratar-ubicacion-geografica.csv", import.meta.url),
    url: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.6/download/onc-contratar-ubicacion-geografica.csv",
  },
  {
    sourceId: "AR-CONTRATAR-ACTAS-APERTURA",
    rawPath: "data/official/ar/onc-contratar-actas-apertura.csv",
    outputPath: new URL("../data/official/ar/onc-contratar-actas-apertura.csv", import.meta.url),
    url: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.8/download/onc-contratar-actas-apertura.csv",
  },
  {
    sourceId: "AR-SIPRO-PROVEEDORES",
    rawPath: "data/official/ar/sipro-proveedores.csv",
    outputPath: new URL("../data/official/ar/sipro-proveedores.csv", import.meta.url),
    url: "https://infra.datos.gob.ar/catalog/modernizacion/dataset/2/distribution/2.11/download/proveedores.csv",
  },
];

await mkdir(arOutputDir, { recursive: true });
const snapshots = [];

for (const source of argentinaSources) {
  snapshots.push(await fetchTextSnapshot(source));
}

await writeFile(manifestPath, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  snapshots,
}, null, 2)}\n`, "utf8");

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

function hashText(text: string): string {
  return `sha256-${createHash("sha256").update(text).digest("hex")}`;
}
