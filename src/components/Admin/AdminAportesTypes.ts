export type ReviewStatus = "submitted" | "needs_more_info" | "accepted_for_review" | "approved" | "rejected";
export type ReviewLinkTarget = "case" | "workspace";

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
  contactName: string | null;
  contactEmail: string | null;
  status: ReviewStatus;
  createdAt: string;
  attachments: Attachment[];
  reviewTrail?: Array<{ id: string; status: ReviewStatus; note: string; reviewerName: string; createdAt: string }>;
  reviewLinks?: ReviewLink[];
}

export interface InboxPayload {
  storageMode: "local" | "r2";
  stats: Record<ReviewStatus | "total", number>;
  submissions: Contribution[];
}

export const statusOptions: Array<{ value: ReviewStatus; label: string }> = [
  { value: "submitted", label: "Revisar" },
  { value: "needs_more_info", label: "Necesita más info" },
  { value: "accepted_for_review", label: "En revisión" },
  { value: "approved", label: "Aprobado para cargar" },
  { value: "rejected", label: "Descartado" },
];

export function statusLabel(status: ReviewStatus): string {
  return statusOptions.find((option) => option.value === status)?.label ?? "Revisar";
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

export function formatDate(value: string): string {
  return value.slice(0, 10);
}

export function formatBytes(bytes: number): string {
  return bytes < 1_000_000 ? `${Math.max(1, Math.round(bytes / 1000))} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`;
}
