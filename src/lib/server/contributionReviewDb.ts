import {
  normalizeContributionInboxState,
  normalizeContributionPublicationStatus,
  normalizeContributionReviewStatus,
  type ContributionInboxState,
  type LegacyContributionReviewStatus,
  type ContributionReviewStatus,
} from "../data/userContributions.ts";
import type { FaroAuthenticatedUser } from "./faroAuth.ts";
import { upsertFaroUser } from "./faroUserDb.ts";
import { getProductSql, type ProductSql } from "./productDb.ts";
import type {
  ContributionReviewEntry,
  ContributionInboxEntry,
  ContributionReviewLink,
  ContributionReviewLinkTarget,
  ReviewedUserContribution,
} from "./contributionReviewStorage.ts";

interface ContributionReviewEventRow {
  id: number | string;
  submission_id: string;
  status: ContributionReviewStatus | LegacyContributionReviewStatus;
  note: string | null;
  reviewer_name: string | null;
  created_at: string | Date;
}

interface ContributionReviewLinkRow {
  id: string;
  submission_id: string;
  target_type: ContributionReviewLinkTarget;
  target_id: string;
  target_label: string | null;
  note: string | null;
  linked_by_name: string | null;
  created_at: string | Date;
}

interface ContributionInboxDispositionRow {
  submission_id: string;
  state: ContributionInboxState;
  note: string | null;
  reviewer_name: string | null;
  updated_at: string | Date;
}

export interface AppendContributionReviewEventInput {
  submissionId: string;
  status: ContributionReviewStatus;
  note?: string;
  reviewerName?: string;
  reviewer?: FaroAuthenticatedUser;
  now?: Date;
}

export interface UpsertContributionInboxDispositionInput {
  submissionId: string;
  state: ContributionInboxState;
  note?: string;
  reviewerName?: string;
  reviewer?: FaroAuthenticatedUser;
  now?: Date;
}

export interface AppendContributionReviewLinkInput {
  submissionId: string;
  targetType: ContributionReviewLinkTarget;
  targetId: string;
  targetLabel: string;
  note?: string;
  reviewerName?: string;
  reviewer?: FaroAuthenticatedUser;
  now?: Date;
}

export async function hydrateContributionsWithReviewState(
  contributions: ReviewedUserContribution[],
  sql: ProductSql = getProductSql(),
): Promise<ReviewedUserContribution[]> {
  if (contributions.length === 0) return [];
  const submissionIds = contributions.map((contribution) => contribution.id);
  const [eventRows, linkRows, dispositionRows] = await Promise.all([
    sql.query(
      `select id, submission_id, status, note, reviewer_name, created_at
       from contribution_review_events
       where submission_id = any($1::text[])
       order by submission_id asc, created_at asc, id asc`,
      [submissionIds],
    ),
    sql.query(
      `select id, submission_id, target_type, target_id, target_label, note, linked_by_name, created_at
       from contribution_review_links
       where submission_id = any($1::text[])
       order by submission_id asc, created_at asc, id asc`,
      [submissionIds],
    ),
    sql.query(
      `select submission_id, state, note, reviewer_name, updated_at
       from contribution_inbox_dispositions
       where submission_id = any($1::text[])`,
      [submissionIds],
    ).catch(() => []),
  ]);
  const eventsBySubmission = groupRows(eventRows as ContributionReviewEventRow[]);
  const linksBySubmission = groupRows(linkRows as ContributionReviewLinkRow[]);
  const dispositionsBySubmission = new Map(
    (dispositionRows as ContributionInboxDispositionRow[]).map((row) => [row.submission_id, row]),
  );

  return contributions.map((contribution) => {
    const dbReviewTrail = (eventsBySubmission.get(contribution.id) ?? [])
      .map((row, index) => rowToReviewEntry(row, index));
    const dbReviewLinks = (linksBySubmission.get(contribution.id) ?? [])
      .map(rowToReviewLink);
    const disposition = dispositionsBySubmission.get(contribution.id);
    const inboxTrail = disposition ? [rowToInboxEntry(disposition)] : contribution.inboxTrail;
    return {
      ...contribution,
      status: normalizeContributionReviewStatus(dbReviewTrail.at(-1)?.status ?? contribution.status),
      publicationStatus: normalizeContributionPublicationStatus(contribution.publicationStatus),
      inboxState: normalizeContributionInboxState(disposition?.state ?? contribution.inboxState),
      reviewTrail: dbReviewTrail.length > 0 ? dbReviewTrail : contribution.reviewTrail,
      reviewLinks: dbReviewLinks.length > 0 ? dbReviewLinks : contribution.reviewLinks,
      inboxTrail,
    };
  });
}

