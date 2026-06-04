import type { EvidencePack } from "../caseRepository.ts";
import { assessCoordinateQuality } from "./coordinateQuality.ts";
import {
  normalizeInvestigationText,
  type InvestigationWorkspace,
} from "./investigationWorkspaces.ts";

export type InvestigationReadinessStatus = "ready" | "review" | "blocked";
export type InvestigationDossierReadinessLevel = "initial" | "working" | "handoff_ready";

export interface InvestigationReadinessCheck {
  id:
    | "official_evidence"
    | "relation_context"
    | "source_coverage"
    | "data_gaps"
    | "verification_plan"
    | "manual_material"
    | "publication_boundary";
  label: string;
  status: InvestigationReadinessStatus;
  summary: string;
  actions: string[];
}

export interface InvestigationDossierReadiness {
  level: InvestigationDossierReadinessLevel;
  label: string;
  summary: string;
  checks: InvestigationReadinessCheck[];
  blockers: string[];
  nextActions: string[];
  score: {
    ready: number;
    review: number;
    blocked: number;
  };
}

export function buildInvestigationDossierReadiness(
  workspace: InvestigationWorkspace,
  packs: EvidencePack[],
): InvestigationDossierReadiness {
  const checks = [
    buildOfficialEvidenceCheck(workspace, packs),
    buildRelationContextCheck(workspace),
    buildSourceCoverageCheck(workspace, packs),
    buildDataGapsCheck(packs),
    buildVerificationPlanCheck(workspace),
    buildManualMaterialCheck(workspace),
    buildPublicationBoundaryCheck(),
  ];
  const score = summarizeChecks(checks);
  const blockers = checks
    .filter((check) => check.status === "blocked")
    .map((check) => `${check.label}: ${check.summary}`);
  const nextActions = uniqueStrings(checks.flatMap((check) => check.actions)).slice(0, 7);
  const level = resolveReadinessLevel(workspace, score);

  return {
    level,
    label: labelReadinessLevel(level, score),
    summary: summarizeReadiness(workspace, packs, score),
    checks,
    blockers,
    nextActions,
    score,
  };
}

function buildOfficialEvidenceCheck(
  workspace: InvestigationWorkspace,
  packs: EvidencePack[],
): InvestigationReadinessCheck {
  if (workspace.caseIds.length === 0) {
    return check(
      "official_evidence",
      "Evidencia oficial",
      "blocked",
      "La carpeta todavia no tiene expedientes oficiales.",
      ["Agregar al menos un expediente desde Explorer o desde el detalle."],
    );
  }

  const packedCaseIds = new Set(packs.map((pack) => pack.caseFile.id));
  const missingPacks = workspace.caseIds.filter((caseId) => !packedCaseIds.has(caseId)).length;
  const missingReceipts = packs.filter((pack) => !pack.receipt?.sourceId || !pack.receipt?.recordId).length;
  if (missingPacks > 0 || missingReceipts > 0) {
    return check(
      "official_evidence",
      "Evidencia oficial",
      "review",
      `${formatCount(missingPacks + missingReceipts, "expediente")} requieren revisar receipt o carga completa.`,
      ["Esperar la carga del paquete o abrir el expediente para confirmar fuente y receipt."],
    );
  }

  return check(
    "official_evidence",
    "Evidencia oficial",
    "ready",
    `${formatCount(packs.length, "expediente")} con receipt oficial o documental identificado.`,
    [],
  );
}

function buildRelationContextCheck(workspace: InvestigationWorkspace): InvestigationReadinessCheck {
  if (workspace.caseIds.length === 0) {
    return check(
      "relation_context",
      "Relacion declarada",
      "blocked",
      "No hay relaciones para documentar.",
      ["Agregar expedientes y declarar por que entran en la carpeta."],
    );
  }

  const missingRelationNotes = workspace.caseIds.filter((caseId) => {
    const relation = (workspace.caseRelations ?? []).find((item) => item.caseId === caseId);
    return !normalizeInvestigationText(relation?.note);
  }).length;

  if (missingRelationNotes === workspace.caseIds.length) {
    return check(
      "relation_context",
      "Relacion declarada",
      "blocked",
      "Ningun expediente tiene nota de relacion.",
      ["Escribir una nota breve por expediente: que ayuda a verificar y que queda pendiente."],
    );
  }

  if (missingRelationNotes > 0) {
    return check(
      "relation_context",
      "Relacion declarada",
      "review",
      `${formatCount(missingRelationNotes, "expediente")} sin nota de relacion.`,
      ["Completar notas de relacion antes de compartir el dossier internamente."],
    );
  }

  return check(
    "relation_context",
    "Relacion declarada",
    "ready",
    "Cada expediente tiene motivo y nota de relacion.",
    [],
  );
}

