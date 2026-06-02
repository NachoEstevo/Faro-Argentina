import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, normalize, sep } from "node:path";

import {
  CONTRIBUTION_REVIEW_STATUSES,
  type CuratedContributionEvidence,
  type CuratedContributionMedia,
  type ContributionInboxState,
  type LegacyContributionReviewStatus,
  type ContributionReviewStatus,
  normalizeContributionInboxState,
  normalizeContributionPublicationStatus,
  normalizeContributionReviewStatus,
  extensionForAttachment,
  type UserContribution,
} from "../data/userContributions.ts";
import { getCaseById } from "../caseRepository.ts";
import type { FaroAuthenticatedUser } from "./faroAuth.ts";
import { appendContributionAuditEvent, type ContributionAuditAction } from "./contributionAuditDb.ts";
import {
  listCuratedEvidenceForSubmissions,
  listPublishedCuratedEvidenceForExpediente,
  resolveContributionPublicationStatus,
  upsertCuratedContributionEvidence,
  withdrawCuratedContributionEvidence,
  type CuratedEvidenceStatus,
} from "./curatedContributionEvidenceDb.ts";
import {
  appendContributionReviewEvent,
  appendContributionReviewLink,
  hydrateContributionsWithReviewState,
  upsertContributionInboxDisposition,
} from "./contributionReviewDb.ts";
import { getContributionStorageRoot } from "./contributionStorage.ts";
import { isProductDatabaseConfigured } from "./productDb.ts";
import {
  getR2Config,
  getR2Object,
  listR2ObjectKeys,
  putR2Object,
  type R2Config,
} from "./r2ObjectStorage.ts";

export type ContributionReviewStorageMode = "local" | "r2" | "neon";
export const CONTRIBUTION_REVIEW_LINK_TARGETS = ["case", "workspace"] as const;
export type ContributionReviewLinkTarget = (typeof CONTRIBUTION_REVIEW_LINK_TARGETS)[number];

export interface ContributionReviewEntry {
  id: string;
  status: ContributionReviewStatus | LegacyContributionReviewStatus;
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

export interface ContributionInboxEntry {
  id: string;
  state: ContributionInboxState;
  note: string;
  reviewerName: string;
  createdAt: string;
}

export type ReviewedUserContribution = UserContribution & {
  reviewTrail?: ContributionReviewEntry[];
  reviewLinks?: ContributionReviewLink[];
  inboxTrail?: ContributionInboxEntry[];
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
  reviewer?: FaroAuthenticatedUser;
  now?: Date;
}

export interface UpdateContributionInboxStateInput {
  submissionId: string;
  inboxState: ContributionInboxState;
  note?: string;
  reviewerName?: string;
  reviewer?: FaroAuthenticatedUser;
  now?: Date;
}

export interface LinkContributionReviewInput {
  submissionId: string;
  targetType: ContributionReviewLinkTarget;
  targetId: string;
  targetLabel?: string;
  note?: string;
  reviewerName?: string;
  reviewer?: FaroAuthenticatedUser;
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

export interface PromoteContributionEvidenceInput {
  submissionId: string;
  expedienteId: string;
  status: Exclude<CuratedEvidenceStatus, "withdrawn">;
  title: string;
  caption: string;
  caveat: string;
  sourceLabel: string;
  permissionNote: string;
  reviewedByName?: string;
  internalNote?: string;
  attachmentId?: string;
  mediaAltText?: string;
  reviewer?: FaroAuthenticatedUser;
  now?: Date;
}

export interface WithdrawContributionEvidenceInput {
  evidenceId: string;
  reviewer?: FaroAuthenticatedUser;
  now?: Date;
}

export interface ReadCuratedContributionMediaInput {
  expedienteId: string;
  evidenceId: string;
}

export class ContributionReviewOperationError extends Error {
  status: 400 | 404 | 409;
  error:
    | "invalid_review_link_target"
    | "missing_review_target"
    | "missing_review_note"
    | "review_target_not_found"
    | "contribution_not_approved"
    | "invalid_curated_evidence"
    | "curated_case_link_required"
    | "curated_evidence_not_found"
    | "invalid_inbox_state"
    | "missing_inbox_note"
    | "invalid_curated_media"
    | "missing_attachment_target"
    | "attachment_not_found";

