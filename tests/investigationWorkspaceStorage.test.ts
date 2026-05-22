import test from "node:test";
import assert from "node:assert/strict";

import {
  addCaseToStoredInvestigationWorkspace,
  INVESTIGATION_WORKSPACE_STORAGE_KEY,
  readStoredInvestigationWorkspace,
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
