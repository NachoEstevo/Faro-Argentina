export type ReviewStatus =
  | "submitted"
  | "accepted_for_review"
  | "needs_more_info"
  | "approved_for_investigation"
  | "rejected";
export type LegacyReviewStatus = "approved";
export type PublicationStatus = "private" | "candidate" | "published_curated" | "withdrawn";
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
  status: ReviewStatus | LegacyReviewStatus;
  publicationStatus?: PublicationStatus;
  createdAt: string;
  attachments: Attachment[];
  reviewTrail?: Array<{
    id: string;
    status: ReviewStatus | LegacyReviewStatus;
    note: string;
    reviewerName: string;
    createdAt: string;
  }>;
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
    value: "approved_for_investigation",
    label: "Aprobado para investigar",
    actionLabel: "Aprobar para investigar",
    description: "Útil como material privado de trabajo; no se publica automáticamente.",
  },
  {
    value: "rejected",
    label: "Descartado",
    actionLabel: "Descartar aporte",
    description: "No se usará en Faro con la información disponible.",
  },
];

export const statusOptions = statusWorkflow.map(({ value, label }) => ({ value, label }));

export const publicationWorkflow: Array<{
  value: PublicationStatus;
  label: string;
  description: string;
}> = [
  {
    value: "private",
    label: "Privado",
    description: "Disponible solo para revisión interna.",
  },
  {
    value: "candidate",
    label: "Candidato a publicación",
    description: "Puede convertirse en evidencia curada si completa checklist; todavía no se muestra públicamente.",
  },
  {
    value: "published_curated",
    label: "Curado publicado",
    description: "Visible públicamente como aporte curado, separado de evidencia oficial.",
  },
  {
    value: "withdrawn",
    label: "Retirado",
    description: "Ya no se muestra públicamente; conserva trazabilidad interna.",
  },
];

export function normalizeReviewStatus(status: ReviewStatus | LegacyReviewStatus): ReviewStatus {
  return status === "approved" ? "approved_for_investigation" : status;
}

export function statusLabel(status: ReviewStatus | LegacyReviewStatus): string {
  const normalized = normalizeReviewStatus(status);
  return statusWorkflow.find((option) => option.value === normalized)?.label ?? "Recibido";
}

export function publicationLabel(status: PublicationStatus | undefined): string {
  return publicationWorkflow.find((option) => option.value === (status ?? "private"))?.label ?? "Privado";
}

export function sortContributionsForReview(submissions: Contribution[]): Contribution[] {
  return [...submissions].sort((left, right) => {
    const statusDelta = statusPriority(normalizeReviewStatus(left.status)) -
      statusPriority(normalizeReviewStatus(right.status));
    if (statusDelta !== 0) return statusDelta;
    return right.createdAt.localeCompare(left.createdAt);
  });
}

export function buildClientStats(submissions: Contribution[]): Record<ReviewStatus | "total", number> {
  return {
    total: submissions.length,
    submitted: submissions.filter((item) => normalizeReviewStatus(item.status) === "submitted").length,
    accepted_for_review: submissions.filter((item) => normalizeReviewStatus(item.status) === "accepted_for_review").length,
    needs_more_info: submissions.filter((item) => normalizeReviewStatus(item.status) === "needs_more_info").length,
    approved_for_investigation: submissions.filter((item) =>
      normalizeReviewStatus(item.status) === "approved_for_investigation"
    ).length,
    rejected: submissions.filter((item) => normalizeReviewStatus(item.status) === "rejected").length,
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
