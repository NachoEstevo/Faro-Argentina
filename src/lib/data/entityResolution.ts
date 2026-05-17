export type SupplierIdentityMethod = "document" | "normalized_name";
export type SupplierIdentityConfidence = "high" | "low";

export interface SupplierIdentityInput {
  countryCode: string;
  supplierName?: string | null | undefined;
  supplierDocument?: string | null | undefined;
}

export interface SupplierIdentity {
  key: string;
  method: SupplierIdentityMethod;
  confidence: SupplierIdentityConfidence;
  label: string;
  document: string | null;
  normalizedName: string | null;
  aliasKey: string | null;
}

export function resolveSupplierIdentity(input: SupplierIdentityInput): SupplierIdentity | null {
  const countryCode = clean(input.countryCode).toUpperCase();
  const document = normalizeDocument(input.supplierDocument);
  const normalizedName = normalizeSupplierName(input.supplierName);
  const aliasKey = buildSupplierAliasKey(input.supplierName);
  const label = [clean(input.supplierName), clean(input.supplierDocument)].filter(Boolean).join(" / ");

  if (document) {
    return {
      key: `supplier:${countryCode}:doc:${document}`,
      method: "document",
      confidence: "high",
      label: label || document,
      document,
      normalizedName,
      aliasKey,
    };
  }

  if (aliasKey) {
    return {
      key: `supplier:${countryCode}:name:${aliasKey}`,
      method: "normalized_name",
      confidence: "low",
      label: label || aliasKey,
      document: null,
      normalizedName,
      aliasKey,
    };
  }

  return null;
}

export function buildSupplierAliasKey(value: string | null | undefined): string | null {
  const normalized = normalizeSupplierName(value)
    ?.replace(/\bS A S\b/g, " ")
    .replace(/\bS A\b/g, " ")
    .replace(/\bS R L\b/g, " ")
    .replace(/\b(SA|SAS|SRL|SACI|SCA|UTE|SPA|LTDA|EIRL)\b/g, " ")
    .replace(/\b(SOCIEDAD|ANONIMA|RESPONSABILIDAD|LIMITADA|GESTION|INVERSIONES)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized && normalized.length >= 6 ? normalized : null;
}

export function normalizeSupplierName(value: string | null | undefined): string | null {
  const normalized = clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeDocument(value: string | null | undefined): string | null {
  const normalized = clean(value)
    .toUpperCase()
    .replace(/[^0-9K]/g, "");
  return normalized.length > 0 ? normalized : null;
}

function clean(value: string | null | undefined): string {
  return String(value ?? "").trim();
}
