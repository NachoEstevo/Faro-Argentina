import type { CaseCollectionPack } from "@/lib/data/caseCollections";
import type { StaticExportArtifact } from "@/lib/data/staticExportArtifacts";

export interface CollectionExportManifest {
  packType: "faro_collection_export_manifest";
  generatedAt: string;
  reason: "function_payload_guard";
  artifact: StaticExportArtifact | null;
  filters: CaseCollectionPack["filters"];
  stats: CaseCollectionPack["stats"];
  sourceIds: string[];
  caseEvidenceLinks: Array<{
    caseId: string;
    countryCode: string;
    title: string;
    sourceId: string;
    href: string;
  }>;
  caveats: string[];
  verificationSteps: string[];
}

export function buildCollectionExportManifest(
  pack: CaseCollectionPack,
  artifact: StaticExportArtifact | null,
): CollectionExportManifest {
  return {
    packType: "faro_collection_export_manifest",
    generatedAt: new Date().toISOString(),
    reason: "function_payload_guard",
    artifact,
    filters: pack.filters,
    stats: pack.stats,
    sourceIds: pack.sourceIds,
    caseEvidenceLinks: pack.cases.map((caseFile) => ({
      caseId: caseFile.id,
      countryCode: caseFile.countryCode,
      title: caseFile.title,
      sourceId: caseFile.receipt.sourceId,
      href: `/api/export/${encodeURIComponent(caseFile.id)}`,
    })),
    caveats: [
      ...pack.caveats,
      "Este endpoint devuelve un indice porque el paquete completo excede el limite de respuesta de Vercel Functions. Usar artifact.href cuando exista.",
    ],
    verificationSteps: pack.verificationSteps,
  };
}
