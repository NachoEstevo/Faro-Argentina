import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, normalize, sep } from "node:path";

import {
  CONTRIBUTION_REVIEW_STATUSES,
  type ContributionReviewStatus,
  type UserContribution,
} from "../data/userContributions.ts";
import { getCaseById } from "../caseRepository.ts";
import { getContributionStorageRoot } from "./contributionStorage.ts";
import {
  getR2Config,
  getR2Object,
  listR2ObjectKeys,
  putR2Object,
  type R2Config,
} from "./r2ObjectStorage.ts";

export type ContributionReviewStorageMode = "local" | "r2";
export const CONTRIBUTION_REVIEW_LINK_TARGETS = ["case", "workspace"] as const;
export type ContributionReviewLinkTarget = (typeof CONTRIBUTION_REVIEW_LINK_TARGETS)[number];

export interface ContributionReviewEntry {
  id: string;
  status: ContributionReviewStatus;
  note: string;
  reviewerName: string;
  createdAt: string;
}

export interface ContributionReviewLink {
  id: string;
  targetType: ContributionReviewLinkTarget;
  targetId: string;
  targetLabel: string;
  note: string;
  linkedBy: string;
  createdAt: string;
}

export type ReviewedUserContribution = UserContribution & {
  reviewTrail?: ContributionReviewEntry[];
  reviewLinks?: ContributionReviewLink[];
};

export interface ContributionReviewInbox {
  storageMode: ContributionReviewStorageMode;
  submissions: ReviewedUserContribution[];
  stats: Record<ContributionReviewStatus | "total", number>;
}

export interface UpdateContributionReviewInput {
  submissionId: string;
  status: ContributionReviewStatus;
  note?: string;
  reviewerName?: string;
  now?: Date;
}

export interface LinkContributionReviewInput {
  submissionId: string;
  targetType: ContributionReviewLinkTarget;
  targetId: string;
  targetLabel?: string;
  note?: string;
  reviewerName?: string;
  now?: Date;
}

export interface ListLinkedContributionReviewsInput {
  targetType: ContributionReviewLinkTarget;
  targetId: string;
  targetLabel?: string;
}

export interface LinkedContributionReview {
  contribution: ReviewedUserContribution;
  link: ContributionReviewLink;
}

export interface LinkedContributionReviewInbox {
  storageMode: ContributionReviewStorageMode;
  target: {
    type: ContributionReviewLinkTarget;
    id: string;
    label: string;
  };
  contributions: LinkedContributionReview[];
}

export class ContributionReviewOperationError extends Error {
  status: 400 | 404 | 409;
  error: "invalid_review_link_target" | "missing_review_target" | "review_target_not_found" | "contribution_not_approved";

  constructor(
    status: 400 | 404 | 409,
    error: "invalid_review_link_target" | "missing_review_target" | "review_target_not_found" | "contribution_not_approved",
    message: string,
  ) {
    super(message);
    this.status = status;
    this.error = error;
  }
}

export async function listContributionReviews(): Promise<ContributionReviewInbox> {
  const r2Config = getR2Config();
  const submissions = r2Config
    ? await listR2Contributions(r2Config)
    : await listLocalContributions();
  const sorted = submissions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    storageMode: r2Config ? "r2" : "local",
    submissions: sorted,
    stats: buildStats(sorted),
  };
}

export async function listLinkedContributionReviews(
  input: ListLinkedContributionReviewsInput,
): Promise<LinkedContributionReviewInbox> {
  const targetType = normalizeReviewLinkTarget(input.targetType);
  const targetId = normalizeText(input.targetId);
  if (!targetId) {
    throw new ContributionReviewOperationError(
      400,
      "missing_review_target",
      "Indicá el expediente o carpeta que querés revisar.",
    );
  }
  const targetLabel = resolveTargetLabel(targetType, targetId, input.targetLabel);
  const inbox = await listContributionReviews();
  const contributions = inbox.submissions.flatMap((contribution) =>
    (contribution.reviewLinks ?? [])
      .filter((link) =>
        contribution.status === "approved" &&
        link.targetType === targetType &&
        link.targetId === targetId
      )
      .map((link) => ({ contribution, link }))
  );

  return {
    storageMode: inbox.storageMode,
    target: { type: targetType, id: targetId, label: targetLabel },
    contributions: contributions.sort((left, right) => right.link.createdAt.localeCompare(left.link.createdAt)),
  };
}