export async function appendContributionReviewEvent(
  input: AppendContributionReviewEventInput,
  sql: ProductSql = getProductSql(),
): Promise<ContributionReviewEntry> {
  if (input.reviewer) await upsertFaroUser(input.reviewer, undefined, sql);
  const rows = await sql.query(
    `insert into contribution_review_events (
       submission_id, status, note, reviewer_clerk_user_id, reviewer_name, created_at
     ) values ($1, $2, $3, $4, $5, $6::timestamptz)
     returning id, submission_id, status, note, reviewer_name, created_at`,
    [
      input.submissionId,
      input.status,
      normalizeText(input.note),
      input.reviewer?.clerkUserId ?? null,
      reviewerDisplayName(input.reviewer, input.reviewerName),
      (input.now ?? new Date()).toISOString(),
    ],
  );
  return rowToReviewEntry((rows as ContributionReviewEventRow[])[0], 0);
}

export async function appendContributionReviewLink(
  input: AppendContributionReviewLinkInput,
  sql: ProductSql = getProductSql(),
): Promise<ContributionReviewLink> {
  if (input.reviewer) await upsertFaroUser(input.reviewer, undefined, sql);
  const countRows = await sql.query(
    "select count(*)::int as link_count from contribution_review_links where submission_id = $1",
    [input.submissionId],
  );
  const linkCount = readLinkCount(countRows);
  const linkId = `LINK-${String(linkCount + 1).padStart(3, "0")}`;
  const rows = await sql.query(
    `insert into contribution_review_links (
       id, submission_id, target_type, target_id, target_label, note,
       linked_by_clerk_user_id, linked_by_name, created_at
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz)
     returning id, submission_id, target_type, target_id, target_label, note, linked_by_name, created_at`,
    [
      linkId,
      input.submissionId,
      input.targetType,
      input.targetId,
      input.targetLabel,
      normalizeText(input.note),
      input.reviewer?.clerkUserId ?? null,
      reviewerDisplayName(input.reviewer, input.reviewerName),
      (input.now ?? new Date()).toISOString(),
    ],
  );
  return rowToReviewLink((rows as ContributionReviewLinkRow[])[0]);
}

export async function upsertContributionInboxDisposition(
  input: UpsertContributionInboxDispositionInput,
  sql: ProductSql = getProductSql(),
): Promise<ContributionInboxEntry> {
  if (input.reviewer) await upsertFaroUser(input.reviewer, undefined, sql);
  const rows = await sql.query(
    `insert into contribution_inbox_dispositions (
       submission_id, state, note, reviewer_clerk_user_id, reviewer_name, updated_at
     ) values ($1, $2, $3, $4, $5, $6::timestamptz)
     on conflict (submission_id) do update set
       state = excluded.state,
       note = excluded.note,
       reviewer_clerk_user_id = excluded.reviewer_clerk_user_id,
       reviewer_name = excluded.reviewer_name,
       updated_at = excluded.updated_at
     returning submission_id, state, note, reviewer_name, updated_at`,
    [
      input.submissionId,
      input.state,
      normalizeText(input.note),
      input.reviewer?.clerkUserId ?? null,
      reviewerDisplayName(input.reviewer, input.reviewerName),
      (input.now ?? new Date()).toISOString(),
    ],
  );
  return rowToInboxEntry((rows as ContributionInboxDispositionRow[])[0]);
}

function rowToReviewEntry(row: ContributionReviewEventRow, index: number): ContributionReviewEntry {
  return {
    id: `REV-${String(index + 1).padStart(3, "0")}`,
    status: normalizeContributionReviewStatus(row.status),
    note: row.note ?? "",
    reviewerName: row.reviewer_name ?? "Equipo Faro",
    createdAt: toIsoString(row.created_at),
  };
}

function rowToReviewLink(row: ContributionReviewLinkRow): ContributionReviewLink {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    targetLabel: row.target_label ?? "",
    note: row.note ?? "",
    linkedBy: row.linked_by_name ?? "Equipo Faro",
    createdAt: toIsoString(row.created_at),
  };
}

function rowToInboxEntry(row: ContributionInboxDispositionRow): ContributionInboxEntry {
  return {
    id: "INBOX-001",
    state: normalizeContributionInboxState(row.state),
    note: row.note ?? "",
    reviewerName: row.reviewer_name ?? "Equipo Faro",
    createdAt: toIsoString(row.updated_at),
  };
}

function groupRows<Row extends { submission_id: string }>(rows: Row[]): Map<string, Row[]> {
  const grouped = new Map<string, Row[]>();
  for (const row of rows) {
    grouped.set(row.submission_id, [...(grouped.get(row.submission_id) ?? []), row]);
  }
  return grouped;
}

function reviewerDisplayName(user: FaroAuthenticatedUser | undefined, override: unknown): string {
  return normalizeText(user?.displayName) || normalizeText(user?.email) || normalizeText(override) || "Equipo Faro";
}

function readLinkCount(rows: unknown): number {
  const [row] = Array.isArray(rows) ? rows as Array<{ link_count?: unknown; count?: unknown }> : [];
  const value = row?.link_count ?? row?.count ?? 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIsoString(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}
