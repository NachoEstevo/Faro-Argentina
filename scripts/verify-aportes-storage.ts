import { createHash, createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

import { storeContribution } from "../src/lib/server/contributionStorage.ts";

const requiredKeys = [
  "STORAGE_ENDPOINT",
  "STORAGE_BUCKET",
  "STORAGE_ACCESS_KEY",
  "STORAGE_SECRET_KEY",
] as const;

loadEnvFile(".env.local");
loadEnvFile(".env");

const missing = requiredKeys.filter((key) => !process.env[key]?.trim());
if (missing.length > 0) {
  throw new Error(`Missing storage env: ${missing.join(", ")}`);
}

const endpoint = process.env.STORAGE_ENDPOINT!.replace(/\/+$/, "");
const bucket = process.env.STORAGE_BUCKET!;
const accessKeyId = process.env.STORAGE_ACCESS_KEY!;
const secretAccessKey = process.env.STORAGE_SECRET_KEY!;
const createdAt = new Date().toISOString();
const submissionId = `APORTE-R2-SMOKE-${createdAt.replace(/[-:.TZ]/g, "").slice(0, 14)}`;
const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

const result = await storeContribution({
  id: submissionId,
  now: new Date(createdAt),
  draft: {
    type: "add_photo",
    title: "Prueba tecnica de storage privado",
    jurisdiction: "AR",
    explanation: "Verificacion tecnica real de subida privada a R2 para Aportes Faro.",
    relatedCase: "AR-CONTRATAR-CONTRATOS-381-1001-CON21",
    approximateLocation: "Verificacion tecnica",
    sourcePermissionConfirmed: true,
    reviewConfirmed: true,
  },
  files: [
    {
      filename: "faro-aportes-r2-smoke.png",
      mimeType: "image/png",
      sizeBytes: pngBytes.byteLength,
      bytes: pngBytes,
    },
  ],
});

if (result.storageMode !== "r2") {
  throw new Error(`Expected R2 storage, got ${result.storageMode}`);
}

const attachmentKey = result.contribution.attachments[0]?.objectKey;
if (!attachmentKey) {
  throw new Error("Contribution did not include an attachment object key.");
}

await assertR2ObjectExists(attachmentKey);
await assertR2ObjectExists(result.manifestKey);

console.log(JSON.stringify({
  ok: true,
  storageMode: result.storageMode,
  bucket,
  submissionId: result.contribution.id,
  attachmentKey,
  manifestKey: result.manifestKey,
  verifiedObjects: 2,
}, null, 2));

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    if (process.env[key]) continue;
    process.env[key] = parseEnvValue(trimmed.slice(index + 1).trim());
  }
}

function parseEnvValue(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

async function assertR2ObjectExists(key: string) {
  const response = await signedR2Fetch("HEAD", key);
  if (!response.ok) {
    throw new Error(`R2 verification failed for ${key}: ${response.status} ${await response.text()}`);
  }
}

async function signedR2Fetch(method: "HEAD", key: string): Promise<Response> {
  const pathname = `/${bucket}/${encodeKeyPath(key)}`;
  const url = new URL(pathname, endpoint);
  const amzDate = toAmzDate(new Date());
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex("");
  const headers = {
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((name) => `${name}:${headers[name as keyof typeof headers]}\n`)
    .join("");
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const canonicalRequest = [
    method,
    url.pathname,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = getSignatureKey(secretAccessKey, dateStamp, "auto", "s3");
  const signature = hmacHex(signingKey, stringToSign);
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(url, {
    method,
    headers: {
      ...headers,
      Authorization: authorization,
    },
  });
}

function encodeKeyPath(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

function sha256Hex(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

function hmacHex(key: Buffer, value: string): string {
  return createHmac("sha256", key).update(value).digest("hex");
}

function getSignatureKey(secret: string, dateStamp: string, region: string, service: string): Buffer {
  const dateKey = hmac(`AWS4${secret}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, service);
  return hmac(serviceKey, "aws4_request");
}

function toAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}
