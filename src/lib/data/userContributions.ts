export const CONTRIBUTION_TYPES = [
  "add_source",
  "correct_data",
  "add_photo",
] as const;

export type ContributionType = (typeof CONTRIBUTION_TYPES)[number];

export const CONTRIBUTION_REVIEW_STATUSES = [
  "submitted",
  "accepted_for_review",
  "needs_more_info",
  "approved_for_investigation",
  "rejected",
] as const;

export type ContributionReviewStatus = (typeof CONTRIBUTION_REVIEW_STATUSES)[number];
export type LegacyContributionReviewStatus = "approved";

export const CONTRIBUTION_PUBLICATION_STATUSES = [
  "private",
  "candidate",
  "published_curated",
  "withdrawn",
] as const;

export type ContributionPublicationStatus = (typeof CONTRIBUTION_PUBLICATION_STATUSES)[number];

export const CONTRIBUTION_PRIVACY_MODES = ["anonymous", "contact"] as const;

export type ContributionPrivacyMode = (typeof CONTRIBUTION_PRIVACY_MODES)[number];

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
  privacyMode?: string;
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
  privacyMode: ContributionPrivacyMode;
  contactName: string | null;
  contactEmail: string | null;
  sourcePermissionConfirmed: true;
  reviewConfirmed: true;
  status: ContributionReviewStatus | LegacyContributionReviewStatus;
  publicationStatus: ContributionPublicationStatus;
  createdAt: string;
  attachments: UserContributionAttachment[];
}

export interface CuratedContributionEvidence {
  id: string;
  submissionId: string;
  expedienteId: string;
  status: Extract<ContributionPublicationStatus, "candidate" | "published_curated" | "withdrawn">;
  title: string;
  caption: string;
  caveat: string;
  sourceLabel: string;
  permissionNote: string;
  reviewedByName: string;
  promotedByName: string;
  promotedAt: string;
  withdrawnAt: string | null;
  withdrawnByName: string | null;
  internalNote: string;
}

export interface PublicCuratedContributionEvidence {
  id: string;
  title: string;
  caption: string;
  caveat: string;
  sourceLabel: string;
  permissionNote: string;
  reviewedByName: string;
  promotedAt: string;
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
  const amountOrDate = normalizeString(draft.amountOrDate);
  const approximateLocation = normalizeString(draft.approximateLocation);
  const missingVerification = normalizeString(draft.missingVerification);
  const contactName = normalizeString(draft.contactName);
  const contactEmail = normalizeString(draft.contactEmail);
  const privacyMode = resolvePrivacyMode(draft.privacyMode, contactName, contactEmail);

