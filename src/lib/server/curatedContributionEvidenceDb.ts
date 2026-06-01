import {
  type CuratedContributionEvidence,
  type ContributionPublicationStatus,
} from "../data/userContributions.ts";
import type { FaroAuthenticatedUser } from "./faroAuth.ts";
import { upsertFaroUser } from "./faroUserDb.ts";
import { getProductSql, type ProductSql } from "./productDb.ts";

export type CuratedEvidenceStatus = Extract<
  ContributionPublicationStatus,
  "candidate" | "published_curated" | "withdrawn"
>;

export interface UpsertCuratedContributionEvidenceInput {
  id: string;
  submissionId: string;
  expedienteId: string;
  status: Exclude<CuratedEvidenceStatus, "withdrawn">;
  title: string;
  caption: string;
  caveat: string;
  sourceLabel: string;
  permissionNote: string;
  reviewedByName: string;
  promotedBy?: FaroAuthenticatedUser;
  promotedByName?: string;
  promotedAt?: Date;
  internalNote?: string;
}

export interface WithdrawCuratedContributionEvidenceInput {
  id: string;
  withdrawnBy?: FaroAuthenticatedUser;
  withdrawnByName?: string;
  withdrawnAt?: Date;
}

interface CuratedContributionEvidenceRow {
  id: string;
  submission_id: string;
  expediente_id: string;
  status: CuratedEvidenceStatus;
  title: string;
  caption: string;
  caveat: string;
  source_label: string;
  permission_note: string;
  reviewed_by_name: string;
  promoted_by_name: string;
  promoted_at: string | Date;
  withdrawn_at: string | Date | null;
  withdrawn_by_name: string | null;
  internal_note: string | null;
}

export async function upsertCuratedContributionEvidence(
  input: UpsertCuratedContributionEvidenceInput,
  sql: ProductSql = getProductSql(),
): Promise<CuratedContributionEvidence> {
  if (input.promotedBy) await upsertFaroUser(input.promotedBy, undefined, sql);
  const rows = await sql.query(
    `insert into curated_contribution_evidence (
       id, submission_id, expediente_id, status, title, caption, caveat,
       source_label, permission_note, reviewed_by_name,
       promoted_by_clerk_user_id, promoted_by_name, promoted_at, internal_note, updated_at
     ) values (
       $1, $2, $3, $4, $5, $6, $7,
       $8, $9, $10,
       $11, $12, $13::timestamptz, $14, now()
     )
     on conflict (id) do update set
       submission_id = excluded.submission_id,
       expediente_id = excluded.expediente_id,
       status = excluded.status,
       title = excluded.title,
       caption = excluded.caption,
       caveat = excluded.caveat,
       source_label = excluded.source_label,
       permission_note = excluded.permission_note,
       reviewed_by_name = excluded.reviewed_by_name,
       promoted_by_clerk_user_id = excluded.promoted_by_clerk_user_id,
       promoted_by_name = excluded.promoted_by_name,
       promoted_at = excluded.promoted_at,
       withdrawn_at = null,
       withdrawn_by_clerk_user_id = null,
       withdrawn_by_name = null,
       internal_note = excluded.internal_note,
       updated_at = now()
     returning id, submission_id, expediente_id, status, title, caption, caveat,
       source_label, permission_note, reviewed_by_name, promoted_by_name,
       promoted_at, withdrawn_at, withdrawn_by_name, internal_note`,
    [
      input.id,
      input.submissionId,
      input.expedienteId,
      input.status,
      normalizeText(input.title),
      normalizeText(input.caption),
      normalizeText(input.caveat),
      normalizeText(input.sourceLabel),
      normalizeText(input.permissionNote),
      normalizeText(input.reviewedByName),
      input.promotedBy?.clerkUserId ?? null,
      reviewerDisplayName(input.promotedBy, input.promotedByName),
      (input.promotedAt ?? new Date()).toISOString(),
      normalizeText(input.internalNote),
    ],
  );
  return rowToCuratedEvidence((rows as CuratedContributionEvidenceRow[])[0]);
}

