export type ReviewStatus =
  | "submitted"
  | "accepted_for_review"
  | "needs_more_info"
  | "approved_for_investigation"
  | "rejected";
export type LegacyReviewStatus = "approved";
export type PublicationStatus = "private" | "candidate" | "published_curated" | "withdrawn";
export type InboxState = "active" | "archived" | "removed";
export type InboxTab =
  | "active"
  | "accepted_for_review"
  | "needs_more_info"
  | "approved_for_investigation"
  | "rejected"
  | "published_curated"
  | "archived"
  | "removed";
export type ReviewLinkTarget = "case" | "workspace";
export type ContributionPrivacyMode = "anonymous" | "contact";

export interface Attachment {
  id: string;
  originalFilename: string;
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
}

export interface CuratedMedia {
  type: "image";
  url: string;
  altText: string;
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
  inboxState?: InboxState;
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
  inboxTrail?: Array<{
    id: string;
    state: InboxState;
    note: string;
    reviewerName: string;
    createdAt: string;
  }>;
  media?: CuratedMedia;
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

export function normalizeInboxState(state: InboxState | undefined): InboxState {
  return state === "archived" || state === "removed" ? state : "active";
}

export function buildAdminInboxTabs(submissions: Contribution[]): Array<{ value: InboxTab; label: string; count: number }> {
  const active = submissions.filter((item) => normalizeInboxState(item.inboxState) === "active");
  const activePrivate = active.filter((item) => (item.publicationStatus ?? "private") !== "published_curated");
  return [
    {
      value: "active",
      label: "Activos",
      count: activePrivate.filter((item) =>
        !["rejected"].includes(normalizeReviewStatus(item.status))
      ).length,
    },
    {
      value: "accepted_for_review",
      label: "En revisión",
      count: activePrivate.filter((item) => normalizeReviewStatus(item.status) === "accepted_for_review").length,
    },
    {
      value: "needs_more_info",
      label: "Necesita info",
      count: activePrivate.filter((item) => normalizeReviewStatus(item.status) === "needs_more_info").length,
    },
    {
      value: "approved_for_investigation",
      label: "Aprobados",
      count: activePrivate.filter((item) => normalizeReviewStatus(item.status) === "approved_for_investigation").length,
    },
    {
      value: "rejected",
      label: "Descartados",
      count: activePrivate.filter((item) => normalizeReviewStatus(item.status) === "rejected").length,
    },
    {
      value: "published_curated",
      label: "Publicados",
      count: active.filter((item) => (item.publicationStatus ?? "private") === "published_curated").length,
    },
    {
      value: "archived",
      label: "Archivados",
      count: submissions.filter((item) => normalizeInboxState(item.inboxState) === "archived").length,
    },
    {
      value: "removed",
      label: "Removidos",
      count: submissions.filter((item) => normalizeInboxState(item.inboxState) === "removed").length,
    },
  ];
}

export function filterContributionsByInboxTab(submissions: Contribution[], tab: InboxTab): Contribution[] {
  return submissions.filter((item) => {
    const inboxState = normalizeInboxState(item.inboxState);
    const status = normalizeReviewStatus(item.status);
    const publicationStatus = item.publicationStatus ?? "private";
    if (tab === "archived" || tab === "removed") return inboxState === tab;
    if (inboxState !== "active") return false;
    if (tab === "published_curated") return publicationStatus === "published_curated";
    if (publicationStatus === "published_curated") return false;
    if (tab === "active") return status !== "rejected";
    return status === tab;
  });
}

export function getAvailableReviewActions(contribution: Contribution): Array<{
  value: ReviewStatus;
  label: string;
  disabled: boolean;
  reason?: string;
}> {
  const current = normalizeReviewStatus(contribution.status);
  return statusWorkflow
    .filter((option) => option.value !== "submitted")
    .map((option) => ({
      value: option.value,
      label: option.actionLabel,
      disabled: option.value === current,
      reason: option.value === current ? "Estado actual" : undefined,
    }));
}

export function sortContributionsForReview(submissions: Contribution[]): Contribution[] {
  return [...submissions].sort((left, right) => {
    const inboxDelta = inboxPriority(normalizeInboxState(left.inboxState)) -
      inboxPriority(normalizeInboxState(right.inboxState));
    if (inboxDelta !== 0) return inboxDelta;
    const statusDelta = statusPriority(normalizeReviewStatus(left.status)) -
      statusPriority(normalizeReviewStatus(right.status));
    if (statusDelta !== 0) return statusDelta;
    return right.createdAt.localeCompare(left.createdAt);
  });
}

function inboxPriority(state: InboxState): number {
  if (state === "active") return 0;
  if (state === "archived") return 1;
  return 2;
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
