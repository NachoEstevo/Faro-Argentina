export const CONTRIBUTION_TYPES = [
  "suggest_lead",
  "add_source",
  "correct_data",
  "add_photo",
  "report_issue",
] as const;

export type ContributionType = (typeof CONTRIBUTION_TYPES)[number];

export const CONTRIBUTION_REVIEW_STATUSES = [
  "submitted",
  "needs_more_info",
  "accepted_for_review",
  "approved",
  "rejected",
] as const;

export type ContributionReviewStatus = (typeof CONTRIBUTION_REVIEW_STATUSES)[number];

export interface ContributionAttachmentDraft {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  note?: string;
}

export interface UserContributionDraft {
  type: string;
  title: string;
  jurisdiction: string;
  explanation: string;
  publicSourceUrl?: string;
  relatedCase?: string;
  officialIdentifier?: string;
  organization?: string;
  namedEntity?: string;
  amountOrDate?: string;
  approximateLocation?: string;
  capturedAt?: string;
  missingVerification?: string;
  contactName?: string;
  contactEmail?: string;
  sourcePermissionConfirmed: boolean;
  reviewConfirmed: boolean;
  attachments?: readonly ContributionAttachmentDraft[];
}

export interface ContributionValidationError {
  field: string;
  message: string;
}

export interface ContributionValidationResult {
  valid: boolean;
  errors: ContributionValidationError[];
}

export interface UserContributionAttachment {
  id: string;
  originalFilename: string;
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  note?: string;
  status: "private_review";
}

export interface UserContribution {
  id: string;
  type: ContributionType;
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
  sourcePermissionConfirmed: true;
  reviewConfirmed: true;
  status: ContributionReviewStatus;
  createdAt: string;
  attachments: UserContributionAttachment[];
}

export interface BuildContributionOptions {
  id: string;
  createdAt: string;
  attachmentKeys?: string[];
}

export const MAX_CONTRIBUTION_ATTACHMENTS = 5;
export const MAX_CONTRIBUTION_ATTACHMENT_BYTES = 10_000_000;
export const ACCEPTED_CONTRIBUTION_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

const unsafeCopyPattern = /\b(corrup(?:to|ta|cion|cion)?|fraude|fraudulento|culpable|delito|criminal|robo|ladron(?:es)?|coima)\b/i;

export function validateContributionDraft(draft: UserContributionDraft): ContributionValidationResult {
  const errors: ContributionValidationError[] = [];
  const attachments = draft.attachments ?? [];
  const type = normalizeString(draft.type);
  const title = normalizeString(draft.title);
  const jurisdiction = normalizeString(draft.jurisdiction);
  const explanation = normalizeString(draft.explanation);
  const publicSourceUrl = normalizeString(draft.publicSourceUrl);
  const relatedCase = normalizeString(draft.relatedCase);
  const approximateLocation = normalizeString(draft.approximateLocation);

  if (!isContributionType(type)) {
    errors.push({ field: "type", message: "Selecciona un tipo de aporte valido." });
  }
  if (!title) {
    errors.push({ field: "title", message: "Agrega un titulo neutral." });
  } else if (hasUnsafeCopy(title)) {
    errors.push({ field: "title", message: "Usa lenguaje neutral en el titulo." });
  }
  if (!jurisdiction) {
    errors.push({ field: "jurisdiction", message: "Indica el pais o jurisdiccion." });
  }
  if (!explanation) {
    errors.push({ field: "explanation", message: "Contanos que dato aporta o que deberiamos revisar." });
  } else if (hasUnsafeCopy(explanation)) {
    errors.push({ field: "explanation", message: "Usa lenguaje neutral. Faro revisa fuentes, no publica acusaciones." });
  }
  if (publicSourceUrl && !isValidHttpUrl(publicSourceUrl)) {
    errors.push({ field: "publicSourceUrl", message: "El link publico debe ser una URL valida." });
  }
  if (!hasReviewAnchor({ publicSourceUrl, relatedCase, approximateLocation, attachments })) {
    errors.push({
      field: "reviewAnchor",
      message: "Necesitamos un link publico, un caso relacionado, una ubicacion o un archivo con contexto para poder revisar.",
    });
  }
  if (!draft.sourcePermissionConfirmed) {
    errors.push({
      field: "sourcePermissionConfirmed",
      message: "Confirma que la informacion viene de fuentes publicas o material propio autorizado.",
    });
  }
  if (!draft.reviewConfirmed) {
    errors.push({
      field: "reviewConfirmed",
      message: "Confirma que el aporte entra a revision antes de usarse.",
    });
  }
  if (attachments.length > MAX_CONTRIBUTION_ATTACHMENTS) {
    errors.push({
      field: "attachments",
      message: `Subi hasta ${MAX_CONTRIBUTION_ATTACHMENTS} archivos por aporte.`,
    });
  }
  attachments.forEach((attachment, index) => {
    const mimeType = normalizeString(attachment.mimeType).toLowerCase();
    if (!ACCEPTED_CONTRIBUTION_ATTACHMENT_TYPES.includes(mimeType as AcceptedAttachmentType)) {
      errors.push({
        field: `attachments.${index}`,
        message: "Solo aceptamos JPG, PNG, WebP o PDF para revision privada.",
      });
      return;
    }
    if (!Number.isFinite(attachment.sizeBytes) || attachment.sizeBytes <= 0) {
      errors.push({
        field: `attachments.${index}`,
        message: "El archivo esta vacio o no se pudo leer.",
      });
      return;
    }
    if (attachment.sizeBytes > MAX_CONTRIBUTION_ATTACHMENT_BYTES) {
      errors.push({
        field: `attachments.${index}`,
        message: "Cada archivo debe pesar 10 MB o menos.",
      });
    }
  });

  return { valid: errors.length === 0, errors };
}

