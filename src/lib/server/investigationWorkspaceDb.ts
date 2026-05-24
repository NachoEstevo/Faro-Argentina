import {
  emptyInvestigationWorkspaceCollection,
  normalizeInvestigationWorkspaceCollection,
  type InvestigationWorkspaceCollection,
} from "../data/investigationWorkspaceCollections.ts";
import type {
  InvestigationCountryCode,
  InvestigationWorkspace,
} from "../data/investigationWorkspaces.ts";
import type { FaroAuthenticatedUser } from "./faroAuth.ts";
import { getProductSql, type ProductSql } from "./productDb.ts";
import { upsertFaroUser } from "./faroUserDb.ts";

interface WorkspaceRow {
  id: string;
  title: string;
  country_code: string | null;
  description: string;
  investigation_question: string | null;
  tags: unknown;
  case_ids: unknown;
  case_relations: unknown;
  source_links: unknown;
  notes: unknown;
  entities: unknown;
  files: unknown;
  analyses: unknown;
  created_at: string | Date;
  updated_at: string | Date;
}

interface UserRow {
  active_workspace_id: string | null;
}

export async function readUserInvestigationWorkspaceCollection(
  user: FaroAuthenticatedUser,
  sql: ProductSql = getProductSql(),
): Promise<InvestigationWorkspaceCollection> {
  await upsertFaroUser(user, undefined, sql);
  const userRows = await sql.query(
    "select active_workspace_id from faro_users where clerk_user_id = $1",
    [user.clerkUserId],
  );
  const [userRow] = userRows as UserRow[];
  const rows = await sql.query(
    `select id, title, country_code, description, investigation_question, tags, case_ids,
      case_relations, source_links, notes, entities, files, analyses, created_at, updated_at
     from investigation_workspaces
     where owner_clerk_user_id = $1
     order by updated_at desc`,
    [user.clerkUserId],
  );
  return normalizeInvestigationWorkspaceCollection({
    ...emptyInvestigationWorkspaceCollection(),
    activeWorkspaceId: userRow?.active_workspace_id ?? null,
    workspaces: (rows as WorkspaceRow[]).map(rowToWorkspace),
  });
}

export async function replaceUserInvestigationWorkspaceCollection(
  user: FaroAuthenticatedUser,
  collection: InvestigationWorkspaceCollection,
  sql: ProductSql = getProductSql(),
): Promise<InvestigationWorkspaceCollection> {
  const normalized = normalizeInvestigationWorkspaceCollection(collection);
  await upsertFaroUser(user, normalized.activeWorkspaceId, sql);
  const workspaceIds = normalized.workspaces.map((workspace) => workspace.id);
  if (workspaceIds.length === 0) {
    await sql.query("delete from investigation_workspaces where owner_clerk_user_id = $1", [user.clerkUserId]);
  } else {
    await sql.query(
      `delete from investigation_workspaces
       where owner_clerk_user_id = $1 and not (id = any($2::text[]))`,
      [user.clerkUserId, workspaceIds],
    );
  }

  for (const workspace of normalized.workspaces) {
    await upsertWorkspace(user.clerkUserId, workspace, sql);
  }
  return readUserInvestigationWorkspaceCollection(user, sql);
}

async function upsertWorkspace(ownerClerkUserId: string, workspace: InvestigationWorkspace, sql: ProductSql): Promise<void> {
  await sql.query(
    `insert into investigation_workspaces (
       id, owner_clerk_user_id, title, country_code, description, investigation_question,
       tags, case_ids, case_relations, source_links, notes, entities, files, analyses,
       created_at, updated_at
     ) values (
       $1, $2, $3, $4, $5, $6,
       $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb,
       $15::timestamptz, $16::timestamptz
     )
     on conflict (id) do update set
       title = excluded.title,
       country_code = excluded.country_code,
       description = excluded.description,
       investigation_question = excluded.investigation_question,
       tags = excluded.tags,
       case_ids = excluded.case_ids,
       case_relations = excluded.case_relations,
       source_links = excluded.source_links,
       notes = excluded.notes,
       entities = excluded.entities,
       files = excluded.files,
       analyses = excluded.analyses,
       updated_at = excluded.updated_at
     where investigation_workspaces.owner_clerk_user_id = excluded.owner_clerk_user_id`,
    [
      workspace.id,
      ownerClerkUserId,
      workspace.title,
      workspace.countryCode,
      workspace.description,
      workspace.investigationQuestion,
      JSON.stringify(workspace.tags),
      JSON.stringify(workspace.caseIds),
      JSON.stringify(workspace.caseRelations),
      JSON.stringify(workspace.sourceLinks),
      JSON.stringify(workspace.notes),
      JSON.stringify(workspace.entities),
      JSON.stringify(workspace.files),
      JSON.stringify(workspace.analyses),
      workspace.createdAt,
      workspace.updatedAt,
    ],
  );
}

function rowToWorkspace(row: WorkspaceRow): InvestigationWorkspace {
  return {
    id: row.id,
    version: "faro_investigation_workspace_v1",
    title: row.title,
    countryCode: normalizeCountryCode(row.country_code),
    description: row.description,
    investigationQuestion: row.investigation_question,
    tags: readArray(row.tags),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    caseIds: readArray(row.case_ids),
    caseRelations: readArray(row.case_relations),
    sourceLinks: readArray(row.source_links),
    notes: readArray(row.notes),
    entities: readArray(row.entities),
    files: readArray(row.files),
    analyses: readArray(row.analyses),
  };
}

function readArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed as T[] : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeCountryCode(value: string | null): InvestigationCountryCode | null {
  return value === "AR" ? "AR" : null;
}

function toIsoString(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}
