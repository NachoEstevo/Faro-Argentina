import { createHash, createHmac, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  buildUserContribution,
  extensionForAttachment,
  type ContributionAttachmentDraft,
  type UserContribution,
  type UserContributionDraft,
} from "../data/userContributions.ts";

export interface ContributionFileUpload {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  bytes: Uint8Array;
  note?: string;
}

export interface StoreContributionInput {
  draft: Omit<UserContributionDraft, "attachments">;
  files: ContributionFileUpload[];
  now?: Date;
  id?: string;
}

export interface StoreContributionResult {
  contribution: UserContribution;
  storageMode: "local" | "r2";
  manifestKey: string;
}

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export async function storeContribution(input: StoreContributionInput): Promise<StoreContributionResult> {
  const createdAt = (input.now ?? new Date()).toISOString();
  const contributionId = input.id ?? createContributionId(createdAt);
  const attachmentDrafts = input.files.map(toAttachmentDraft);
  const attachmentKeys = input.files.map((file, index) =>
    `submissions/${contributionId}/ATT-${String(index + 1).padStart(3, "0")}.${extensionForAttachment(file.filename, file.mimeType)}`,
  );
  const contribution = buildUserContribution(
    { ...input.draft, attachments: attachmentDrafts },
    { id: contributionId, createdAt, attachmentKeys },
  );
  const manifestKey = `submissions/${contributionId}/submission.json`;
  const r2Config = getR2Config();

  if (r2Config) {
    await storeInR2({ contribution, files: input.files, attachmentKeys, manifestKey, config: r2Config });
    return { contribution, storageMode: "r2", manifestKey };
  }

  await storeLocally({ contribution, files: input.files, attachmentKeys });
  return { contribution, storageMode: "local", manifestKey: `submissions/${contributionId}.json` };
}

function toAttachmentDraft(file: ContributionFileUpload): ContributionAttachmentDraft {
  return {
    filename: file.filename,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    note: file.note,
  };
}

async function storeLocally({
  contribution,
  files,
  attachmentKeys,
}: {
  contribution: UserContribution;
  files: ContributionFileUpload[];
  attachmentKeys: string[];
}) {
  const root = process.env.FARO_CONTRIBUTIONS_STORAGE_DIR ??
    join(/*turbopackIgnore: true*/ process.cwd(), ".faro-contributions");
  await Promise.all(
    files.map(async (file, index) => {
      const target = localPath(root, attachmentKeys[index]);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.bytes);
    }),
  );
  const manifestPath = localPath(root, "submissions", `${contribution.id}.json`);
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify(contribution, null, 2), "utf8");
}

async function storeInR2({
  contribution,
  files,
  attachmentKeys,
  manifestKey,
  config,
}: {
  contribution: UserContribution;
  files: ContributionFileUpload[];
  attachmentKeys: string[];
  manifestKey: string;
  config: R2Config;
}) {
  for (let index = 0; index < files.length; index += 1) {
    await putR2Object({
      config,
      key: attachmentKeys[index],
      body: files[index].bytes,
      contentType: files[index].mimeType,
    });
  }
  await putR2Object({
    config,
    key: manifestKey,
    body: new TextEncoder().encode(JSON.stringify(contribution, null, 2)),
    contentType: "application/json; charset=utf-8",
  });
}

async function putR2Object({
  config,
  key,
  body,
  contentType,
}: {
  config: R2Config;
  key: string;
  body: Uint8Array;
  contentType: string;
}) {
  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`;
  const pathname = `/${config.bucket}/${encodeKeyPath(key)}`;
  const url = new URL(pathname, endpoint);
  const amzDate = toAmzDate(new Date());
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);
  const headers = {
    "content-type": contentType,
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
    "PUT",
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
  const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, "auto", "s3");
  const signature = hmacHex(signingKey, stringToSign);
  const authorization = [
    "AWS4-HMAC-SHA256",
    `Credential=${config.accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(", ");

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      ...headers,
      authorization,
    },
    body: Buffer.from(body),
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed for ${key}: ${response.status} ${await response.text()}`);
  }
}

function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET ?? "faro-contributions";
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

function createContributionId(createdAt: string): string {
  const date = createdAt.slice(0, 10).replace(/-/g, "");
  return `APORTE-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function localPath(root: string, ...segments: string[]): string {
  return join(/*turbopackIgnore: true*/ root, ...segments);
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
