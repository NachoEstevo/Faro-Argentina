import test from "node:test";
import assert from "node:assert/strict";

import {
  addCaseToStoredInvestigationWorkspace,
  INVESTIGATION_WORKSPACE_COLLECTION_STORAGE_KEY,
  INVESTIGATION_WORKSPACE_STORAGE_KEY,
  readStoredInvestigationWorkspaceCollection,
  readStoredInvestigationWorkspace,
  writeStoredInvestigationWorkspace,
  writeStoredInvestigationWorkspaceCollection,
} from "../src/lib/client/investigationWorkspaceStorage.ts";
import { createInvestigationWorkspace } from "../src/lib/data/investigationWorkspaces.ts";

test("addCaseToStoredInvestigationWorkspace creates and persists a workspace", () => {
  const storage = new MemoryStorage();

  const result = addCaseToStoredInvestigationWorkspace({
    storage,
    caseId: "AR-CASE-1",
    countryCode: "AR",
    reason: "same_procedure",
    note: "Procedimiento compartido.",
    now: new Date("2026-05-17T12:05:00.000Z"),
  });
  const stored = readStoredInvestigationWorkspace(storage);

  assert.equal(result.status, "created");
  assert.equal(result.workspace.id, stored?.id);
  assert.equal(storage.getItem(INVESTIGATION_WORKSPACE_STORAGE_KEY), JSON.stringify(result.workspace));
  assert.deepEqual(stored?.caseIds, ["AR-CASE-1"]);
  assert.equal(stored?.caseRelations[0]?.note, "Procedimiento compartido.");
});

test("addCaseToStoredInvestigationWorkspace keeps existing notes on quick duplicate saves", () => {
  const storage = new MemoryStorage();
  const workspace = createInvestigationWorkspace(
    { title: "Carpeta existente", countryCode: "AR" },
    new Date("2026-05-17T12:00:00.000Z"),
  );
  storage.setItem(INVESTIGATION_WORKSPACE_STORAGE_KEY, JSON.stringify({
    ...workspace,
    caseIds: ["AR-CASE-1"],
    caseRelations: [{
      caseId: "AR-CASE-1",
      reason: "same_supplier",
      note: "Hipótesis ya escrita.",
      addedAt: "2026-05-17T12:01:00.000Z",
    }],
  }));

  const result = addCaseToStoredInvestigationWorkspace({
    storage,
    caseId: "AR-CASE-1",
    countryCode: "AR",
    now: new Date("2026-05-17T12:05:00.000Z"),
  });

  assert.equal(result.status, "already_present");
  assert.equal(result.workspace.caseRelations[0]?.reason, "same_supplier");
  assert.equal(result.workspace.caseRelations[0]?.note, "Hipótesis ya escrita.");
});

test("readStoredInvestigationWorkspaceCollection migrates the legacy single workspace", () => {
  const storage = new MemoryStorage();
  const workspace = createInvestigationWorkspace(
    { title: "Carpeta legacy", countryCode: "AR" },
    new Date("2026-05-22T12:00:00.000Z"),
  );
  storage.setItem(INVESTIGATION_WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));

  const collection = readStoredInvestigationWorkspaceCollection(storage);

  assert.equal(collection.version, "faro_investigation_workspace_collection_v1");
  assert.equal(collection.activeWorkspaceId, workspace.id);
  assert.deepEqual(collection.workspaces.map((item) => item.id), [workspace.id]);
  assert.equal(readStoredInvestigationWorkspace(storage)?.id, workspace.id);
});

test("writeStoredInvestigationWorkspace upserts the active workspace without deleting other folders", () => {
  const storage = new MemoryStorage();
  const first = createInvestigationWorkspace(
    { title: "Causa Vialidad", countryCode: "AR" },
    new Date("2026-05-22T12:00:00.000Z"),
  );
  const second = createInvestigationWorkspace(
    { title: "Contratos Santa Cruz", countryCode: "AR" },
    new Date("2026-05-22T12:05:00.000Z"),
  );
  writeStoredInvestigationWorkspaceCollection({
    version: "faro_investigation_workspace_collection_v1",
    activeWorkspaceId: first.id,
    workspaces: [first, second],
  }, storage);

  writeStoredInvestigationWorkspace({ ...first, title: "Vialidad revisada" }, storage);
  const collection = readStoredInvestigationWorkspaceCollection(storage);

  assert.equal(collection.activeWorkspaceId, first.id);
  assert.deepEqual(collection.workspaces.map((workspace) => workspace.title), [
    "Vialidad revisada",
    "Contratos Santa Cruz",
  ]);
  assert.equal(storage.getItem(INVESTIGATION_WORKSPACE_COLLECTION_STORAGE_KEY), JSON.stringify(collection));
});

test("addCaseToStoredInvestigationWorkspace adds cases to the active folder", () => {
  const storage = new MemoryStorage();
  const first = createInvestigationWorkspace(
    { title: "Causa Vialidad", countryCode: "AR" },
    new Date("2026-05-22T12:00:00.000Z"),
  );
  const second = createInvestigationWorkspace(
    { title: "Contratos Santa Cruz", countryCode: "AR" },
    new Date("2026-05-22T12:05:00.000Z"),
  );
  writeStoredInvestigationWorkspaceCollection({
    version: "faro_investigation_workspace_collection_v1",
    activeWorkspaceId: second.id,
    workspaces: [first, second],
  }, storage);

  const result = addCaseToStoredInvestigationWorkspace({
    storage,
    caseId: "AR-CASE-2",
    countryCode: "AR",
    reason: "same_source",
    note: "Misma fuente oficial.",
    now: new Date("2026-05-22T12:10:00.000Z"),
  });
  const collection = readStoredInvestigationWorkspaceCollection(storage);

  assert.equal(result.workspace.id, second.id);
  assert.deepEqual(collection.workspaces.find((workspace) => workspace.id === first.id)?.caseIds, []);
  assert.deepEqual(collection.workspaces.find((workspace) => workspace.id === second.id)?.caseIds, ["AR-CASE-2"]);
  assert.equal(collection.activeWorkspaceId, second.id);
});

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