export async function withdrawCuratedContributionEvidence(
  input: WithdrawCuratedContributionEvidenceInput,
  sql: ProductSql = getProductSql(),
): Promise<CuratedContributionEvidence> {
  if (input.withdrawnBy) await upsertFaroUser(input.withdrawnBy, undefined, sql);
  const rows = await sql.query(
    `update curated_contribution_evidence
     set status = 'withdrawn',
       withdrawn_at = $2::timestamptz,
       withdrawn_by_clerk_user_id = $3,
       withdrawn_by_name = $4,
       updated_at = now()
     where id = $1
     returning id, submission_id, expediente_id, status, title, caption, caveat,
       source_label, permission_note, reviewed_by_name, promoted_by_name,
       promoted_at, withdrawn_at, withdrawn_by_name, internal_note`,
    [
      input.id,
      (input.withdrawnAt ?? new Date()).toISOString(),
      input.withdrawnBy?.clerkUserId ?? null,
      reviewerDisplayName(input.withdrawnBy, input.withdrawnByName),
    ],
  );
  const row = (rows as CuratedContributionEvidenceRow[])[0];
  if (!row) throw new Error("Curated evidence not found");
  return rowToCuratedEvidence(row);
}

export async function listPublishedCuratedEvidenceForExpediente(
  expedienteId: string,
  sql: ProductSql = getProductSql(),
): Promise<CuratedContributionEvidence[]> {
  const rows = await sql.query(
    `select id, submission_id, expediente_id, status, title, caption, caveat,
       source_label, permission_note, reviewed_by_name, promoted_by_name,
       promoted_at, withdrawn_at, withdrawn_by_name, internal_note
     from curated_contribution_evidence
     where expediente_id = $1 and status = 'published_curated'
     order by promoted_at desc, id desc`,
    [expedienteId],
  );
  return (rows as CuratedContributionEvidenceRow[]).map(rowToCuratedEvidence);
}

export async function listCuratedEvidenceForSubmissions(
  submissionIds: string[],
  sql: ProductSql = getProductSql(),
): Promise<CuratedContributionEvidence[]> {
  if (submissionIds.length === 0) return [];
  const rows = await sql.query(
    `select id, submission_id, expediente_id, status, title, caption, caveat,
       source_label, permission_note, reviewed_by_name, promoted_by_name,
       promoted_at, withdrawn_at, withdrawn_by_name, internal_note
     from curated_contribution_evidence
     where submission_id = any($1::text[])
     order by promoted_at desc, id desc`,
    [submissionIds],
  );
  return (rows as CuratedContributionEvidenceRow[]).map(rowToCuratedEvidence);
}

export function resolveContributionPublicationStatus(
  evidence: CuratedContributionEvidence[],
): ContributionPublicationStatus {
  if (evidence.some((item) => item.status === "published_curated")) return "published_curated";
  if (evidence.some((item) => item.status === "candidate")) return "candidate";
  if (evidence.some((item) => item.status === "withdrawn")) return "withdrawn";
  return "private";
}

function rowToCuratedEvidence(row: CuratedContributionEvidenceRow): CuratedContributionEvidence {
  return {
    id: row.id,
    submissionId: row.submission_id,
    expedienteId: row.expediente_id,
    status: row.status,
    title: row.title,
    caption: row.caption,
    caveat: row.caveat,
    sourceLabel: row.source_label,
    permissionNote: row.permission_note,
    reviewedByName: row.reviewed_by_name,
    promotedByName: row.promoted_by_name,
    promotedAt: toIsoString(row.promoted_at),
    withdrawnAt: row.withdrawn_at ? toIsoString(row.withdrawn_at) : null,
    withdrawnByName: row.withdrawn_by_name,
    internalNote: row.internal_note ?? "",
  };
}

function reviewerDisplayName(user: FaroAuthenticatedUser | undefined, override: unknown): string {
  return normalizeText(user?.displayName) || normalizeText(user?.email) || normalizeText(override) || "Equipo Faro";
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function toIsoString(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}
