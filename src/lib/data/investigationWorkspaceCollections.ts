import type { InvestigationWorkspace } from "./investigationWorkspaces.ts";

export interface InvestigationWorkspaceCollection {
  version: "faro_investigation_workspace_collection_v1";
  activeWorkspaceId: string | null;
  workspaces: InvestigationWorkspace[];
}

export function emptyInvestigationWorkspaceCollection(): InvestigationWorkspaceCollection {
  return {
    version: "faro_investigation_workspace_collection_v1",
    activeWorkspaceId: null,
    workspaces: [],
  };
}

export function normalizeInvestigationWorkspaceCollection(value: unknown): InvestigationWorkspaceCollection {
  const input = value as Partial<InvestigationWorkspaceCollection>;
  const workspaces = Array.isArray(input?.workspaces) ? uniqueWorkspaces(input.workspaces) : [];
  const activeWorkspaceId = typeof input?.activeWorkspaceId === "string" &&
      workspaces.some((workspace) => workspace.id === input.activeWorkspaceId)
    ? input.activeWorkspaceId
    : workspaces[0]?.id ?? null;
  return {
    version: "faro_investigation_workspace_collection_v1",
    activeWorkspaceId,
    workspaces,
  };
}

export function upsertInvestigationWorkspaceCollection(
  collection: InvestigationWorkspaceCollection,
  workspace: InvestigationWorkspace,
): InvestigationWorkspaceCollection {
  const workspaces = uniqueWorkspaces([
    workspace,
    ...collection.workspaces.filter((item) => item.id !== workspace.id),
  ]);
  return {
    version: "faro_investigation_workspace_collection_v1",
    activeWorkspaceId: workspace.id,
    workspaces,
  };
}

function uniqueWorkspaces(workspaces: InvestigationWorkspace[]): InvestigationWorkspace[] {
  const seen = new Set<string>();
  const unique: InvestigationWorkspace[] = [];
  for (const workspace of workspaces) {
    if (!workspace?.id || seen.has(workspace.id)) continue;
    seen.add(workspace.id);
    unique.push(normalizeWorkspace(workspace));
  }
  return unique;
}

function normalizeWorkspace(workspace: InvestigationWorkspace): InvestigationWorkspace {
  return {
    ...workspace,
    verificationTasks: Array.isArray(workspace.verificationTasks) ? workspace.verificationTasks : [],
  };
}