export function buildUserContribution(
  draft: UserContributionDraft,
  options: BuildContributionOptions,
): UserContribution {
  const validation = validateContributionDraft(draft);
  if (!validation.valid) {
    throw new Error(`Invalid contribution: ${validation.errors.map((error) => error.field).join(", ")}`);
  }
  const attachments = draft.attachments ?? [];
  const attachmentKeys = options.attachmentKeys ?? [];
  return {
    id: options.id,
    type: normalizeString(draft.type) as ContributionType,
    title: normalizeString(draft.title),
    jurisdiction: normalizeString(draft.jurisdiction),
    explanation: normalizeString(draft.explanation),
    publicSourceUrl: optionalString(draft.publicSourceUrl),
    relatedCase: optionalString(draft.relatedCase),
    officialIdentifier: optionalString(draft.officialIdentifier),
    organization: optionalString(draft.organization),
    namedEntity: optionalString(draft.namedEntity),
    amountOrDate: optionalString(draft.amountOrDate),
    approximateLocation: optionalString(draft.approximateLocation),
    capturedAt: optionalString(draft.capturedAt),
    missingVerification: optionalString(draft.missingVerification),
    contactName: optionalString(draft.contactName),
    contactEmail: optionalString(draft.contactEmail),
    sourcePermissionConfirmed: true,
    reviewConfirmed: true,
    status: "submitted",
    createdAt: options.createdAt,
    attachments: attachments.map((attachment, index) => ({
      id: `ATT-${String(index + 1).padStart(3, "0")}`,
      originalFilename: normalizeFilename(attachment.filename),
      objectKey: attachmentKeys[index] ?? "",
      mimeType: normalizeString(attachment.mimeType).toLowerCase(),
      sizeBytes: attachment.sizeBytes,
      uploadedAt: options.createdAt,
      note: optionalString(attachment.note) ?? undefined,
      status: "private_review",
    })),
  };
}

export function isContributionType(value: string): value is ContributionType {
  return CONTRIBUTION_TYPES.includes(value as ContributionType);
}

export function extensionForAttachment(filename: string, mimeType: string): string {
  const normalizedName = normalizeFilename(filename).toLowerCase();
  const extension = normalizedName.match(/\.([a-z0-9]{2,5})$/)?.[1];
  if (extension && ["jpg", "jpeg", "png", "webp", "pdf"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }
  switch (mimeType.toLowerCase()) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}

function hasReviewAnchor({
  publicSourceUrl,
  relatedCase,
  approximateLocation,
  attachments,
}: {
  publicSourceUrl: string;
  relatedCase: string;
  approximateLocation: string;
  attachments: readonly ContributionAttachmentDraft[];
}): boolean {
  if (publicSourceUrl || relatedCase) return true;
  return attachments.length > 0 && Boolean(approximateLocation);
}

function hasUnsafeCopy(value: string): boolean {
  return unsafeCopyPattern.test(stripAccents(value));
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function optionalString(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeFilename(value: string): string {
  return normalizeString(value).replace(/[^a-zA-Z0-9._-]+/g, "-") || "archivo";
}

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

type AcceptedAttachmentType = (typeof ACCEPTED_CONTRIBUTION_ATTACHMENT_TYPES)[number];
