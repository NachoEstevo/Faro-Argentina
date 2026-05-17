import type { EvidencePack } from "../caseRepository.ts";

export type InvestigationCountryCode = "AR" | "PE" | "CL";

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
  sourceLinks: InvestigationSourceLink[];
  notes: InvestigationNote[];
  entities: InvestigationEntity[];
  files: InvestigationFile[];
  analyses: InvestigationAnalysis[];
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
  repeatedSuppliers: Array<{ label: string; document: string | null; count: number; caseIds: string[] }>;
  repeatedAgencies: Array<{ label: string; count: number; caseIds: string[] }>;
  amountsByCurrency: Array<{ currency: string; total: number; count: number }>;
  timeline: Array<{ year: number; count: number; caseIds: string[] }>;
  signals: Array<{ code: string; label: string; count: number; caseIds: string[] }>;
  geometryGaps: { count: number; caseIds: string[] };
  entityMatches: Array<{ entityId: string; entityLabel: string; kind: InvestigationEntityKind; caseIds: string[] }>;
}

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
    sourceLinks: [],
    notes: [],
    entities: [],
    files: [],
    analyses: [],
  };
}

export function addCaseToWorkspace(
  workspace: InvestigationWorkspace,
  caseId: string,
  now = new Date(),
): InvestigationWorkspace {
  const normalizedCaseId = normalizeInvestigationText(caseId);
  const caseIds = normalizedCaseId && !workspace.caseIds.includes(normalizedCaseId)
    ? [...workspace.caseIds, normalizedCaseId]
    : [...workspace.caseIds];
  return { ...workspace, caseIds, updatedAt: now.toISOString() };
}

export function removeCaseFromWorkspace(
  workspace: InvestigationWorkspace,
  caseId: string,
  now = new Date(),
): InvestigationWorkspace {
  return {
    ...workspace,
    caseIds: workspace.caseIds.filter((id) => id !== caseId),
    updatedAt: now.toISOString(),
  };
}

export function buildInvestigationAggregate(
  workspace: InvestigationWorkspace,
  packs: EvidencePack[],
): InvestigationAggregate {
  const sourceIds = new Set<string>();
  const suppliers = new Map<string, { label: string; document: string | null; caseIds: string[] }>();
  const agencies = new Map<string, { label: string; caseIds: string[] }>();
  const amounts = new Map<string, { currency: string; total: number; count: number }>();
  const timeline = new Map<number, { year: number; caseIds: string[] }>();
  const signals = new Map<string, { code: string; label: string; caseIds: string[] }>();
  const geometryGapCaseIds: string[] = [];
  const entityMatches = new Map<string, {
    entityId: string;
    entityLabel: string;
    kind: InvestigationEntityKind;
    caseIds: string[];
  }>();

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

  return {
    caseCount: packs.length,
    sourceIds: [...sourceIds],
    repeatedSuppliers: repeatedFromMap(suppliers).map((item) => ({
      label: item.label,
      document: item.document,
      count: item.caseIds.length,
      caseIds: item.caseIds,
    })),
    repeatedAgencies: repeatedFromMap(agencies).map((item) => ({
      label: item.label,
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

function addSupplier(
  suppliers: Map<string, { label: string; document: string | null; caseIds: string[] }>,
  caseFile: EvidencePack["caseFile"],
) {
  const label = normalizeInvestigationText(readStringField(caseFile, "supplierName"));
  if (!label) return;
  const document = optionalText(readStringField(caseFile, "supplierDocument"));
  const key = document ? `document:${document}` : `name:${normalizeKey(label)}`;
  const current = suppliers.get(key) ?? { label, document, caseIds: [] };
  current.caseIds.push(caseFile.id);
  suppliers.set(key, current);
}

function addAgency(
  agencies: Map<string, { label: string; caseIds: string[] }>,
  caseFile: EvidencePack["caseFile"],
) {
  const label = normalizeInvestigationText(caseFile.agencyName ?? caseFile.contractingUnit);
  if (!label) return;
  const key = normalizeKey(label);
  const current = agencies.get(key) ?? { label, caseIds: [] };
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
