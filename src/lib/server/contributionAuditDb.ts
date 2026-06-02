import type { FaroAuthenticatedUser } from "./faroAuth.ts";
import { upsertFaroUser } from "./faroUserDb.ts";
import { getProductSql, type ProductSql } from "./productDb.ts";

export type ContributionAuditAction =
  | "review_status_changed"
  | "review_link_created"
  | "attachment_opened"
  | "contribution_archived"
  | "contribution_removed_from_inbox"
  | "contribution_restored_to_inbox"
  | "curated_candidate_created"
  | "curated_evidence_published"
  | "curated_evidence_withdrawn";

export interface ContributionAuditEvent {
  id: string;
  submissionId: string | null;
  action: ContributionAuditAction;
  actorName: string;
  actorRole: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AppendContributionAuditEventInput {
  submissionId?: string | null;
  action: ContributionAuditAction;
  actor?: FaroAuthenticatedUser;
  actorName?: string;
  actorRole?: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  now?: Date;
}

export interface ListContributionAuditEventsInput {
  submissionId?: string;
  targetType?: string;
  targetId?: string;
  limit?: number;
}

interface ContributionAuditEventRow {
  id: number | string;
  submission_id: string | null;
  action: ContributionAuditAction;
  actor_name: string | null;
  actor_role: string | null;
  target_type: string | null;
  target_id: string | null;
  metadata: unknown;
  created_at: string | Date;
}

export async function appendContributionAuditEvent(
  input: AppendContributionAuditEventInput,
  sql: ProductSql = getProductSql(),
): Promise<ContributionAuditEvent> {
  if (input.actor) await upsertFaroUser(input.actor, undefined, sql);
  const rows = await sql.query(
    `insert into contribution_audit_events (
       submission_id, action, actor_clerk_user_id, actor_name, actor_role,
       target_type, target_id, metadata, created_at
     ) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::timestamptz)
     returning id, submission_id, action, actor_name, actor_role, target_type, target_id, metadata, created_at`,
    [
      normalizeNullableText(input.submissionId),
      input.action,
      input.actor?.clerkUserId ?? null,
      reviewerDisplayName(input.actor, input.actorName),
      input.actor?.role ?? (normalizeText(input.actorRole) || "reviewer"),
      normalizeNullableText(input.targetType),
      normalizeNullableText(input.targetId),
      JSON.stringify(input.metadata ?? {}),
      (input.now ?? new Date()).toISOString(),
    ],
  );
  return rowToAuditEvent((rows as ContributionAuditEventRow[])[0]);
}

export async function listContributionAuditEvents(
  input: ListContributionAuditEventsInput = {},
  sql: ProductSql = getProductSql(),
): Promise<ContributionAuditEvent[]> {
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const rows = await sql.query(
    `select id, submission_id, action, actor_name, actor_role, target_type, target_id, metadata, created_at
     from contribution_audit_events
     where ($1::text is null or submission_id = $1)
       and ($2::text is null or target_type = $2)
       and ($3::text is null or target_id = $3)
     order by created_at desc, id desc
     limit $4`,
    [
      normalizeNullableText(input.submissionId),
      normalizeNullableText(input.targetType),
      normalizeNullableText(input.targetId),
      limit,
    ],
  );
  return (rows as ContributionAuditEventRow[]).map(rowToAuditEvent);
}

function rowToAuditEvent(row: ContributionAuditEventRow): ContributionAuditEvent {
  return {
    id: String(row.id),
    submissionId: row.submission_id,
    action: row.action,
    actorName: row.actor_name ?? "Equipo Faro",
    actorRole: row.actor_role ?? "reviewer",
    targetType: row.target_type,
    targetId: row.target_id,
    metadata: normalizeMetadata(row.metadata),
    createdAt: toIsoString(row.created_at),
  };
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return {};
    }
  }
  return typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function reviewerDisplayName(user: FaroAuthenticatedUser | undefined, override: unknown): string {
  return normalizeText(user?.displayName) || normalizeText(user?.email) || normalizeText(override) || "Equipo Faro";
}

function normalizeNullableText(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function toIsoString(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}