export async function linkContributionToReviewTarget(
  input: LinkContributionReviewInput,
): Promise<{
  storageMode: ContributionReviewStorageMode;
  contribution: ReviewedUserContribution;
  link: ContributionReviewLink;
}> {
  const r2Config = getR2Config();
  const targetType = normalizeReviewLinkTarget(input.targetType);
  const targetId = normalizeText(input.targetId);
  if (!targetId) {
    throw new ContributionReviewOperationError(
      400,
      "missing_review_target",
      "Indicá el expediente o carpeta que querés vincular.",
    );
  }
  const targetLabel = resolveTargetLabel(targetType, targetId, input.targetLabel);
  const r2Submission = r2Config
    ? await readR2ContributionForUpdate(r2Config, input.submissionId)
    : null;
  const contribution = r2Submission?.contribution ?? await readLocalContribution(input.submissionId);

  if (contribution.status !== "approved") {
    throw new ContributionReviewOperationError(
      409,
      "contribution_not_approved",
      "Aprobá el aporte antes de vincularlo a un expediente o carpeta.",
    );
  }

  const reviewLinks = contribution.reviewLinks ?? [];
  const link: ContributionReviewLink = {
    id: `LINK-${String(reviewLinks.length + 1).padStart(3, "0")}`,
    targetType,
    targetId,
    targetLabel,
    note: normalizeText(input.note),
    linkedBy: normalizeText(input.reviewerName) || "Equipo Faro",
    createdAt: (input.now ?? new Date()).toISOString(),
  };
  const updated: ReviewedUserContribution = {
    ...contribution,
    reviewLinks: [...reviewLinks, link],
  };

  if (r2Config) {
    await putR2Object({
      config: r2Config,
      key: r2Submission?.key ?? r2ManifestKey(input.submissionId),
      body: new TextEncoder().encode(JSON.stringify(updated, null, 2)),
      contentType: "application/json; charset=utf-8",
    });
    return { storageMode: "r2", contribution: updated, link };
  }

  await writeLocalContribution(updated);
  return { storageMode: "local", contribution: updated, link };
}

export async function updateContributionReview(
  input: UpdateContributionReviewInput,
): Promise<{ storageMode: ContributionReviewStorageMode; contribution: ReviewedUserContribution }> {
  const r2Config = getR2Config();
  const status = normalizeReviewStatus(input.status);
  const r2Submission = r2Config
    ? await readR2ContributionForUpdate(r2Config, input.submissionId)
    : null;
  const contribution = r2Submission?.contribution ?? await readLocalContribution(input.submissionId);
  const reviewTrail = contribution.reviewTrail ?? [];
  const updated: ReviewedUserContribution = {
    ...contribution,
    status,
    reviewTrail: [
      ...reviewTrail,
      {
        id: `REV-${String(reviewTrail.length + 1).padStart(3, "0")}`,
        status,
        note: normalizeText(input.note),
        reviewerName: normalizeText(input.reviewerName) || "Equipo Faro",
        createdAt: (input.now ?? new Date()).toISOString(),
      },
    ],
  };

  if (r2Config) {
    await putR2Object({
      config: r2Config,
      key: r2Submission?.key ?? r2ManifestKey(input.submissionId),
      body: new TextEncoder().encode(JSON.stringify(updated, null, 2)),
      contentType: "application/json; charset=utf-8",
    });
    return { storageMode: "r2", contribution: updated };
  }

  await writeLocalContribution(updated);
  return { storageMode: "local", contribution: updated };
}

export async function readContributionAttachment(
  objectKey: string,
): Promise<{ storageMode: ContributionReviewStorageMode; body: Uint8Array; contentType: string; filename: string }> {
  const r2Config = getR2Config();
  if (r2Config) {
    const object = await getR2Object(r2Config, objectKey);
    return {
      storageMode: "r2",
      body: object.body,
      contentType: object.contentType,
      filename: basename(objectKey),
    };
  }
  const safePath = resolveLocalObjectPath(objectKey);
  return {
    storageMode: "local",
    body: new Uint8Array(await readFile(safePath)),
    contentType: inferContentType(objectKey),
    filename: basename(objectKey),
  };
}

export function isContributionReviewStatus(value: string): value is ContributionReviewStatus {
  return CONTRIBUTION_REVIEW_STATUSES.includes(value as ContributionReviewStatus);
}

export function isContributionReviewLinkTarget(value: string): value is ContributionReviewLinkTarget {
  return CONTRIBUTION_REVIEW_LINK_TARGETS.includes(value as ContributionReviewLinkTarget);
}

function normalizeReviewStatus(value: string): ContributionReviewStatus {
  if (!isContributionReviewStatus(value)) {
    throw new Error(`Invalid contribution review status: ${value}`);
  }
  return value;
}

