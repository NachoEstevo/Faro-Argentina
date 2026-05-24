export type ReviewStatus = "submitted" | "needs_more_info" | "accepted_for_review" | "approved" | "rejected";
export type ReviewLinkTarget = "case" | "workspace";
export type ContributionPrivacyMode = "anonymous" | "contact";

export interface Attachment {
  id: string;
  originalFilename: string;
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ReviewLink {
  id: string;
  targetType: ReviewLinkTarget;
  targetId: string;
  targetLabel: string;
  note: string;
  linkedBy: string;
  createdAt: string;
}

export interface Contribution {
  id: string;
  type: string;
  title: string;
  jurisdiction: string;
  explanation: string;
  publicSourceUrl: string | null;
  relatedCase: string | null;
  officialIdentifier: string | null;
  organization: string | null;
  namedEntity: string | null;
  amountOrDate: string | null;
  approximateLocation: string | null;
  capturedAt: string | null;
  missingVerification: string | null;
  privacyMode?: ContributionPrivacyMode;
  contactName: string | null;
  contactEmail: string | null;
  status: ReviewStatus;
  createdAt: string;
  attachments: Attachment[];
  reviewTrail?: Array<{ id: string; status: ReviewStatus; note: string; reviewerName: string; createdAt: string }>;
  reviewLinks?: ReviewLink[];
}

export interface InboxPayload {
  storageMode: "local" | "r2" | "neon";
  stats: Record<ReviewStatus | "total", number>;
  submissions: Contribution[];
}

export const statusWorkflow: Array<{
  value: ReviewStatus;
  label: string;
  actionLabel: string;
  description: string;
}> = [
  {
    value: "submitted",
    label: "Recibido",
    actionLabel: "Marcar recibido",
    description: "Entrada nueva, todavía sin decisión interna.",
  },
  {
    value: "accepted_for_review",
    label: "En revisión",
    actionLabel: "Tomar en revisión",
    description: "El equipo está verificando fuente, contexto y uso posible.",
  },
  {
    value: "needs_more_info",
    label: "Necesita más info",
    actionLabel: "Pedir más info",
    description: "Falta contexto, fuente o precisión antes de avanzar.",
  },
  {
    value: "approved",
    label: "Aprobado para cargar",
    actionLabel: "Aprobar para cargar",
    description: "Listo para vincular o cargar manualmente, sin publicación automática.",
  },
  {
    value: "rejected",
    label: "Descartado",
    actionLabel: "Descartar aporte",
    description: "No se usará en Faro con la información disponible.",
  },
];

export const statusOptions = statusWorkflow.map(({ value, label }) => ({ value, label }));

export function statusLabel(status: ReviewStatus): string {
  return statusWorkflow.find((option) => option.value === status)?.label ?? "Recibido";
}

export function sortContributionsForReview(submissions: Contribution[]): Contribution[] {
  return [...submissions].sort((left, right) => {
    const statusDelta = statusPriority(left.status) - statusPriority(right.status);
    if (statusDelta !== 0) return statusDelta;
    return right.createdAt.localeCompare(left.createdAt);
  });
}

export function buildClientStats(submissions: Contribution[]): Record<ReviewStatus | "total", number> {
  return {
    total: submissions.length,
    submitted: submissions.filter((item) => item.status === "submitted").length,
    needs_more_info: submissions.filter((item) => item.status === "needs_more_info").length,
    accepted_for_review: submissions.filter((item) => item.status === "accepted_for_review").length,
    approved: submissions.filter((item) => item.status === "approved").length,
    rejected: submissions.filter((item) => item.status === "rejected").length,
  };
}

function statusPriority(status: ReviewStatus): number {
  const index = statusWorkflow.findIndex((option) => option.value === status);
  return index === -1 ? statusWorkflow.length : index;
}

export function formatDate(value: string): string {
  return value.slice(0, 10);
}

export function formatBytes(bytes: number): string {
  return bytes < 1_000_000 ? `${Math.max(1, Math.round(bytes / 1000))} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`;
}
