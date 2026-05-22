import { createHash, createHmac } from "node:crypto";

export interface R2Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export interface R2Object {
  body: Uint8Array;
  contentType: string;
}

export function getR2Config(): R2Config | null {
  const endpoint = optionalEnv("STORAGE_ENDPOINT") ??
    (optionalEnv("R2_ACCOUNT_ID")
      ? `https://${optionalEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`
      : null);
  const accessKeyId = optionalEnv("STORAGE_ACCESS_KEY") ?? optionalEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = optionalEnv("STORAGE_SECRET_KEY") ?? optionalEnv("R2_SECRET_ACCESS_KEY");
  const bucket = optionalEnv("STORAGE_BUCKET") ?? optionalEnv("R2_BUCKET") ?? "faro";
  if (!endpoint || !accessKeyId || !secretAccessKey) return null;
  return { endpoint, accessKeyId, secretAccessKey, bucket };
}

export async function putR2Object({
  config,
  key,
  body,
  contentType,
}: {
  config: R2Config;
  key: string;
  body: Uint8Array;
  contentType: string;
}): Promise<void> {
  const response = await signedR2Fetch({
    config,
    key,
    method: "PUT",
    body,
    contentType,
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed for ${key}: ${response.status} ${await response.text()}`);
  }
}

export async function getR2Object(config: R2Config, key: string): Promise<R2Object> {
  const response = await signedR2Fetch({ config, key, method: "GET" });
  if (!response.ok) {
    throw new Error(`R2 read failed for ${key}: ${response.status} ${await response.text()}`);
  }
  return {
    body: new Uint8Array(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") ?? "application/octet-stream",
  };
}

export async function listR2ObjectKeys(config: R2Config, prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | null = null;
  do {
    const query = new URLSearchParams({ "list-type": "2", prefix });
    if (continuationToken) query.set("continuation-token", continuationToken);
    const response = await signedR2Fetch({ config, method: "GET", query: query.toString() });
    if (!response.ok) {
      throw new Error(`R2 list failed for ${prefix}: ${response.status} ${await response.text()}`);
    }
    const xml = await response.text();
    keys.push(...extractXmlTagValues(xml, "Key"));
    continuationToken = extractXmlTagValues(xml, "NextContinuationToken")[0] ?? null;
  } while (continuationToken);
  return keys;
}

async function signedR2Fetch({
  config,
  key,
  method,
  query = "",
  body = new Uint8Array(),
  contentType,
}: {
  config: R2Config;
  key?: string;
  method: "GET" | "PUT";
  query?: string;
  body?: Uint8Array;
  contentType?: string;
}): Promise<Response> {
  const endpoint = config.endpoint.replace(/\/+$/, "");
  const pathname = key ? `/${config.bucket}/${encodeKeyPath(key)}` : `/${config.bucket}`;
  const url = new URL(pathname, endpoint);
  url.search = query;
  const amzDate = toAmzDate(new Date());
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);
  const headers: Record<string, string> = {
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (contentType) headers["content-type"] = contentType;

  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((name) => `${name}:${headers[name]}\n`)
    .join("");
  const canonicalRequest = [
    method,
    url.pathname,
    canonicalQueryString(url.searchParams),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signature = hmacHex(getSignatureKey(config.secretAccessKey, dateStamp, "auto", "s3"), stringToSign);
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(url, {
    method,
    headers: { ...headers, Authorization: authorization },
    body: method === "PUT" ? Buffer.from(body) : undefined,
  });
}

function optionalEnv(key: string): string | null {
  const value = process.env[key]?.trim();
  return value ? value : null;
}

function canonicalQueryString(searchParams: URLSearchParams): string {
  return [...searchParams.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

function extractXmlTagValues(xml: string, tagName: string): string[] {
  const pattern = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, "g");
  return [...xml.matchAll(pattern)].map((match) => unescapeXml(match[1] ?? ""));
}

function unescapeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
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
