import { storeContribution, type ContributionFileUpload } from "../../../lib/server/contributionStorage.ts";
import {
  validateContributionDraft,
  type UserContributionDraft,
} from "../../../lib/data/userContributions.ts";

export async function POST(request: Request) {
  const form = await request.formData();
  const files = getFiles(form);
  const draft: Omit<UserContributionDraft, "attachments"> = {
    type: formString(form, "type"),
    title: formString(form, "title"),
    jurisdiction: formString(form, "jurisdiction"),
    explanation: formString(form, "explanation"),
    publicSourceUrl: formString(form, "publicSourceUrl"),
    relatedCase: formString(form, "relatedCase"),
    officialIdentifier: formString(form, "officialIdentifier"),
    organization: formString(form, "organization"),
    namedEntity: formString(form, "namedEntity"),
    amountOrDate: formString(form, "amountOrDate"),
    approximateLocation: formString(form, "approximateLocation"),
    capturedAt: formString(form, "capturedAt"),
    missingVerification: formString(form, "missingVerification"),
    contactName: formString(form, "contactName"),
    contactEmail: formString(form, "contactEmail"),
    sourcePermissionConfirmed: formBoolean(form, "sourcePermissionConfirmed"),
    reviewConfirmed: formBoolean(form, "reviewConfirmed"),
  };
  const validation = validateContributionDraft({
    ...draft,
    attachments: files.map((file) => ({
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    })),
  });

  if (!validation.valid) {
    return Response.json({ ok: false, errors: validation.errors }, { status: 400 });
  }

  try {
    const uploads = await Promise.all(files.map(toUpload));
    const result = await storeContribution({ draft, files: uploads });
    return Response.json(
      {
        ok: true,
        submissionId: result.contribution.id,
        status: result.contribution.status,
        storageMode: result.storageMode,
      },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: "submission_failed",
        message: error instanceof Error ? error.message : "No se pudo recibir el aporte.",
      },
      { status: 500 },
    );
  }
}

function formString(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function formBoolean(form: FormData, key: string): boolean {
  return formString(form, key) === "true";
}

function getFiles(form: FormData): File[] {
  return form
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

async function toUpload(file: File): Promise<ContributionFileUpload> {
  const buffer = await file.arrayBuffer();
  return {
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    bytes: new Uint8Array(buffer),
  };
}
