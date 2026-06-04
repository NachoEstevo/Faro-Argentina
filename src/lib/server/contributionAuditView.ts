import {
  listContributionAuditEvents,
  type ContributionAuditAction,
  type ContributionAuditEvent,
  type ListContributionAuditEventsInput,
} from "./contributionAuditDb.ts";

export interface ContributionAuditViewEvent {
  id: string;
  submissionId: string | null;
  action: ContributionAuditAction;
  actionLabel: string;
  actorName: string;
  actorRole: string;
  targetLabel: string;
  metadataSummary: string[];
  createdAt: string;
}

export async function listContributionAuditViewEvents(
  input: ListContributionAuditEventsInput = {},
): Promise<ContributionAuditViewEvent[]> {
  const events = await listContributionAuditEvents(input);
  return events.map(toContributionAuditViewEvent);
}

export function toContributionAuditViewEvent(event: ContributionAuditEvent): ContributionAuditViewEvent {
  return {
    id: event.id,
    submissionId: event.submissionId,
    action: event.action,
    actionLabel: auditActionLabel(event.action),
    actorName: event.actorName,
    actorRole: event.actorRole,
    targetLabel: auditTargetLabel(event),
    metadataSummary: summarizeAuditMetadata(event.metadata),
    createdAt: event.createdAt,
  };
}

export function auditActionLabel(action: ContributionAuditAction): string {
  if (action === "admin_inbox_opened") return "Bandeja abierta";
  if (action === "review_status_changed") return "Estado de revisión cambiado";
  if (action === "review_link_created") return "Vínculo privado creado";
  if (action === "attachment_opened") return "Adjunto privado abierto";
  if (action === "contribution_archived") return "Aporte archivado";
  if (action === "contribution_removed_from_inbox") return "Aporte removido de bandeja";
  if (action === "contribution_restored_to_inbox") return "Aporte restaurado";
  if (action === "curated_candidate_created") return "Candidato curado creado";
  if (action === "curated_evidence_published") return "Evidencia curada publicada";
  if (action === "curated_evidence_withdrawn") return "Evidencia curada retirada";
  return action;
}

function auditTargetLabel(event: ContributionAuditEvent): string {
  if (!event.targetType && !event.targetId) return "Sin destino";
  return [event.targetType, event.targetId].filter(Boolean).join(" · ");
}

function summarizeAuditMetadata(metadata: Record<string, unknown>): string[] {
  const safeEntries = [
    formatMetadata("storageMode", "storage", metadata.storageMode),
    formatMetadata("submissionCount", "aportes", metadata.submissionCount),
    formatMetadata("status", "estado", metadata.status),
    formatMetadata("state", "bandeja", metadata.state),
    formatMetadata("targetLabel", "destino", metadata.targetLabel),
    formatMetadata("expedienteId", "expediente", metadata.expedienteId),
    formatMetadata("title", "título", metadata.title),
    formatMetadata("mimeType", "archivo", metadata.mimeType),
    formatMetadata("sizeBytes", "tamaño", metadata.sizeBytes),
  ].filter(Boolean) as string[];
  return safeEntries.slice(0, 5);
}

function formatMetadata(key: string, label: string, value: unknown): string | null {
  void key;
  if (typeof value === "string" && value.trim()) return `${label}: ${value.trim().slice(0, 140)}`;
  if (typeof value === "number" && Number.isFinite(value)) return `${label}: ${value.toLocaleString("es-AR")}`;
  return null;
}