  if (!isContributionType(type)) {
    errors.push({ field: "type", message: "Selecciona un tipo de aporte valido." });
  }
  if (!privacyMode) {
    errors.push({ field: "privacyMode", message: "Selecciona si queres enviar el aporte sin contacto o con contacto." });
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
  if (contactEmail && !isValidEmail(contactEmail)) {
    errors.push({ field: "contactEmail", message: "El email de contacto no parece valido." });
  }
  if (privacyMode === "contact" && !contactEmail) {
    errors.push({
      field: "contactEmail",
      message: "Para permitir contacto, agrega un email o elegi enviar sin contacto.",
    });
  }
  if (privacyMode === "anonymous" && (contactName || contactEmail)) {
    errors.push({
      field: "privacyMode",
      message: "Para enviar sin contacto, deja nombre y email vacios.",
    });
  }
  validateTypeSpecificFields({
    errors,
    type,
    publicSourceUrl,
    relatedCase,
    amountOrDate,
    approximateLocation,
    missingVerification,
    attachments,
  });
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
  const privacyMode = resolvePrivacyMode(draft.privacyMode, draft.contactName, draft.contactEmail) ?? "anonymous";
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
    privacyMode,
    contactName: privacyMode === "anonymous" ? null : optionalString(draft.contactName),
    contactEmail: privacyMode === "anonymous" ? null : optionalString(draft.contactEmail),
    sourcePermissionConfirmed: true,
    reviewConfirmed: true,
    status: "submitted",
    publicationStatus: "private",
    createdAt: options.createdAt,
    attachments: attachments.map((attachment, index) => ({
      id: `ATT-${String(index + 1).padStart(3, "0")}`,
      originalFilename: privacyMode === "anonymous"
        ? anonymousFilename(index, attachment.filename, attachment.mimeType)
        : normalizeFilename(attachment.filename),
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

export function isContributionPrivacyMode(value: string): value is ContributionPrivacyMode {
  return CONTRIBUTION_PRIVACY_MODES.includes(value as ContributionPrivacyMode);
}

export function isContributionReviewStatus(value: unknown): value is ContributionReviewStatus {
  return CONTRIBUTION_REVIEW_STATUSES.includes(value as ContributionReviewStatus);
}

export function isContributionPublicationStatus(value: unknown): value is ContributionPublicationStatus {
  return CONTRIBUTION_PUBLICATION_STATUSES.includes(value as ContributionPublicationStatus);
}

export function normalizeContributionReviewStatus(value: unknown): ContributionReviewStatus {
  if (value === "approved") return "approved_for_investigation";
  return isContributionReviewStatus(value) ? value : "submitted";
}

export function normalizeContributionPublicationStatus(value: unknown): ContributionPublicationStatus {
  return isContributionPublicationStatus(value) ? value : "private";
}

export function toPublicCuratedContributionEvidence(
  evidence: CuratedContributionEvidence,
): PublicCuratedContributionEvidence {
  return {
    id: evidence.id,
    title: evidence.title,
    caption: evidence.caption,
    caveat: evidence.caveat,
    sourceLabel: evidence.sourceLabel,
    permissionNote: evidence.permissionNote,
    reviewedByName: evidence.reviewedByName,
    promotedAt: evidence.promotedAt,
  };
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

function validateTypeSpecificFields({
  errors,
  type,
  publicSourceUrl,
  relatedCase,
  amountOrDate,
  approximateLocation,
  missingVerification,
  attachments,
}: {
  errors: ContributionValidationError[];
  type: string;
  publicSourceUrl: string;
  relatedCase: string;
  amountOrDate: string;
  approximateLocation: string;
  missingVerification: string;
  attachments: readonly ContributionAttachmentDraft[];
}) {
  if (type === "add_source" && !publicSourceUrl) {
    errors.push({ field: "publicSourceUrl", message: "Agrega el link oficial o publico de la fuente." });
  }
  if (type === "correct_data") {
    if (!relatedCase) {
      errors.push({ field: "relatedCase", message: "Indica el expediente o caso Faro que queres corregir." });
    }
    if (!publicSourceUrl) {
      errors.push({ field: "publicSourceUrl", message: "Agrega una fuente que respalde la correccion." });
    }
    if (!missingVerification) {
      errors.push({ field: "missingVerification", message: "Indica que campo visible deberiamos corregir." });
    }
    if (!amountOrDate) {
      errors.push({ field: "amountOrDate", message: "Agrega el valor sugerido o la correccion propuesta." });
    }
  }
  if (type === "add_photo") {
    if (!approximateLocation) {
      errors.push({ field: "approximateLocation", message: "Agrega una ubicacion aproximada para revisar el material." });
    }
    if (attachments.length === 0) {
      errors.push({ field: "attachments", message: "Subi al menos un archivo o foto para este tipo de aporte." });
    }
  }
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

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function resolvePrivacyMode(
  value: unknown,
  contactName: unknown,
  contactEmail: unknown,
): ContributionPrivacyMode | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return normalizeString(contactName) || normalizeString(contactEmail) ? "contact" : "anonymous";
  }
  return isContributionPrivacyMode(normalized) ? normalized : null;
}

function anonymousFilename(index: number, filename: string, mimeType: string): string {
  const extension = extensionForAttachment(filename, mimeType);
  return `archivo-${String(index + 1).padStart(3, "0")}.${extension}`;
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
