import type { EvidencePack } from "../caseRepository.ts";
import { hasValidOfficialGeometry } from "./coordinateQuality.ts";
import {
  buildInvestigationAggregate,
  getInvestigationRelationReasonLabel,
  normalizeInvestigationText,
  type InvestigationCaseRelation,
  type InvestigationWorkspace,
} from "./investigationWorkspaces.ts";
import type { RelationProvenance } from "./relationProvenance.ts";

export interface InvestigationDossierMatrixRow {
  caseId: string;
  title: string;
  relation: string;
  officialEvidence: string;
  officialSourceUrl: string;
  userContext: string;
  caveat: string;
  gap: string;
  nextStep: string;
}

export interface InvestigationDossierActor {
  label: string;
  kind: "Proveedor" | "Organismo" | "Entidad manual";
  basis: "CUIT/documento" | "Nombre normalizado" | "Entidad cargada por usuario";
  provenance?: RelationProvenance;
  count: number;
  caseIds: string[];
}

export interface InvestigationDossier {
  matrix: InvestigationDossierMatrixRow[];
  actors: InvestigationDossierActor[];
  gaps: string[];
  nextSteps: string[];
}

export function buildInvestigationDossier(
  workspace: InvestigationWorkspace,
  packs: EvidencePack[],
): InvestigationDossier {
  const aggregate = buildInvestigationAggregate(workspace, packs);
  const relations = new Map((workspace.caseRelations ?? []).map((relation) => [relation.caseId, relation]));
  const matrix = packs.map((pack) => buildMatrixRow(pack, relations.get(pack.caseFile.id)));
  const actors = buildActors(aggregate);
  const gaps = buildGaps(workspace, packs, matrix);
  const nextSteps = buildNextSteps(workspace, packs, gaps);

  return { matrix, actors, gaps, nextSteps };
}

function buildMatrixRow(
  pack: EvidencePack,
  relation: InvestigationCaseRelation | undefined,
): InvestigationDossierMatrixRow {
  const caseFile = pack.caseFile;
  const relationLabel = getInvestigationRelationReasonLabel(relation?.reason ?? "manual_hypothesis");
  const relationNote = normalizeInvestigationText(relation?.note);
  const leadSignal = pack.signals.find((signal) => signal.leadEligible) ?? pack.signals[0] ?? null;
  const caveat = firstText([
    pack.caveats[0],
    leadSignal?.caveat,
    ...readCaseCaveats(caseFile),
  ]) ?? "Revisar la fuente oficial antes de concluir.";

  return {
    caseId: caseFile.id,
    title: caseFile.title,
    relation: relationNote ? `${relationLabel}. ${relationNote}` : relationLabel,
    officialEvidence: formatOfficialEvidence(pack),
    officialSourceUrl: pack.receipt.sourceUrl,
    userContext: relationNote
      ? `Contexto del usuario: ${relationNote}`
      : "Sin contexto del usuario para este expediente.",
    caveat,
    gap: describePrimaryGap(pack),
    nextStep: firstText([
      pack.verificationSteps[0],
      leadSignal?.action,
      "Abrir fuente oficial y pedir documentación complementaria si el expediente lo requiere.",
    ]) ?? "Abrir fuente oficial y revisar recibos.",
  };
}

function formatOfficialEvidence(pack: EvidencePack): string {
  const receipt = pack.receipt;
  const record = normalizeInvestigationText(receipt.recordId);
  const locatorObject = (receipt as { locator?: { label?: string } }).locator;
  const locator = locatorObject?.label ?? receipt.locatorType;
  return [
    `Fuente: ${receipt.sourceName}`,
    record ? `registro ${record}` : "",
    locator ? `tipo ${locator}` : "",
  ].filter(Boolean).join(" · ");
}

function describePrimaryGap(pack: EvidencePack): string {
  if (!hasOfficialGeometry(pack.caseFile)) return "Sin geometría oficial validada para mapa.";
  if (pack.contextualCitations.length > 0) return "Tiene contexto documental; mantener separado de la evidencia oficial.";
  if (pack.verificationSteps.length === 0) return "Faltan próximos pasos de verificación documentados.";
  if (pack.relatedReceipts.length === 0) return "Falta evidencia complementaria de pago, avance, recepción o ampliación en este paquete.";
  return "Completar verificación documental antes de usar como hallazgo.";
}

