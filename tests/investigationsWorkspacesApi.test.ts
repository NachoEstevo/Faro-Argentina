import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createInvestigationWorkspace } from "../src/lib/data/investigationWorkspaces.ts";
import {
  readUserInvestigationWorkspaceCollection,
  replaceUserInvestigationWorkspaceCollection,
} from "../src/lib/server/investigationWorkspaceDb.ts";
import type { FaroAuthenticatedUser } from "../src/lib/server/faroAuth.ts";
import type { ProductSql } from "../src/lib/server/productDb.ts";

const workspacesRouteUrl = new URL("../src/app/api/investigations/workspaces/route.ts", import.meta.url);
const workspaceDbUrl = new URL("../src/lib/server/investigationWorkspaceDb.ts", import.meta.url);

test("GET /api/investigations/workspaces is account-backed, not code-backed", async () => {
  const source = [
    await readFile(workspacesRouteUrl, "utf8"),
    await readFile(workspaceDbUrl, "utf8"),
  ].join("\n");

  assert.match(source, /requireFaroUser/);
  assert.match(source, /readUserInvestigationWorkspaceCollection/);
  assert.match(source, /replaceUserInvestigationWorkspaceCollection/);
  assert.match(source, /storageMode:\s*"neon"/);
  assert.match(source, /verification_tasks/);
  assert.doesNotMatch(source, /x-faro-workspace-code/);
  assert.doesNotMatch(source, /verifyInvestigationWorkspaceAccess/);
});

test("Neon workspace repository persists one user's private collection", async () => {
  const sql = createFakeProductSql();
  const user: FaroAuthenticatedUser = {
    clerkUserId: "user_faro_1",
    email: "investigator@example.com",
    displayName: "Investigadora Faro",
    role: "investigator",
  };
  const workspace = createInvestigationWorkspace(
    { title: "Carpeta persistente", countryCode: "AR" },
    new Date("2026-05-23T12:00:00.000Z"),
  );
  const workspaceWithTask = {
    ...workspace,
    verificationTasks: [{
      id: "TASK-1",
      title: "Abrir fuente oficial",
      action: "Confirmar registro en fuente oficial.",
      source: "Dossier de trabajo",
      status: "pending" as const,
      owner: null,
      dueDate: null,
      createdAt: "2026-05-23T12:05:00.000Z",
      updatedAt: "2026-05-23T12:05:00.000Z",
    }],
  };

  const saved = await replaceUserInvestigationWorkspaceCollection(user, {
    version: "faro_investigation_workspace_collection_v1",
    activeWorkspaceId: workspaceWithTask.id,
    workspaces: [workspaceWithTask],
  }, sql);
  const loaded = await readUserInvestigationWorkspaceCollection(user, sql);

  assert.equal(saved.activeWorkspaceId, workspaceWithTask.id);
  assert.equal(loaded.activeWorkspaceId, workspaceWithTask.id);
  assert.equal(loaded.workspaces[0]?.title, "Carpeta persistente");
  assert.equal(loaded.workspaces[0]?.verificationTasks[0]?.title, "Abrir fuente oficial");
});

function createFakeProductSql(): ProductSql {
  const users = new Map<string, { active_workspace_id: string | null }>();
  const workspaces = new Map<string, FakeWorkspaceRow>();
  return {
    query: async (text: string, params: unknown[] = []) => {
      const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
      if (normalized.startsWith("insert into faro_users")) {
        users.set(String(params[0]), { active_workspace_id: params[4] as string | null });
        return [];
      }
      if (normalized.startsWith("select active_workspace_id")) {
        return users.has(String(params[0])) ? [users.get(String(params[0]))] : [];
      }
      if (normalized.startsWith("delete from investigation_workspaces")) {
        const owner = String(params[0]);
        const keepIds = Array.isArray(params[1]) ? new Set(params[1] as string[]) : null;
        for (const [id, row] of workspaces) {
          if (row.owner_clerk_user_id === owner && (!keepIds || !keepIds.has(id))) workspaces.delete(id);
        }
        return [];
      }
      if (normalized.startsWith("insert into investigation_workspaces")) {
        const row: FakeWorkspaceRow = {
          id: String(params[0]),
          owner_clerk_user_id: String(params[1]),
          title: String(params[2]),
          country_code: params[3] as string | null,
          description: String(params[4]),
          investigation_question: params[5] as string | null,
          tags: JSON.parse(String(params[6])),
          case_ids: JSON.parse(String(params[7])),
          case_relations: JSON.parse(String(params[8])),
          source_links: JSON.parse(String(params[9])),
          notes: JSON.parse(String(params[10])),
          entities: JSON.parse(String(params[11])),
          files: JSON.parse(String(params[12])),
          analyses: JSON.parse(String(params[13])),
          verification_tasks: JSON.parse(String(params[14])),
          created_at: String(params[15]),
          updated_at: String(params[16]),
        };
        workspaces.set(row.id, row);
        return [];
      }
      if (normalized.startsWith("select id, title")) {
        return [...workspaces.values()]
          .filter((row) => row.owner_clerk_user_id === params[0])
          .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
      }
      throw new Error(`Unhandled fake SQL: ${text}`);
    },
  } as unknown as ProductSql;
}

interface FakeWorkspaceRow {
  id: string;
  owner_clerk_user_id: string;
  title: string;
  country_code: string | null;
  description: string;
  investigation_question: string | null;
  tags: unknown[];
  case_ids: string[];
  case_relations: unknown[];
  source_links: unknown[];
  notes: unknown[];
  entities: unknown[];
  files: unknown[];
  analyses: unknown[];
  verification_tasks: unknown[];
  created_at: string;
  updated_at: string;
}