  constructor(
    status: 400 | 404 | 409,
    error:
      | "invalid_review_link_target"
      | "missing_review_target"
      | "missing_review_note"
      | "review_target_not_found"
      | "contribution_not_approved"
      | "invalid_curated_evidence"
      | "curated_case_link_required"
      | "curated_evidence_not_found"
      | "invalid_inbox_state"
      | "missing_inbox_note"
      | "invalid_curated_media"
      | "missing_attachment_target"
      | "attachment_not_found",
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
  const hydratedWithReview = isProductDatabaseConfigured()
    ? await hydrateContributionsWithReviewState(submissions)
    : submissions;
  const hydrated = isProductDatabaseConfigured()
    ? await hydrateContributionsWithPublicationState(hydratedWithReview)
    : hydratedWithReview.map(normalizeContributionEnvelope);
  const sorted = hydrated.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    storageMode: isProductDatabaseConfigured() ? "neon" : r2Config ? "r2" : "local",
    submissions: sorted,
    stats: buildStats(sorted),
  };
}

export async function promoteContributionEvidence(
  input: PromoteContributionEvidenceInput,
): Promise<{
  storageMode: ContributionReviewStorageMode;
  contribution: ReviewedUserContribution;
  evidence: CuratedContributionEvidence;
}> {
  const status = normalizeCuratedEvidenceStatus(input.status);
  const title = normalizeText(input.title);
  const caption = normalizeText(input.caption);
  const caveat = normalizeText(input.caveat);
  const sourceLabel = normalizeText(input.sourceLabel);
  const permissionNote = normalizeText(input.permissionNote);
  const expedienteId = normalizeText(input.expedienteId);
  if (!title || !caption || !caveat || !sourceLabel || !permissionNote || !expedienteId) {
    throw new ContributionReviewOperationError(
      400,
      "invalid_curated_evidence",
      "Completá título, bajada, caveat, fuente o permiso y expediente antes de publicar material curado.",
    );
  }
  const r2Config = getR2Config();
  const r2Submission = r2Config
    ? await readR2ContributionForUpdate(r2Config, input.submissionId)
    : null;
  const rawContribution = r2Submission?.contribution ?? await readLocalContribution(input.submissionId);
  const [reviewedContribution] = isProductDatabaseConfigured()
    ? await hydrateContributionsWithReviewState([rawContribution])
    : [rawContribution];
  const contribution = normalizeContributionEnvelope(reviewedContribution);
  if (normalizeContributionReviewStatus(contribution.status) !== "approved_for_investigation") {
    throw new ContributionReviewOperationError(
      409,
      "contribution_not_approved",
      "Aprobá el aporte para investigación antes de convertirlo en evidencia curada.",
    );
  }
  const hasCaseLink = (contribution.reviewLinks ?? []).some((link) =>
    link.targetType === "case" && link.targetId === expedienteId
  );
  if (!hasCaseLink) {
    throw new ContributionReviewOperationError(
      409,
      "curated_case_link_required",
      "Vinculá primero el aporte al expediente que querés mostrar públicamente.",
    );
  }
  const evidenceId = curatedEvidenceId(contribution.id, expedienteId);
  const media = input.attachmentId
    ? await createCuratedMediaCopy({
      contribution,
      evidenceId,
      attachmentId: input.attachmentId,
      altText: input.mediaAltText,
    })
    : null;
  const evidenceInput = {
    id: evidenceId,
    submissionId: contribution.id,
    expedienteId,
    status,
    title,
    caption,
    caveat,
    sourceLabel,
    permissionNote,
    reviewedByName: normalizeText(input.reviewedByName) || reviewerDisplayName(input.reviewer, null),
    promotedBy: input.reviewer,
    promotedByName: reviewerDisplayName(input.reviewer, null),
    promotedAt: input.now,
    internalNote: input.internalNote,
    media,
  };
  const evidence = isProductDatabaseConfigured()
    ? await upsertCuratedContributionEvidence(evidenceInput)
    : await upsertLocalCuratedEvidence(evidenceInput);
  await appendCuratedAuditIfConfigured({
    contribution,
    evidence,
    reviewer: input.reviewer,
    action: status === "published_curated" ? "curated_evidence_published" : "curated_candidate_created",
    now: input.now,
  });
  const updatedContribution: ReviewedUserContribution = {
    ...contribution,
    publicationStatus: status,
  };
  if (!isProductDatabaseConfigured()) {
    await writeContributionAfterLocalMutation(updatedContribution, r2Config, r2Submission?.key);
  }
  return {
    storageMode: isProductDatabaseConfigured() ? "neon" : r2Config ? "r2" : "local",
    contribution: updatedContribution,
    evidence,
  };
}

export async function readCuratedContributionMedia(
  input: ReadCuratedContributionMediaInput,
): Promise<{ storageMode: ContributionReviewStorageMode; body: Uint8Array; contentType: string; filename: string }> {
  const expedienteId = normalizeText(input.expedienteId);
  const evidenceId = normalizeText(input.evidenceId);
  const evidence = isProductDatabaseConfigured()
    ? (await listPublishedCuratedEvidenceForExpediente(expedienteId)).find((item) => item.id === evidenceId)
    : (await listLocalCuratedEvidence()).find((item) =>
      item.id === evidenceId && item.expedienteId === expedienteId && item.status === "published_curated"
    );
  if (!evidence?.media) {
    throw new ContributionReviewOperationError(
      404,
      "curated_evidence_not_found",
      "No encontramos esa imagen curada publicada.",
    );
  }
  return readContributionAttachmentObject(evidence.media.objectKey);
}

export async function withdrawContributionEvidence(
  input: WithdrawContributionEvidenceInput,
): Promise<{
  storageMode: ContributionReviewStorageMode;
  evidence: CuratedContributionEvidence;
}> {
  const evidence = isProductDatabaseConfigured()
    ? await withdrawCuratedContributionEvidence({
      id: normalizeText(input.evidenceId),
      withdrawnBy: input.reviewer,
      withdrawnAt: input.now,
    })
    : await withdrawLocalCuratedEvidence({
      id: normalizeText(input.evidenceId),
      withdrawnBy: input.reviewer,
      withdrawnAt: input.now,
    });
  await appendContributionAuditIfConfigured({
    submissionId: evidence.submissionId,
    action: "curated_evidence_withdrawn",
    actor: input.reviewer,
    targetType: "curated_evidence",
    targetId: evidence.id,
    metadata: { expedienteId: evidence.expedienteId, title: evidence.title },
    now: input.now,
  });
  return {
    storageMode: isProductDatabaseConfigured() ? "neon" : getR2Config() ? "r2" : "local",
    evidence,
  };
}

export async function listPublishedCuratedContributionEvidence(
  expedienteId: string,
): Promise<CuratedContributionEvidence[]> {
  if (isProductDatabaseConfigured()) {
    return listPublishedCuratedEvidenceForExpediente(expedienteId);
  }
  return (await listLocalCuratedEvidence())
    .filter((item) => item.expedienteId === expedienteId && item.status === "published_curated")
    .sort((left, right) => right.promotedAt.localeCompare(left.promotedAt));
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
        normalizeContributionReviewStatus(contribution.status) === "approved_for_investigation" &&
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
  const note = normalizeText(input.note);
  if (!targetId) {
    throw new ContributionReviewOperationError(
      400,
      "missing_review_target",
      "Indicá el expediente o carpeta que querés vincular.",
    );
  }
  if (!note) {
    throw new ContributionReviewOperationError(
      400,
      "missing_review_note",
      "Agregá una nota interna que explique por qué este aporte entra en el expediente o carpeta.",
    );
  }
  const targetLabel = resolveTargetLabel(targetType, targetId, input.targetLabel);
  const r2Submission = r2Config
    ? await readR2ContributionForUpdate(r2Config, input.submissionId)
    : null;
  const contribution = r2Submission?.contribution ?? await readLocalContribution(input.submissionId);
  if (isProductDatabaseConfigured()) {
    const [hydrated] = await hydrateContributionsWithReviewState([contribution]);
    if (normalizeContributionReviewStatus(hydrated.status) !== "approved_for_investigation") {
      throw new ContributionReviewOperationError(
        409,
        "contribution_not_approved",
        "Aprobá el aporte antes de vincularlo a un expediente o carpeta.",
      );
    }
    const link = await appendContributionReviewLink({
      submissionId: input.submissionId,
      targetType,
      targetId,
      targetLabel,
      note,
      reviewerName: input.reviewerName,
      reviewer: input.reviewer,
      now: input.now,
    });
    await appendContributionAuditEvent({
      submissionId: input.submissionId,
      action: "review_link_created",
      actor: input.reviewer,
      targetType,
      targetId,
      metadata: { targetLabel, note },
      now: input.now,
    });
    const [updated] = await hydrateContributionsWithReviewState([contribution]);
    return { storageMode: "neon", contribution: updated, link };
  }

  if (normalizeContributionReviewStatus(contribution.status) !== "approved_for_investigation") {
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
    note,
    linkedBy: reviewerDisplayName(input.reviewer, input.reviewerName),
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
): Promise<{ storageMode: ContributionReviewStorageMode; contribution: ReviewedUserContribution; changed: boolean }> {
  const r2Config = getR2Config();
  const status = normalizeReviewStatus(input.status);
  const r2Submission = r2Config
    ? await readR2ContributionForUpdate(r2Config, input.submissionId)
    : null;
  const contribution = r2Submission?.contribution ?? await readLocalContribution(input.submissionId);
  const [currentContribution] = isProductDatabaseConfigured()
    ? await hydrateContributionsWithReviewState([contribution])
    : [normalizeContributionEnvelope(contribution)];
  if (normalizeContributionReviewStatus(currentContribution.status) === status) {
    return {
      storageMode: isProductDatabaseConfigured() ? "neon" : r2Config ? "r2" : "local",
      contribution: currentContribution,
      changed: false,
    };
  }
  if (isProductDatabaseConfigured()) {
    await appendContributionReviewEvent({
      submissionId: input.submissionId,
      status,
      note: input.note,
      reviewerName: input.reviewerName,
      reviewer: input.reviewer,
      now: input.now,
    });
    await appendContributionAuditEvent({
      submissionId: input.submissionId,
      action: "review_status_changed",
      actor: input.reviewer,
      targetType: "review_status",
      targetId: status,
      metadata: { note: normalizeText(input.note) },
      now: input.now,
    });
    const [updated] = await hydrateContributionsWithReviewState([contribution]);
    return { storageMode: "neon", contribution: updated, changed: true };
  }
  const reviewTrail = contribution.reviewTrail ?? [];
  const updated: ReviewedUserContribution = {
    ...normalizeContributionEnvelope(contribution),
    status,
    publicationStatus: normalizeContributionPublicationStatus(contribution.publicationStatus),
    reviewTrail: [
      ...reviewTrail,
      {
        id: `REV-${String(reviewTrail.length + 1).padStart(3, "0")}`,
        status,
        note: normalizeText(input.note),
        reviewerName: reviewerDisplayName(input.reviewer, input.reviewerName),
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
    return { storageMode: "r2", contribution: updated, changed: true };
  }

  await writeLocalContribution(updated);
  return { storageMode: "local", contribution: updated, changed: true };
}

export async function updateContributionInboxState(
  input: UpdateContributionInboxStateInput,
): Promise<{ storageMode: ContributionReviewStorageMode; contribution: ReviewedUserContribution; changed: boolean }> {
  const r2Config = getR2Config();
  const inboxState = normalizeInboxState(input.inboxState);
  const note = normalizeText(input.note);
  if (!note) {
    throw new ContributionReviewOperationError(
      400,
      "missing_inbox_note",
      "Agregá una nota interna para archivar o quitar un aporte de la bandeja.",
    );
  }
  const r2Submission = r2Config
    ? await readR2ContributionForUpdate(r2Config, input.submissionId)
    : null;
  const contribution = r2Submission?.contribution ?? await readLocalContribution(input.submissionId);
  const [currentContribution] = isProductDatabaseConfigured()
    ? await hydrateContributionsWithReviewState([contribution])
    : [normalizeContributionEnvelope(contribution)];
  if (normalizeContributionInboxState(currentContribution.inboxState) === inboxState) {
    return {
      storageMode: isProductDatabaseConfigured() ? "neon" : r2Config ? "r2" : "local",
      contribution: currentContribution,
      changed: false,
    };
  }
  if (isProductDatabaseConfigured()) {
    await upsertContributionInboxDisposition({
      submissionId: input.submissionId,
      state: inboxState,
      note,
      reviewerName: input.reviewerName,
      reviewer: input.reviewer,
      now: input.now,
    });
    await appendContributionAuditEvent({
      submissionId: input.submissionId,
      action: inboxAuditAction(inboxState),
      actor: input.reviewer,
      targetType: "inbox_state",
      targetId: inboxState,
      metadata: { note },
      now: input.now,
    });
    const [updated] = await hydrateContributionsWithReviewState([contribution]);
    return { storageMode: "neon", contribution: updated, changed: true };
  }
  const inboxTrail = currentContribution.inboxTrail ?? [];
  const updated: ReviewedUserContribution = {
    ...currentContribution,
    inboxState,
    inboxTrail: [
      ...inboxTrail,
      {
        id: `INBOX-${String(inboxTrail.length + 1).padStart(3, "0")}`,
        state: inboxState,
        note,
        reviewerName: reviewerDisplayName(input.reviewer, input.reviewerName),
        createdAt: (input.now ?? new Date()).toISOString(),
      },
    ],
  };
  await writeContributionAfterLocalMutation(updated, r2Config, r2Submission?.key);
  return { storageMode: r2Config ? "r2" : "local", contribution: updated, changed: true };
}

export async function readContributionAttachmentForReview(input: {
  submissionId: string;
  attachmentId: string;
  reviewer?: FaroAuthenticatedUser;
  now?: Date;
}): Promise<{ storageMode: ContributionReviewStorageMode; body: Uint8Array; contentType: string; filename: string }> {
  const submissionId = normalizeText(input.submissionId);
  const attachmentId = normalizeText(input.attachmentId);
  if (!submissionId || !attachmentId) {
    throw new ContributionReviewOperationError(
      400,
      "missing_attachment_target",
      "Indicá el aporte y el archivo que querés revisar.",
    );
  }
  const contribution = await readContributionForReview(submissionId);
  const attachment = contribution.attachments.find((item) => item.id === attachmentId);
  if (!attachment || !attachment.objectKey.startsWith(`submissions/${contribution.id}/`)) {
    throw new ContributionReviewOperationError(
      404,
      "attachment_not_found",
      "No encontramos ese archivo dentro del aporte indicado.",
    );
  }
  if (isProductDatabaseConfigured()) {
    await appendContributionAuditEvent({
      submissionId: contribution.id,
      action: "attachment_opened",
      actor: input.reviewer,
      targetType: "attachment",
      targetId: attachment.id,
      metadata: {
        filename: attachment.originalFilename,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
      },
      now: input.now,
    });
  }
  return readContributionAttachmentObject(attachment.objectKey);
}

async function readContributionAttachmentObject(
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

async function readContributionForReview(submissionId: string): Promise<ReviewedUserContribution> {
  const r2Config = getR2Config();
  const contribution = r2Config
    ? (await readR2ContributionForUpdate(r2Config, submissionId)).contribution
    : await readLocalContribution(submissionId);
  return {
    ...contribution,
    status: normalizeContributionReviewStatus(contribution.status),
    publicationStatus: normalizeContributionPublicationStatus(contribution.publicationStatus),
  };
}

export function isContributionReviewStatus(value: string): value is ContributionReviewStatus {
  return value === "approved" || CONTRIBUTION_REVIEW_STATUSES.includes(value as ContributionReviewStatus);
}

export function isContributionReviewLinkTarget(value: string): value is ContributionReviewLinkTarget {
  return CONTRIBUTION_REVIEW_LINK_TARGETS.includes(value as ContributionReviewLinkTarget);
}

function normalizeReviewStatus(value: string): ContributionReviewStatus {
  if (!isContributionReviewStatus(value)) {
    throw new Error(`Invalid contribution review status: ${value}`);
  }
  return normalizeContributionReviewStatus(value);
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

async function writeContributionAfterLocalMutation(
  contribution: ReviewedUserContribution,
  r2Config: R2Config | null,
  r2Key?: string,
): Promise<void> {
  if (r2Config) {
    await putR2Object({
      config: r2Config,
      key: r2Key ?? r2ManifestKey(contribution.id),
      body: new TextEncoder().encode(JSON.stringify(contribution, null, 2)),
      contentType: "application/json; charset=utf-8",
    });
    return;
  }
  await writeLocalContribution(contribution);
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
    const status = normalizeContributionReviewStatus(contribution.status);
    stats[status] = (stats[status] ?? 0) + 1;
  }
  return stats;
}

async function hydrateContributionsWithPublicationState(
  contributions: ReviewedUserContribution[],
): Promise<ReviewedUserContribution[]> {
  const evidence = await listCuratedEvidenceForSubmissions(contributions.map((contribution) => contribution.id));
  return contributions.map((contribution) => {
    const contributionEvidence = evidence.filter((item) => item.submissionId === contribution.id);
    return {
      ...normalizeContributionEnvelope(contribution),
      publicationStatus: resolveContributionPublicationStatus(contributionEvidence),
    };
  });
}

function normalizeContributionEnvelope(contribution: ReviewedUserContribution): ReviewedUserContribution {
  return {
    ...contribution,
    status: normalizeContributionReviewStatus(contribution.status),
    publicationStatus: normalizeContributionPublicationStatus(contribution.publicationStatus),
    inboxState: normalizeContributionInboxState(contribution.inboxState),
  };
}

function normalizeInboxState(value: string): ContributionInboxState {
  const normalized = normalizeContributionInboxState(value);
  if (normalized !== value) {
    throw new ContributionReviewOperationError(
      400,
      "invalid_inbox_state",
      "Elegí una acción de bandeja válida.",
    );
  }
  return normalized;
}

function inboxAuditAction(state: ContributionInboxState): ContributionAuditAction {
  if (state === "removed") return "contribution_removed_from_inbox";
  if (state === "archived") return "contribution_archived";
  return "contribution_restored_to_inbox";
}

function normalizeCuratedEvidenceStatus(status: unknown): Exclude<CuratedEvidenceStatus, "withdrawn"> {
  return status === "published_curated" ? "published_curated" : "candidate";
}

function curatedEvidenceId(submissionId: string, expedienteId: string): string {
  const normalizedSubmission = normalizeText(submissionId).replace(/[^A-Z0-9-]+/gi, "-").toUpperCase();
  const normalizedCase = normalizeText(expedienteId).replace(/[^A-Z0-9-]+/gi, "-").toUpperCase();
  return `CURATED-${normalizedSubmission}-${normalizedCase}`;
}

async function upsertLocalCuratedEvidence(
  input: Parameters<typeof upsertCuratedContributionEvidence>[0],
): Promise<CuratedContributionEvidence> {
  const current = await listLocalCuratedEvidence();
  const now = (input.promotedAt ?? new Date()).toISOString();
  const evidence: CuratedContributionEvidence = {
    id: input.id,
    submissionId: input.submissionId,
    expedienteId: input.expedienteId,
    status: input.status,
    title: input.title,
    caption: input.caption,
    caveat: input.caveat,
    sourceLabel: input.sourceLabel,
    permissionNote: input.permissionNote,
    reviewedByName: input.reviewedByName,
    promotedByName: input.promotedByName ?? reviewerDisplayName(input.promotedBy, null),
    promotedAt: now,
    withdrawnAt: null,
    withdrawnByName: null,
    internalNote: normalizeText(input.internalNote),
    ...(input.media ? { media: input.media } : {}),
  };
  await writeLocalCuratedEvidence([
    ...current.filter((item) => item.id !== evidence.id),
    evidence,
  ]);
  return evidence;
}

async function withdrawLocalCuratedEvidence(input: {
  id: string;
  withdrawnBy?: FaroAuthenticatedUser;
  withdrawnAt?: Date;
}): Promise<CuratedContributionEvidence> {
  const current = await listLocalCuratedEvidence();
  const evidence = current.find((item) => item.id === input.id);
  if (!evidence) {
    throw new ContributionReviewOperationError(
      404,
      "curated_evidence_not_found",
      "No encontramos esa evidencia curada.",
    );
  }
  const withdrawn: CuratedContributionEvidence = {
    ...evidence,
    status: "withdrawn",
    withdrawnAt: (input.withdrawnAt ?? new Date()).toISOString(),
    withdrawnByName: reviewerDisplayName(input.withdrawnBy, null),
  };
  await writeLocalCuratedEvidence([
    ...current.filter((item) => item.id !== input.id),
    withdrawn,
  ]);
  return withdrawn;
}

async function createCuratedMediaCopy({
  contribution,
  evidenceId,
  attachmentId,
  altText,
}: {
  contribution: ReviewedUserContribution;
  evidenceId: string;
  attachmentId: string;
  altText?: string;
}): Promise<CuratedContributionMedia> {
  const normalizedAttachmentId = normalizeText(attachmentId);
  const attachment = contribution.attachments.find((item) => item.id === normalizedAttachmentId);
  const normalizedAltText = normalizeText(altText);
  if (!attachment || !attachment.mimeType.startsWith("image/") || !normalizedAltText) {
    throw new ContributionReviewOperationError(
      400,
      "invalid_curated_media",
      "Elegí una imagen del aporte y escribí un texto alternativo público antes de publicarla.",
    );
  }
  const object = await readContributionAttachmentObject(attachment.objectKey);
  const extension = extensionForAttachment(attachment.originalFilename, attachment.mimeType);
  const publicObjectKey = `curated-evidence/${evidenceId}/media.${extension}`;
  const r2Config = getR2Config();
  if (r2Config) {
    await putR2Object({
      config: r2Config,
      key: publicObjectKey,
      body: object.body,
      contentType: attachment.mimeType,
    });
  } else {
    const path = resolveLocalObjectPath(publicObjectKey);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, object.body);
  }
  return {
    type: "image",
    objectKey: publicObjectKey,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    altText: normalizedAltText,
  };
}

async function listLocalCuratedEvidence(): Promise<CuratedContributionEvidence[]> {
  try {
    const raw = await readFile(localCuratedEvidencePath(), "utf8");
    const parsed = JSON.parse(raw) as { evidence?: CuratedContributionEvidence[] } | CuratedContributionEvidence[];
    return Array.isArray(parsed) ? parsed : parsed.evidence ?? [];
  } catch {
    return [];
  }
}

async function writeLocalCuratedEvidence(evidence: CuratedContributionEvidence[]): Promise<void> {
  const path = localCuratedEvidencePath();
  await mkdir(getContributionStorageRoot(), { recursive: true });
  await writeFile(path, JSON.stringify({ evidence }, null, 2), "utf8");
}

function localCuratedEvidencePath(): string {
  return join(getContributionStorageRoot(), "curated-evidence.json");
}

async function appendCuratedAuditIfConfigured({
  contribution,
  evidence,
  reviewer,
  action,
  now,
}: {
  contribution: ReviewedUserContribution;
  evidence: CuratedContributionEvidence;
  reviewer?: FaroAuthenticatedUser;
  action: "curated_candidate_created" | "curated_evidence_published";
  now?: Date;
}): Promise<void> {
  await appendContributionAuditIfConfigured({
    submissionId: contribution.id,
    action,
    actor: reviewer,
    targetType: "curated_evidence",
    targetId: evidence.id,
    metadata: {
      expedienteId: evidence.expedienteId,
      status: evidence.status,
      title: evidence.title,
    },
    now,
  });
}

async function appendContributionAuditIfConfigured(
  input: Parameters<typeof appendContributionAuditEvent>[0],
): Promise<void> {
  if (!isProductDatabaseConfigured()) return;
  await appendContributionAuditEvent(input);
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

function reviewerDisplayName(user: FaroAuthenticatedUser | undefined, override: unknown): string {
  return normalizeText(user?.displayName) || normalizeText(user?.email) || normalizeText(override) || "Equipo Faro";
}