function buildSourceCoverageCheck(
  workspace: InvestigationWorkspace,
  packs: EvidencePack[],
): InvestigationReadinessCheck {
  const sourceIds = uniqueStrings(packs.map((pack) => pack.receipt?.sourceId).filter(Boolean));
  if (workspace.caseIds.length === 0 || sourceIds.length === 0) {
    return check(
      "source_coverage",
      "Cobertura de fuentes",
      "blocked",
      "Todavia no hay fuentes oficiales dentro del dossier.",
      ["Agregar expedientes con receipt para construir cobertura de fuentes."],
    );
  }

  if (workspace.caseIds.length > 1 && sourceIds.length === 1) {
    return check(
      "source_coverage",
      "Cobertura de fuentes",
      "review",
      `La carpeta se apoya en una sola fuente: ${sourceIds[0]}.`,
      ["Revisar si existe fuente complementaria de pago, avance, recepcion, ampliacion o contexto."],
    );
  }

  return check(
    "source_coverage",
    "Cobertura de fuentes",
    "ready",
    `${formatCount(sourceIds.length, "fuente")} en los expedientes seleccionados.`,
    [],
  );
}

function buildDataGapsCheck(packs: EvidencePack[]): InvestigationReadinessCheck {
  if (packs.length === 0) {
    return check(
      "data_gaps",
      "Brechas de datos",
      "review",
      "Sin expedientes cargados para evaluar brechas.",
      ["Agregar expedientes antes de interpretar brechas."],
    );
  }

  const missingMapGeometry = packs.filter((pack) => !hasMapEligibleGeometry(pack)).length;
  const missingAmount = packs.filter((pack) => !hasPositiveAmount(pack)).length;
  const missingSupplier = packs.filter((pack) => !hasSupplierIdentity(pack)).length;
  const gapParts = [
    missingMapGeometry > 0 ? `${formatCount(missingMapGeometry, "expediente")} sin geometria map-safe` : "",
    missingAmount > 0 ? `${formatCount(missingAmount, "expediente")} sin monto comparable` : "",
    missingSupplier > 0 ? `${formatCount(missingSupplier, "expediente")} sin proveedor identificado` : "",
  ].filter(Boolean);

  if (gapParts.length > 0) {
    return check(
      "data_gaps",
      "Brechas de datos",
      "review",
      gapParts.join("; "),
      ["Tratar estas ausencias como pendientes de verificacion, no como conclusiones."],
    );
  }

  return check(
    "data_gaps",
    "Brechas de datos",
    "ready",
    "No hay brechas automaticas basicas en monto, proveedor o geometria map-safe.",
    [],
  );
}

function buildVerificationPlanCheck(workspace: InvestigationWorkspace): InvestigationReadinessCheck {
  const tasks = Array.isArray(workspace.verificationTasks) ? workspace.verificationTasks : [];
  if (tasks.length === 0) {
    return check(
      "verification_plan",
      "Plan de verificacion",
      "blocked",
      "No hay tareas de verificacion guardadas.",
      ["Guardar proximos pasos del dossier como tareas antes del handoff."],
    );
  }

  const openTasks = tasks.filter((task) => task.status !== "done").length;
  if (openTasks > 0) {
    return check(
      "verification_plan",
      "Plan de verificacion",
      "review",
      `${formatCount(openTasks, "tarea")} sin cerrar.`,
      ["Cerrar, asignar o marcar como bloqueadas las tareas abiertas."],
    );
  }

  return check(
    "verification_plan",
    "Plan de verificacion",
    "ready",
    "Las tareas cargadas estan cerradas.",
    [],
  );
}