function normalizeReviewLinkTarget(value: string): ContributionReviewLinkTarget {
  if (!isContributionReviewLinkTarget(value)) {
    throw new ContributionReviewOperationError(
      400,
      "invalid_review_link_target",
      "Elegí si el aporte se vincula a un expediente o a una carpeta.",
    );
  }
  return value;
}

function resolveTargetLabel(
  targetType: ContributionReviewLinkTarget,
  targetId: string,
  fallbackLabel: unknown,
): string {
  if (targetType === "workspace") return normalizeText(fallbackLabel) || targetId;
  const caseFile = getCaseById(targetId);
  if (!caseFile) {
    throw new ContributionReviewOperationError(
      404,
      "review_target_not_found",
      "No encontramos ese expediente en Faro.",
    );
  }
  return normalizeText("title" in caseFile ? caseFile.title : "") || targetId;
}

async function listLocalContributions(): Promise<ReviewedUserContribution[]> {
  const root = getContributionStorageRoot();
  const submissionsDir = join(root, "submissions");
  let entries: string[] = [];
  try {
    entries = await readdir(submissionsDir);
  } catch {
    return [];
  }
  const files = entries.filter((entry) => entry.endsWith(".json"));
  return Promise.all(files.map((file) => readLocalContribution(file.replace(/\.json$/, ""))));
}

async function readLocalContribution(submissionId: string): Promise<ReviewedUserContribution> {
  const path = join(getContributionStorageRoot(), "submissions", `${safeSubmissionId(submissionId)}.json`);
  return JSON.parse(await readFile(path, "utf8")) as ReviewedUserContribution;
}

async function writeLocalContribution(contribution: ReviewedUserContribution): Promise<void> {
  const path = join(getContributionStorageRoot(), "submissions", `${safeSubmissionId(contribution.id)}.json`);
  await writeFile(path, JSON.stringify(contribution, null, 2), "utf8");
}

async function listR2Contributions(config: R2Config): Promise<ReviewedUserContribution[]> {
  const keys = (await listR2ObjectKeys(config, "submissions/"))
    .filter((key) => key.endsWith("/submission.json") || /^submissions\/APORTE-[^/]+\.json$/.test(key));
  const contributions = await Promise.all(keys.map((key) => readR2Contribution(config, key)));
  return [...new Map(contributions.map((contribution) => [contribution.id, contribution])).values()];
}

async function readR2Contribution(config: R2Config, key: string): Promise<ReviewedUserContribution> {
  const object = await getR2Object(config, key);
  return JSON.parse(new TextDecoder().decode(object.body)) as ReviewedUserContribution;
}

async function readR2ContributionForUpdate(
  config: R2Config,
  submissionId: string,
): Promise<{ key: string; contribution: ReviewedUserContribution }> {
  const nestedKey = r2ManifestKey(submissionId);
  try {
    return { key: nestedKey, contribution: await readR2Contribution(config, nestedKey) };
  } catch {
    const flatKey = r2FlatManifestKey(submissionId);
    return { key: flatKey, contribution: await readR2Contribution(config, flatKey) };
  }
}

function r2ManifestKey(submissionId: string): string {
  return `submissions/${safeSubmissionId(submissionId)}/submission.json`;
}

function r2FlatManifestKey(submissionId: string): string {
  return `submissions/${safeSubmissionId(submissionId)}.json`;
}

function buildStats(submissions: ReviewedUserContribution[]): Record<ContributionReviewStatus | "total", number> {
  const stats = Object.fromEntries(CONTRIBUTION_REVIEW_STATUSES.map((status) => [status, 0])) as
    Record<ContributionReviewStatus | "total", number>;
  stats.total = submissions.length;
  for (const contribution of submissions) {
    stats[contribution.status] = (stats[contribution.status] ?? 0) + 1;
  }
  return stats;
}

function safeSubmissionId(value: string): string {
  const normalized = normalizeText(value);
  if (!/^APORTE-[0-9]{8}-[A-Z0-9-]+$/.test(normalized)) {
    throw new Error("Invalid contribution id");
  }
  return normalized;
}

function resolveLocalObjectPath(objectKey: string): string {
  const root = getContributionStorageRoot();
  const normalizedKey = normalize(objectKey).replace(/^(\.\.(\/|\\|$))+/, "");
  const target = join(root, normalizedKey);
  if (!target.startsWith(`${root}${sep}`)) {
    throw new Error("Invalid contribution attachment key");
  }
  return target;
}

function inferContentType(objectKey: string): string {
  const lower = objectKey.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}
