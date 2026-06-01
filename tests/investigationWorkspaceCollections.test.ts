import test from "node:test";
import assert from "node:assert/strict";

import {
  emptyInvestigationWorkspaceCollection,
  normalizeInvestigationWorkspaceCollection,
} from "../src/lib/data/investigationWorkspaceCollections.ts";
import { createInvestigationWorkspace } from "../src/lib/data/investigationWorkspaces.ts";

test("normalizeInvestigationWorkspaceCollection dedupes workspaces and selects a valid active id", () => {
  const first = createInvestigationWorkspace(
    { title: "Primera", countryCode: "AR" },
    new Date("2026-05-23T12:00:00.000Z"),
  );
  const second = createInvestigationWorkspace(
    { title: "Segunda", countryCode: "AR" },
    new Date("2026-05-23T12:05:00.000Z"),
  );

  const collection = normalizeInvestigationWorkspaceCollection({
    version: "bad",
    activeWorkspaceId: "missing",
    workspaces: [first, second, { ...first, title: "Duplicada" }],
  });

  assert.equal(collection.version, "faro_investigation_workspace_collection_v1");
  assert.equal(collection.activeWorkspaceId, first.id);
  assert.deepEqual(collection.workspaces.map((workspace) => workspace.id), [first.id, second.id]);
});

test("normalizeInvestigationWorkspaceCollection backfills verification tasks for saved folders", () => {
  const workspace = createInvestigationWorkspace(
    { title: "Legacy", countryCode: "AR" },
    new Date("2026-05-23T12:00:00.000Z"),
  );
  const { verificationTasks: _verificationTasks, ...legacyWorkspace } = workspace;

  const collection = normalizeInvestigationWorkspaceCollection({
    activeWorkspaceId: workspace.id,
    workspaces: [legacyWorkspace],
  });

  assert.deepEqual(collection.workspaces[0]?.verificationTasks, []);
});

test("emptyInvestigationWorkspaceCollection is the stable empty payload", () => {
  assert.deepEqual(emptyInvestigationWorkspaceCollection(), {
    version: "faro_investigation_workspace_collection_v1",
    activeWorkspaceId: null,
    workspaces: [],
  });
});
