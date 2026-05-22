import {
  ensureInvestigationWorkspaceWithCase,
  type EnsureInvestigationWorkspaceStatus,
  type InvestigationCaseRelationReason,
  type InvestigationCountryCode,
  type InvestigationWorkspace,
} from "../data/investigationWorkspaces.ts";

export const INVESTIGATION_WORKSPACE_STORAGE_KEY = "faro-investigation-workspace-v1";
export const INVESTIGATION_WORKSPACE_UPDATED_EVENT = "faro:investigation-workspace-updated";

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
}

export function readStoredInvestigationWorkspace(storage = resolveStorage()): InvestigationWorkspace | null {
  if (!storage) return null;
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
  storage.setItem(INVESTIGATION_WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
}

export function addCaseToStoredInvestigationWorkspace(
  input: StoredInvestigationWorkspaceCaseInput,
): StoredInvestigationWorkspaceCaseResult {
  const storage = input.storage ?? resolveStorage();
  const result = ensureInvestigationWorkspaceWithCase({
    workspace: readStoredInvestigationWorkspace(storage),
    caseId: input.caseId,
    countryCode: input.countryCode,
    reason: input.reason,
    note: input.note,
    now: input.now,
  });

  writeStoredInvestigationWorkspace(result.workspace, storage);
  notifyWorkspaceUpdated(result);
  return result;
}

function resolveStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}

function notifyWorkspaceUpdated(result: StoredInvestigationWorkspaceCaseResult): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(INVESTIGATION_WORKSPACE_UPDATED_EVENT, { detail: result }));
}
