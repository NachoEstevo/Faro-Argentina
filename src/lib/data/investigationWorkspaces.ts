import type { EvidencePack } from "../caseRepository.ts";
import { resolveSupplierIdentity } from "./entityResolution.ts";
import {
  buildRelationProvenance,
  buildSupplierRelationProvenance,
  type RelationProvenance,
} from "./relationProvenance.ts";

export type InvestigationCountryCode = "AR";

export type InvestigationEntityKind =
  | "supplier"
  | "agency"
  | "person"
  | "case_number"
  | "work_id"
  | "contract_id"
  | "other";

export interface InvestigationSourceLink {
  id: string;
  url: string;
  label: string;
  note: string;
}

export interface InvestigationNote {
  id: string;
  body: string;
  createdAt: string;
}

export interface InvestigationEntity {
  id: string;
  label: string;
  kind: InvestigationEntityKind;
  note: string;
}

export interface InvestigationFile {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface InvestigationAnalysis {
  id: string;
  createdAt: string;
  summary: string;
  markdown: string;
}

export type InvestigationVerificationTaskStatus = "pending" | "in_progress" | "done" | "blocked";

export interface InvestigationVerificationTask {
  id: string;
  title: string;
  action: string;
  source: string;
  status: InvestigationVerificationTaskStatus;
  owner: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export type InvestigationCaseRelationReason =
  | "same_supplier"
  | "same_agency"
  | "same_procedure"
  | "same_location"
  | "same_judicial_context"
  | "same_source"
  | "manual_hypothesis"
  | "other";

export interface InvestigationCaseRelation {
  caseId: string;
  reason: InvestigationCaseRelationReason;
  note: string;
  addedAt: string;
}

export interface InvestigationWorkspace {
  id: string;
  version: "faro_investigation_workspace_v1";
  title: string;
  countryCode: InvestigationCountryCode | null;
  description: string;
  investigationQuestion: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  caseIds: string[];
  caseRelations: InvestigationCaseRelation[];
  sourceLinks: InvestigationSourceLink[];
  notes: InvestigationNote[];
  entities: InvestigationEntity[];
  files: InvestigationFile[];
  analyses: InvestigationAnalysis[];
  verificationTasks: InvestigationVerificationTask[];
}

export interface CreateInvestigationWorkspaceInput {
  title: string;
  countryCode?: InvestigationCountryCode | null;
  description?: string;
  investigationQuestion?: string | null;
  tags?: string[];
}

export interface InvestigationAggregate {
  caseCount: number;
  sourceIds: string[];
  relationReasons: Array<{
    reason: InvestigationCaseRelationReason;
    label: string;
    count: number;
    caseIds: string[];
  }>;
  caseRelationNotes: Array<{
    caseId: string;
    reason: InvestigationCaseRelationReason;
    label: string;
    note: string;
  }>;
  repeatedSuppliers: Array<{ label: string; document: string | null; provenance: RelationProvenance; count: number; caseIds: string[] }>;
  repeatedAgencies: Array<{ label: string; provenance: RelationProvenance; count: number; caseIds: string[] }>;
  amountsByCurrency: Array<{ currency: string; total: number; count: number }>;
  timeline: Array<{ year: number; count: number; caseIds: string[] }>;
  signals: Array<{ code: string; label: string; count: number; caseIds: string[] }>;
  geometryGaps: { count: number; caseIds: string[] };
  entityMatches: Array<{ entityId: string; entityLabel: string; kind: InvestigationEntityKind; caseIds: string[] }>;
}

export interface AddCaseToWorkspaceOptions {
  reason?: InvestigationCaseRelationReason;
  note?: string;
  now?: Date;
}

export interface AddVerificationTaskInput {
  title?: string;
  action: string;
  source: string;
  status?: InvestigationVerificationTaskStatus;
  owner?: string | null;
  dueDate?: string | null;
}

export interface InvestigationReadinessGate {
  ready: boolean;
  label: string;
  blockers: string[];
}

export type EnsureInvestigationWorkspaceStatus =
  | "created"
  | "added"
  | "updated"
  | "already_present";

export interface EnsureInvestigationWorkspaceWithCaseInput {
  workspace: InvestigationWorkspace | null;
  caseId: string;
  countryCode: InvestigationCountryCode;
  reason?: InvestigationCaseRelationReason;
  note?: string;
  title?: string;
  now?: Date;
}

export interface EnsureInvestigationWorkspaceWithCaseResult {
  workspace: InvestigationWorkspace;
  status: EnsureInvestigationWorkspaceStatus;
}

export const INVESTIGATION_RELATION_REASON_OPTIONS: Array<{
  value: InvestigationCaseRelationReason;
  label: string;
}> = [
  { value: "same_supplier", label: "Mismo proveedor" },
  { value: "same_agency", label: "Mismo organismo" },
  { value: "same_procedure", label: "Mismo procedimiento" },
  { value: "same_location", label: "Misma ubicación" },
  { value: "same_judicial_context", label: "Mismo contexto judicial" },
  { value: "same_source", label: "Misma fuente" },
  { value: "manual_hypothesis", label: "Hipótesis de trabajo" },
  { value: "other", label: "Otra relación" },
];

export function createInvestigationWorkspace(
  input: CreateInvestigationWorkspaceInput,
  now = new Date(),
): InvestigationWorkspace {
  const createdAt = now.toISOString();
  return {
    id: createWorkspaceId(now),
    version: "faro_investigation_workspace_v1",
    title: normalizeInvestigationText(input.title) || "Carpeta de investigación",
    countryCode: input.countryCode ?? null,
    description: normalizeInvestigationText(input.description),
    investigationQuestion: optionalText(input.investigationQuestion),
    tags: uniqueStrings((input.tags ?? []).map(normalizeInvestigationText).filter(Boolean)),
    createdAt,
    updatedAt: createdAt,
    caseIds: [],
    caseRelations: [],
    sourceLinks: [],
    notes: [],
    entities: [],
    files: [],
    analyses: [],
    verificationTasks: [],
  };
}

export function addCaseToWorkspace(
  workspace: InvestigationWorkspace,
  caseId: string,
  input: Date | AddCaseToWorkspaceOptions = new Date(),
): InvestigationWorkspace {
  const options = resolveAddCaseOptions(input);
  const normalizedCaseId = normalizeInvestigationText(caseId);
  const caseIds = normalizedCaseId && !workspace.caseIds.includes(normalizedCaseId)
    ? [...workspace.caseIds, normalizedCaseId]
    : [...workspace.caseIds];
  const caseRelations = normalizedCaseId
    ? [
      ...(workspace.caseRelations ?? []).filter((relation) => relation.caseId !== normalizedCaseId),
      {
        caseId: normalizedCaseId,
        reason: normalizeRelationReason(options.reason),
        note: normalizeInvestigationText(options.note),
        addedAt: options.now.toISOString(),
      },
    ]
    : [...(workspace.caseRelations ?? [])];
  return { ...workspace, caseIds, caseRelations, updatedAt: options.now.toISOString() };
}

export function removeCaseFromWorkspace(
  workspace: InvestigationWorkspace,
  caseId: string,
  now = new Date(),
): InvestigationWorkspace {
  return {
    ...workspace,
    caseIds: workspace.caseIds.filter((id) => id !== caseId),
    caseRelations: (workspace.caseRelations ?? []).filter((relation) => relation.caseId !== caseId),
    updatedAt: now.toISOString(),
  };
}

export function addVerificationTaskToWorkspace(
  workspace: InvestigationWorkspace,
  input: AddVerificationTaskInput,
  now = new Date(),
): InvestigationWorkspace {
  const action = normalizeInvestigationText(input.action);
  const title = normalizeInvestigationText(input.title) || action || "Verificación pendiente";
  const source = normalizeInvestigationText(input.source) || "Carpeta";
  const createdAt = now.toISOString();
  const task: InvestigationVerificationTask = {
    id: nextVerificationTaskId(workspace),
    title,
    action,
    source,
    status: normalizeTaskStatus(input.status),
    owner: optionalText(input.owner),
    dueDate: normalizeDueDate(input.dueDate),
    createdAt,
    updatedAt: createdAt,
  };
  return {
    ...workspace,
    verificationTasks: [...readVerificationTasks(workspace), task],
    updatedAt: createdAt,
  };
}

export function createVerificationTasksFromNextSteps(
  workspace: InvestigationWorkspace,
  steps: string[],
  now = new Date(),
): InvestigationWorkspace {
  const existingActions = new Set(readVerificationTasks(workspace).map((task) => normalizeKey(task.action)));
  let nextWorkspace = workspace;
  for (const step of steps) {
    const action = normalizeInvestigationText(step);
    const key = normalizeKey(action);
    if (!action || existingActions.has(key)) continue;
    nextWorkspace = addVerificationTaskToWorkspace(nextWorkspace, {
      title: action.length > 80 ? `${action.slice(0, 77)}...` : action,
      action,
      source: "Próximos pasos del dossier",
      status: "pending",
    }, now);
    existingActions.add(key);
  }
  return nextWorkspace;
}

export function updateVerificationTaskStatus(
  workspace: InvestigationWorkspace,
  taskId: string,
  status: InvestigationVerificationTaskStatus,
  now = new Date(),
): InvestigationWorkspace {
  const normalizedTaskId = normalizeInvestigationText(taskId);
  const updatedAt = now.toISOString();
  return {
    ...workspace,
    verificationTasks: readVerificationTasks(workspace).map((task) =>
      task.id === normalizedTaskId
        ? { ...task, status: normalizeTaskStatus(status), updatedAt }
        : task
    ),
    updatedAt,
  };
}

export function buildInvestigationReadiness(workspace: InvestigationWorkspace): InvestigationReadinessGate {
  const blockers: string[] = [];
  const tasks = readVerificationTasks(workspace);
  if (workspace.caseIds.length === 0) blockers.push("Agregar al menos un expediente oficial.");
  if (tasks.length === 0) blockers.push("Crear tareas de verificación antes del handoff.");
  const openTasks = tasks.filter((task) => task.status !== "done");
  if (openTasks.length > 0) blockers.push(`${formatTaskCount(openTasks.length)} sin cerrar.`);
  const missingRelationNotes = workspace.caseIds.filter((caseId) => {
    const relation = (workspace.caseRelations ?? []).find((item) => item.caseId === caseId);
    return !normalizeInvestigationText(relation?.note);
  }).length;
  if (missingRelationNotes > 0) blockers.push(`${missingRelationNotes} expediente${missingRelationNotes === 1 ? "" : "s"} sin nota de relación.`);
  return {
    ready: blockers.length === 0,
    label: blockers.length === 0 ? "Lista para handoff interno" : "No lista para handoff",
    blockers,
  };
}

export function ensureInvestigationWorkspaceWithCase(
  input: EnsureInvestigationWorkspaceWithCaseInput,
): EnsureInvestigationWorkspaceWithCaseResult {
  const now = input.now ?? new Date();
  const normalizedCaseId = normalizeInvestigationText(input.caseId);
  const workspace = input.workspace ?? createInvestigationWorkspace(
    {
      title: input.title ?? "Carpeta de investigación",
      countryCode: input.countryCode,
      description: "Selección privada de expedientes para verificar.",
    },
    now,
  );
  const alreadyPresent = normalizedCaseId ? workspace.caseIds.includes(normalizedCaseId) : false;
  const explicitRelationUpdate =
    input.reason !== undefined || normalizeInvestigationText(input.note).length > 0;

  if (alreadyPresent && !explicitRelationUpdate) {
    return { workspace, status: "already_present" };
  }

  const updated = addCaseToWorkspace(workspace, normalizedCaseId, {
    reason: input.reason,
    note: input.note,
    now,
  });

  if (!input.workspace) return { workspace: updated, status: "created" };
  if (alreadyPresent) return { workspace: updated, status: "updated" };
  return { workspace: updated, status: "added" };
}

export function buildInvestigationAggregate(
  workspace: InvestigationWorkspace,
  packs: EvidencePack[],
): InvestigationAggregate {
  const sourceIds = new Set<string>();
  const suppliers = new Map<string, { label: string; document: string | null; provenance: RelationProvenance; caseIds: string[] }>();
  const agencies = new Map<string, { label: string; provenance: RelationProvenance; caseIds: string[] }>();
  const amounts = new Map<string, { currency: string; total: number; count: number }>();
  const timeline = new Map<number, { year: number; caseIds: string[] }>();
  const signals = new Map<string, { code: string; label: string; caseIds: string[] }>();
  const geometryGapCaseIds: string[] = [];
  const relationReasons = new Map<InvestigationCaseRelationReason, {
    reason: InvestigationCaseRelationReason;
    label: string;
    caseIds: string[];
  }>();
  const entityMatches = new Map<string, {
    entityId: string;
    entityLabel: string;
    kind: InvestigationEntityKind;
    caseIds: string[];
  }>();
  const selectedCaseIds = new Set(packs.map((pack) => pack.caseFile.id));
  const relationNotes: InvestigationAggregate["caseRelationNotes"] = [];

  for (const pack of packs) {
    const caseFile = pack.caseFile;
    sourceIds.add(pack.receipt.sourceId);
    addSupplier(suppliers, caseFile);
    addAgency(agencies, caseFile);
    addAmount(amounts, caseFile);
    addTimeline(timeline, caseFile);
    for (const signal of pack.signals) {
      addGrouped(signals, signal.code, {
        code: signal.code,
        label: signal.label,
        caseId: caseFile.id,
      });
    }
    if (!caseFile.coordinates) geometryGapCaseIds.push(caseFile.id);
    matchWorkspaceEntities(entityMatches, workspace.entities, caseFile);
  }

  const relationsByCaseId = new Map<string, InvestigationCaseRelation>();
  for (const relation of workspace.caseRelations ?? []) {
    if (!selectedCaseIds.has(relation.caseId)) continue;
    relationsByCaseId.set(relation.caseId, relation);
  }

  for (const relation of relationsByCaseId.values()) {
    const reason = normalizeRelationReason(relation.reason);
    const label = getInvestigationRelationReasonLabel(reason);
    const current = relationReasons.get(reason) ?? { reason, label, caseIds: [] };
    current.caseIds.push(relation.caseId);
    relationReasons.set(reason, current);
    const note = normalizeInvestigationText(relation.note);
    if (note) relationNotes.push({ caseId: relation.caseId, reason, label, note });
  }

  return {
    caseCount: packs.length,
    sourceIds: [...sourceIds],
    relationReasons: [...relationReasons.values()]
      .map((item) => ({
        reason: item.reason,
        label: item.label,
        count: item.caseIds.length,
        caseIds: item.caseIds,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    caseRelationNotes: relationNotes,
    repeatedSuppliers: repeatedFromMap(suppliers).map((item) => ({
      label: item.label,
      document: item.document,
      provenance: item.provenance,
      count: item.caseIds.length,
      caseIds: item.caseIds,
    })),
    repeatedAgencies: repeatedFromMap(agencies).map((item) => ({
      label: item.label,
      provenance: item.provenance,
      count: item.caseIds.length,
      caseIds: item.caseIds,
    })),
    amountsByCurrency: [...amounts.values()],
    timeline: [...timeline.values()]
      .map((item) => ({ year: item.year, count: item.caseIds.length, caseIds: item.caseIds }))
      .sort((a, b) => a.year - b.year),
    signals: [...signals.values()]
      .map((item) => ({ code: item.code, label: item.label, count: item.caseIds.length, caseIds: item.caseIds }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    geometryGaps: {
      count: geometryGapCaseIds.length,
      caseIds: geometryGapCaseIds,
    },
    entityMatches: [...entityMatches.values()],
  };
}

export function normalizeInvestigationText(value: string | null | undefined): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function getInvestigationRelationReasonLabel(reason: InvestigationCaseRelationReason): string {
  return INVESTIGATION_RELATION_REASON_OPTIONS.find((option) => option.value === reason)?.label ?? "Relación";
}

function createWorkspaceId(now: Date): string {
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = globalThis.crypto?.randomUUID?.().slice(0, 8).toUpperCase() ??
    Math.random().toString(16).slice(2, 10).toUpperCase();
  return `INV-${date}-${random}`;
}

function optionalText(value: string | null | undefined): string | null {
  const normalized = normalizeInvestigationText(value);
  return normalized || null;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function readVerificationTasks(workspace: InvestigationWorkspace): InvestigationVerificationTask[] {
  return Array.isArray(workspace.verificationTasks) ? workspace.verificationTasks : [];
}

function nextVerificationTaskId(workspace: InvestigationWorkspace): string {
  const nextNumber = readVerificationTasks(workspace).reduce((max, task) => {
    const match = /^TASK-(\d+)$/.exec(task.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0) + 1;
  return `TASK-${nextNumber}`;
}

function normalizeTaskStatus(
  status: InvestigationVerificationTaskStatus | null | undefined,
): InvestigationVerificationTaskStatus {
  if (status === "in_progress" || status === "done" || status === "blocked") return status;
  return "pending";
}

function normalizeDueDate(value: string | null | undefined): string | null {
  const normalized = normalizeInvestigationText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const date = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : normalized;
}

function formatTaskCount(count: number): string {
  return `${count} tarea${count === 1 ? "" : "s"} de verificación`;
}

function resolveAddCaseOptions(input: Date | AddCaseToWorkspaceOptions): Required<AddCaseToWorkspaceOptions> {
  if (input instanceof Date) {
    return { reason: "manual_hypothesis", note: "", now: input };
  }
  return {
    reason: normalizeRelationReason(input.reason),
    note: normalizeInvestigationText(input.note),
    now: input.now ?? new Date(),
  };
}

function normalizeRelationReason(
  reason: InvestigationCaseRelationReason | null | undefined,
): InvestigationCaseRelationReason {
  const candidate = reason ?? "manual_hypothesis";
  return INVESTIGATION_RELATION_REASON_OPTIONS.some((option) => option.value === candidate)
    ? candidate
    : "manual_hypothesis";
}

function addSupplier(
  suppliers: Map<string, { label: string; document: string | null; provenance: RelationProvenance; caseIds: string[] }>,
  caseFile: EvidencePack["caseFile"],
) {
  const identity = resolveSupplierIdentity({
    countryCode: caseFile.countryCode,
    supplierName: readStringField(caseFile, "supplierName"),
    supplierDocument: readStringField(caseFile, "supplierDocument"),
  });
  if (!identity) return;
  const label = normalizeInvestigationText(readStringField(caseFile, "supplierName")) || identity.label;
  const document = optionalText(readStringField(caseFile, "supplierDocument"));
  const current = suppliers.get(identity.key) ?? {
    label,
    document,
    provenance: buildSupplierRelationProvenance(identity),
    caseIds: [],
  };
  current.caseIds.push(caseFile.id);
  suppliers.set(identity.key, current);
}

function addAgency(
  agencies: Map<string, { label: string; provenance: RelationProvenance; caseIds: string[] }>,
  caseFile: EvidencePack["caseFile"],
) {
  const label = normalizeInvestigationText(caseFile.agencyName ?? caseFile.contractingUnit);
  if (!label) return;
  const key = normalizeKey(label);
  const current = agencies.get(key) ?? {
    label,
    provenance: buildRelationProvenance("same_agency"),
    caseIds: [],
  };
  current.caseIds.push(caseFile.id);
  agencies.set(key, current);
}

function addAmount(amounts: Map<string, { currency: string; total: number; count: number }>, caseFile: EvidencePack["caseFile"]) {
  const amount = readAmount(caseFile);
  if (!amount || !Number.isFinite(amount.value)) return;
  const currency = normalizeInvestigationText(amount.currency).toUpperCase();
  if (!currency) return;
  const current = amounts.get(currency) ?? { currency, total: 0, count: 0 };
  current.total += amount.value;
  current.count += 1;
  amounts.set(currency, current);
}

function addTimeline(timeline: Map<number, { year: number; caseIds: string[] }>, caseFile: EvidencePack["caseFile"]) {
  if (!Number.isFinite(caseFile.year)) return;
  const year = Number(caseFile.year);
  const current = timeline.get(year) ?? { year, caseIds: [] };
  current.caseIds.push(caseFile.id);
  timeline.set(year, current);
}

function addGrouped(
  signals: Map<string, { code: string; label: string; caseIds: string[] }>,
  key: string,
  item: { code: string; label: string; caseId: string },
) {
  const current = signals.get(key) ?? { code: item.code, label: item.label, caseIds: [] };
  current.caseIds.push(item.caseId);
  signals.set(key, current);
}

function repeatedFromMap<T extends { caseIds: string[] }>(items: Map<string, T>): T[] {
  return [...items.values()]
    .filter((item) => item.caseIds.length > 1)
    .sort((a, b) => b.caseIds.length - a.caseIds.length);
}

function matchWorkspaceEntities(
  matches: Map<string, { entityId: string; entityLabel: string; kind: InvestigationEntityKind; caseIds: string[] }>,
  entities: InvestigationEntity[],
  caseFile: EvidencePack["caseFile"],
) {
  const haystack = normalizeKey([
    caseFile.id,
    caseFile.title,
    readStringField(caseFile, "supplierName"),
    readStringField(caseFile, "supplierDocument"),
    caseFile.agencyName,
    caseFile.contractingUnit,
    caseFile.procedureNumber,
    caseFile.workNumber,
  ].filter(Boolean).join(" "));
  for (const entity of entities) {
    const needle = normalizeKey(entity.label);
    if (!needle || !haystack.includes(needle)) continue;
    const current = matches.get(entity.id) ?? {
      entityId: entity.id,
      entityLabel: entity.label,
      kind: entity.kind,
      caseIds: [],
    };
    current.caseIds.push(caseFile.id);
    matches.set(entity.id, current);
  }
}

function normalizeKey(value: string): string {
  return normalizeInvestigationText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function readStringField(caseFile: EvidencePack["caseFile"], key: string): string {
  if (!(key in caseFile)) return "";
  const value = (caseFile as unknown as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function readAmount(caseFile: EvidencePack["caseFile"]): { currency: string; value: number } | null {
  if (!("amount" in caseFile)) return null;
  const amount = (caseFile as { amount?: unknown }).amount;
  if (!amount || typeof amount !== "object") return null;
  const record = amount as Partial<{ currency: string; value: number }>;
  if (typeof record.currency !== "string" || typeof record.value !== "number") return null;
  return { currency: record.currency, value: record.value };
}