function buildManualMaterialCheck(workspace: InvestigationWorkspace): InvestigationReadinessCheck {
  const manualItems = workspace.sourceLinks.length + workspace.entities.length + workspace.files.length;
  if (manualItems === 0) {
    return check(
      "manual_material",
      "Material manual",
      "ready",
      "Sin fuentes, entidades o archivos manuales pendientes.",
      [],
    );
  }

  return check(
    "manual_material",
    "Material manual",
    "review",
    `${formatCount(manualItems, "pieza")} cargada por el usuario requiere validacion manual.`,
    ["Confirmar fuente, permiso, metadata y relevancia antes de citar material manual."],
  );
}

function buildPublicationBoundaryCheck(): InvestigationReadinessCheck {
  return check(
    "publication_boundary",
    "Limite publico",
    "ready",
    "La carpeta es privada y no publica aportes ni hipotesis automaticamente.",
    [],
  );
}

function check(
  id: InvestigationReadinessCheck["id"],
  label: string,
  status: InvestigationReadinessStatus,
  summary: string,
  actions: string[],
): InvestigationReadinessCheck {
  return { id, label, status, summary, actions };
}

function summarizeChecks(checks: InvestigationReadinessCheck[]): InvestigationDossierReadiness["score"] {
  return checks.reduce(
    (score, checkItem) => ({ ...score, [checkItem.status]: score[checkItem.status] + 1 }),
    { ready: 0, review: 0, blocked: 0 },
  );
}

function resolveReadinessLevel(
  workspace: InvestigationWorkspace,
  score: InvestigationDossierReadiness["score"],
): InvestigationDossierReadinessLevel {
  if (workspace.caseIds.length === 0) return "initial";
  if (score.blocked > 0) return "working";
  return "handoff_ready";
}

function labelReadinessLevel(
  level: InvestigationDossierReadinessLevel,
  score: InvestigationDossierReadiness["score"],
): string {
  if (level === "initial") return "Inicial";
  if (level === "working") return "En armado";
  if (score.review > 0) return "Lista para handoff interno con caveats";
  return "Lista para handoff interno";
}

function summarizeReadiness(
  workspace: InvestigationWorkspace,
  packs: EvidencePack[],
  score: InvestigationDossierReadiness["score"],
): string {
  if (workspace.caseIds.length === 0) {
    return "Todavia falta agregar evidencia oficial para construir el dossier.";
  }
  if (score.blocked > 0) {
    return "Hay bloqueos de trabajo antes de compartir el paquete internamente.";
  }
  if (score.review > 0) {
    return `El dossier tiene ${formatCount(packs.length, "expediente")} y puede circular internamente si se conservan los caveats.`;
  }
  return "El dossier tiene evidencia, notas de relacion y tareas cerradas para handoff interno.";
}

function hasMapEligibleGeometry(pack: EvidencePack): boolean {
  const coordinates = (pack.caseFile as { coordinates?: unknown }).coordinates;
  if (!coordinates || typeof coordinates !== "object") return false;
  const lat = (coordinates as { lat?: unknown }).lat;
  const lon = (coordinates as { lon?: unknown }).lon;
  if (typeof lat !== "number" || typeof lon !== "number") return false;
  return assessCoordinateQuality({
    caseId: pack.caseFile.id,
    countryCode: pack.caseFile.countryCode,
    coordinates: { lat, lon },
  }).exposeOnMap;
}

function hasPositiveAmount(pack: EvidencePack): boolean {
  const amount = (pack.caseFile as { amount?: unknown }).amount;
  return Boolean(
    amount &&
      typeof amount === "object" &&
      typeof (amount as { value?: unknown }).value === "number" &&
      (amount as { value: number }).value > 0,
  );
}

function hasSupplierIdentity(pack: EvidencePack): boolean {
  const caseFile = pack.caseFile as { supplierName?: unknown; supplierDocument?: unknown };
  return Boolean(normalizeInvestigationText(String(caseFile.supplierName ?? "")) ||
    normalizeInvestigationText(String(caseFile.supplierDocument ?? "")));
}

function formatCount(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => normalizeInvestigationText(value ?? "")).filter(Boolean))];
}
