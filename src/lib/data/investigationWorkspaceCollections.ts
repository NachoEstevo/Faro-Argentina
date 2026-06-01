import type { InvestigationWorkspace } from "./investigationWorkspaces.ts";

export interface InvestigationWorkspaceCollection {
  version: "faro_investigation_workspace_collection_v1";
  activeWorkspaceId: string | null;
  workspaces: InvestigationWorkspace[];
}

export class InvalidInvestigationWorkspaceCollectionError extends Error {
  constructor(message = "Invalid investigation workspace collection.") {
    super(message);
    this.name = "InvalidInvestigationWorkspaceCollectionError";
  }
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

export function parsePersistableInvestigationWorkspaceCollection(value: unknown): InvestigationWorkspaceCollection {
  if (!isRecord(value)) {
    throw new InvalidInvestigationWorkspaceCollectionError("Workspace collection must be an object.");
  }
  if (!Array.isArray(value.workspaces)) {
    throw new InvalidInvestigationWorkspaceCollectionError("Workspace collection must include a workspaces array.");
  }
  if (
    value.activeWorkspaceId !== undefined &&
    value.activeWorkspaceId !== null &&
    typeof value.activeWorkspaceId !== "string"
  ) {
    throw new InvalidInvestigationWorkspaceCollectionError("Active workspace id must be a string or null.");
  }
  for (const workspace of value.workspaces) {
    if (!isPersistableWorkspace(workspace)) {
      throw new InvalidInvestigationWorkspaceCollectionError("Workspace payload is incomplete or malformed.");
    }
  }
  return normalizeInvestigationWorkspaceCollection(value);
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

function isPersistableWorkspace(value: unknown): value is InvestigationWorkspace {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" &&
    typeof value.title === "string" &&
    isCountryCodeOrNull(value.countryCode) &&
    typeof value.description === "string" &&
    isStringOrNull(value.investigationQuestion) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    Array.isArray(value.tags) &&
    Array.isArray(value.caseIds) &&
    Array.isArray(value.caseRelations) &&
    Array.isArray(value.sourceLinks) &&
    Array.isArray(value.notes) &&
    Array.isArray(value.entities) &&
    Array.isArray(value.files) &&
    Array.isArray(value.analyses) &&
    (value.verificationTasks === undefined || Array.isArray(value.verificationTasks));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCountryCodeOrNull(value: unknown): value is InvestigationWorkspace["countryCode"] {
  return value === "AR" || value === null;
}

function isStringOrNull(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}
