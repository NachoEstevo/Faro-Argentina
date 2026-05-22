import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  buildUserContribution,
  extensionForAttachment,
  type ContributionAttachmentDraft,
  type UserContribution,
  type UserContributionDraft,
} from "../data/userContributions.ts";
import { getR2Config, putR2Object, type R2Config } from "./r2ObjectStorage.ts";

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
  const root = getContributionStorageRoot();
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

function createContributionId(createdAt: string): string {
  const date = createdAt.slice(0, 10).replace(/-/g, "");
  return `APORTE-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export function getContributionStorageRoot(): string {
  return process.env.FARO_CONTRIBUTIONS_STORAGE_DIR ??
    join(/*turbopackIgnore: true*/ process.cwd(), ".faro-contributions");
}

function localPath(root: string, ...segments: string[]): string {
  return join(/*turbopackIgnore: true*/ root, ...segments);
}
