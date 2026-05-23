import {
  ensureInvestigationWorkspaceWithCase,
  type EnsureInvestigationWorkspaceStatus,
  type InvestigationCaseRelationReason,
  type InvestigationCountryCode,
  type InvestigationWorkspace,
} from "../data/investigationWorkspaces.ts";
import {
  emptyInvestigationWorkspaceCollection,
  normalizeInvestigationWorkspaceCollection,
  upsertInvestigationWorkspaceCollection,
  type InvestigationWorkspaceCollection,
} from "../data/investigationWorkspaceCollections.ts";

export const INVESTIGATION_WORKSPACE_STORAGE_KEY = "faro-investigation-workspace-v1";
export const INVESTIGATION_WORKSPACE_COLLECTION_STORAGE_KEY = "faro-investigation-workspaces-v2";
export const INVESTIGATION_WORKSPACE_UPDATED_EVENT = "faro:investigation-workspace-updated";

export type StoredInvestigationWorkspaceCollection = InvestigationWorkspaceCollection;

export interface StoredInvestigationWorkspaceCaseInput {
  storage?: Storage;
  caseId: string;
  countryCode: InvestigationCountryCode;
  reason?: InvestigationCaseRelationReason;
  note?: string;
  now?: Date;
}

export interface StoredInvestigationWorkspaceCaseResult {
  workspace: InvestigationWorkspace;
  status: EnsureInvestigationWorkspaceStatus;
  collection: StoredInvestigationWorkspaceCollection;
}

export function readStoredInvestigationWorkspace(storage = resolveStorage()): InvestigationWorkspace | null {
  const collection = readStoredInvestigationWorkspaceCollection(storage);
  return collection.workspaces.find((workspace) => workspace.id === collection.activeWorkspaceId) ??
    collection.workspaces[0] ??
    null;
}

export function readStoredInvestigationWorkspaceCollection(
  storage = resolveStorage(),
): StoredInvestigationWorkspaceCollection {
  const empty = emptyInvestigationWorkspaceCollection();
  if (!storage) return empty;
  const storedCollection = storage.getItem(INVESTIGATION_WORKSPACE_COLLECTION_STORAGE_KEY);
  if (storedCollection) {
    try {
      return normalizeInvestigationWorkspaceCollection(JSON.parse(storedCollection));
    } catch {
      storage.removeItem(INVESTIGATION_WORKSPACE_COLLECTION_STORAGE_KEY);
      return empty;
    }
  }

  const legacyWorkspace = readLegacyStoredWorkspace(storage);
  if (!legacyWorkspace) return empty;
  return {
    ...empty,
    activeWorkspaceId: legacyWorkspace.id,
    workspaces: [legacyWorkspace],
  };
}

export function writeStoredInvestigationWorkspaceCollection(
  collection: StoredInvestigationWorkspaceCollection,
  storage = resolveStorage(),
): void {
  if (!storage) return;
  const normalized = normalizeInvestigationWorkspaceCollection(collection);
  storage.setItem(INVESTIGATION_WORKSPACE_COLLECTION_STORAGE_KEY, JSON.stringify(normalized));
  const activeWorkspace = normalized.workspaces.find((workspace) => workspace.id === normalized.activeWorkspaceId) ??
    normalized.workspaces[0] ??
    null;
  if (activeWorkspace) storage.setItem(INVESTIGATION_WORKSPACE_STORAGE_KEY, JSON.stringify(activeWorkspace));
  else storage.removeItem(INVESTIGATION_WORKSPACE_STORAGE_KEY);
}

export function selectStoredInvestigationWorkspace(
  workspaceId: string,
  storage = resolveStorage(),
): StoredInvestigationWorkspaceCollection {
  const collection = readStoredInvestigationWorkspaceCollection(storage);
  const activeWorkspaceId = collection.workspaces.some((workspace) => workspace.id === workspaceId)
    ? workspaceId
    : collection.activeWorkspaceId;
  const nextCollection = { ...collection, activeWorkspaceId };
  writeStoredInvestigationWorkspaceCollection(nextCollection, storage);
  return nextCollection;
}

function readLegacyStoredWorkspace(storage: Storage): InvestigationWorkspace | null {
  const stored = storage.getItem(INVESTIGATION_WORKSPACE_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as InvestigationWorkspace;
  } catch {
    storage.removeItem(INVESTIGATION_WORKSPACE_STORAGE_KEY);
    return null;
  }
}

export function writeStoredInvestigationWorkspace(
  workspace: InvestigationWorkspace,
  storage = resolveStorage(),
): void {
  if (!storage) return;
  const collection = readStoredInvestigationWorkspaceCollection(storage);
  writeStoredInvestigationWorkspaceCollection(upsertInvestigationWorkspaceCollection(collection, workspace), storage);
}

export function addCaseToStoredInvestigationWorkspace(
  input: StoredInvestigationWorkspaceCaseInput,
): StoredInvestigationWorkspaceCaseResult {
  const storage = input.storage ?? resolveStorage();
  const collection = readStoredInvestigationWorkspaceCollection(storage);
  const activeWorkspace = collection.workspaces.find((workspace) => workspace.id === collection.activeWorkspaceId) ??
    collection.workspaces[0] ??
    null;
  const result = ensureInvestigationWorkspaceWithCase({
    workspace: activeWorkspace,
    caseId: input.caseId,
    countryCode: input.countryCode,
    reason: input.reason,
    note: input.note,
    now: input.now,
  });
  const nextCollection = upsertInvestigationWorkspaceCollection(collection, result.workspace);

  writeStoredInvestigationWorkspaceCollection(nextCollection, storage);
  const storedResult = { ...result, collection: nextCollection };
  notifyWorkspaceUpdated(storedResult);
  return storedResult;
}

function resolveStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}

function notifyWorkspaceUpdated(result: StoredInvestigationWorkspaceCaseResult): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(INVESTIGATION_WORKSPACE_UPDATED_EVENT, { detail: result }));
}