function buildActors(aggregate: ReturnType<typeof buildInvestigationAggregate>): InvestigationDossierActor[] {
  return [
    ...aggregate.repeatedSuppliers.map((supplier) => ({
      label: supplier.label,
      kind: "Proveedor" as const,
      basis: supplier.document ? "CUIT/documento" as const : "Nombre normalizado" as const,
      provenance: supplier.provenance,
      count: supplier.count,
      caseIds: supplier.caseIds,
    })),
    ...aggregate.repeatedAgencies.map((agency) => ({
      label: agency.label,
      kind: "Organismo" as const,
      basis: "Nombre normalizado" as const,
      provenance: agency.provenance,
      count: agency.count,
      caseIds: agency.caseIds,
    })),
    ...aggregate.entityMatches.map((match) => ({
      label: match.entityLabel,
      kind: "Entidad manual" as const,
      basis: "Entidad cargada por usuario" as const,
      count: match.caseIds.length,
      caseIds: match.caseIds,
    })),
  ].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function buildGaps(
  workspace: InvestigationWorkspace,
  packs: EvidencePack[],
  matrix: InvestigationDossierMatrixRow[],
): string[] {
  const gaps: string[] = [];
  const geometryGapCount = matrix.filter((row) => /Sin geometría oficial/i.test(row.gap)).length;
  const contextualCount = packs.filter((pack) => pack.contextualCitations.length > 0).length;
  const missingRelationNoteCount = workspace.caseIds.filter((caseId) => {
    const relation = (workspace.caseRelations ?? []).find((item) => item.caseId === caseId);
    return !normalizeInvestigationText(relation?.note);
  }).length;

  if (geometryGapCount > 0) gaps.push(`${formatCount(geometryGapCount, "expediente")} sin geometría oficial validada.`);
  if (contextualCount > 0) gaps.push(`${formatCount(contextualCount, "expediente")} con contexto documental separado de la evidencia oficial.`);
  if (missingRelationNoteCount > 0) gaps.push(`${formatCount(missingRelationNoteCount, "expediente")} sin nota explícita de relación.`);
  if (workspace.sourceLinks.length > 0) gaps.push(`${formatCount(workspace.sourceLinks.length, "fuente manual")} cargada por el usuario requiere validación.`);
  if (gaps.length === 0 && packs.length > 0) gaps.push("No hay brechas automáticas críticas; revisar caveats de cada expediente.");
  if (packs.length === 0) gaps.push("El espacio todavía no tiene expedientes para construir matriz.");

  return uniqueStrings(gaps);
}

function buildNextSteps(
  workspace: InvestigationWorkspace,
  packs: EvidencePack[],
  gaps: string[],
): string[] {
  const steps = [
    packs.length > 0 ? "Abrir fuente oficial y confirmar que el registro coincide con la hipótesis de trabajo." : "Agregar expedientes antes de armar un dossier.",
    ...packs.flatMap((pack) => pack.verificationSteps).slice(0, 4),
  ];
  if (workspace.caseIds.some((caseId) => !(workspace.caseRelations ?? []).some((relation) => relation.caseId === caseId && normalizeInvestigationText(relation.note)))) {
    steps.push("Documentar por qué cada expediente entra en este espacio.");
  }
  if (gaps.some((gap) => /geometría/i.test(gap))) {
    steps.push("Resolver brechas de geometría solo con fuente oficial validada.");
  }
  if (packs.some((pack) => pack.contextualCitations.length > 0)) {
    steps.push("Separar contexto documental de la evidencia oficial antes de citar relaciones.");
  }
  return uniqueStrings(steps.map(normalizeInvestigationText).filter(Boolean)).slice(0, 8);
}

function firstText(values: Array<string | null | undefined>): string | null {
  return values.map(normalizeInvestigationText).find(Boolean) ?? null;
}

function readCaseCaveats(caseFile: EvidencePack["caseFile"]): string[] {
  const caveats = (caseFile as { caveats?: unknown }).caveats;
  return Array.isArray(caveats) ? caveats.filter((item): item is string => typeof item === "string") : [];
}

function hasOfficialGeometry(caseFile: EvidencePack["caseFile"]): boolean {
  const coordinates = (caseFile as { coordinates?: unknown }).coordinates;
  if (!isGeoPoint(coordinates)) return false;
  return hasValidOfficialGeometry({
    caseId: caseFile.id,
    countryCode: caseFile.countryCode,
    coordinates,
  });
}

function isGeoPoint(value: unknown): value is { lat: number; lon: number } {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as { lat?: unknown }).lat === "number" &&
      typeof (value as { lon?: unknown }).lon === "number",
  );
}

function formatCount(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}
