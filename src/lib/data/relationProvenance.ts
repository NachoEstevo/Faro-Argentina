import {
  buildSupplierAliasKey,
  normalizeDocument,
  type SupplierIdentity,
} from "./entityResolution.ts";

export type RelationProvenanceKind =
  | "exact_cuit"
  | "same_agency"
  | "same_work_number"
  | "normalized_name"
  | "judicial_context"
  | "user_suggested";

export type RelationConfidence = "low" | "medium" | "high";

export interface RelationProvenance {
  kind: RelationProvenanceKind;
  label: string;
  confidence: RelationConfidence;
  caveat: string;
}

export interface RelationCaseInput {
  countryCode: string;
  supplierName?: string | null;
  supplierDocument?: string | null;
  agencyName?: string | null;
  agencyCode?: string | null;
  workNumber?: string | null;
  caseType?: string | null;
}

const RELATION_PROVENANCE: Record<RelationProvenanceKind, RelationProvenance> = {
  exact_cuit: {
    kind: "exact_cuit",
    label: "CUIT exacto",
    confidence: "high",
    caveat: "Coincidencia por identificador fiscal declarado; no prueba por si sola una relacion fuera de los registros comparados.",
  },
  same_agency: {
    kind: "same_agency",
    label: "Mismo organismo",
    confidence: "medium",
    caveat: "Compartir organismo ayuda a priorizar revision; no confirma coordinacion ni una relacion sustantiva entre expedientes.",
  },
  same_work_number: {
    kind: "same_work_number",
    label: "Mismo numero de obra",
    confidence: "high",
    caveat: "El numero de obra puede conectar registros de una misma obra; requiere abrir los receipts para confirmar alcance y etapa.",
  },
  normalized_name: {
    kind: "normalized_name",
    label: "Nombre normalizado",
    confidence: "low",
    caveat: "La coincidencia por nombre normalizado puede unir homonimos o variantes; verificar CUIT, domicilio o registro oficial antes de citar.",
  },
  judicial_context: {
    kind: "judicial_context",
    label: "Fuente judicial contextual",
    confidence: "medium",
    caveat: "La fuente judicial aporta contexto documental; no prueba por si sola nada sobre otros expedientes Faro.",
  },
  user_suggested: {
    kind: "user_suggested",
    label: "Sugerido por usuario",
    confidence: "low",
    caveat: "La relacion fue cargada como hipotesis de trabajo privada y requiere revision antes de cualquier uso publico.",
  },
};

export function buildRelationProvenance(kind: RelationProvenanceKind): RelationProvenance {
  return { ...RELATION_PROVENANCE[kind] };
}

export function buildSupplierRelationProvenance(identity: SupplierIdentity): RelationProvenance {
  return buildRelationProvenance(identity.method === "document" ? "exact_cuit" : "normalized_name");
}

export function inferCaseRelationProvenance(
  left: RelationCaseInput,
  right: RelationCaseInput,
): RelationProvenance[] {
  const provenances: RelationProvenance[] = [];
  const leftDocument = normalizeDocument(left.supplierDocument);
  const rightDocument = normalizeDocument(right.supplierDocument);
  const leftWorkNumber = normalizeComparable(left.workNumber);
  const rightWorkNumber = normalizeComparable(right.workNumber);
  const leftAgency = normalizeComparable(left.agencyName ?? left.agencyCode);
  const rightAgency = normalizeComparable(right.agencyName ?? right.agencyCode);
  const leftAlias = buildSupplierAliasKey(left.supplierName);
  const rightAlias = buildSupplierAliasKey(right.supplierName);

  if (leftDocument && leftDocument === rightDocument) {
    provenances.push(buildRelationProvenance("exact_cuit"));
  } else if (leftAlias && leftAlias === rightAlias) {
    provenances.push(buildRelationProvenance("normalized_name"));
  }

  if (leftWorkNumber && leftWorkNumber === rightWorkNumber) {
    provenances.push(buildRelationProvenance("same_work_number"));
  }

  if (leftAgency && leftAgency === rightAgency) {
    provenances.push(buildRelationProvenance("same_agency"));
  }

  if (provenances.length > 0 && (isJudicialContext(left.caseType) || isJudicialContext(right.caseType))) {
    provenances.push(buildRelationProvenance("judicial_context"));
  }

  return dedupeProvenances(provenances);
}

function dedupeProvenances(provenances: RelationProvenance[]): RelationProvenance[] {
  const seen = new Set<RelationProvenanceKind>();
  return provenances.filter((provenance) => {
    if (seen.has(provenance.kind)) return false;
    seen.add(provenance.kind);
    return true;
  });
}

function normalizeComparable(value: string | null | undefined): string | null {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
  return normalized || null;
}

function isJudicialContext(caseType: string | null | undefined): boolean {
  return caseType === "judicial_context" ||
    caseType === "historical_public_work" ||
    caseType === "supplier_judicial_context";
}
