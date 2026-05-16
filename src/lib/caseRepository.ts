import payload from "@/data/argentinaWorkCases.json";
import type { ArgentinaWorkCase } from "@/lib/data/argentinaWorks";

export interface CaseDataset {
  generatedAt: string;
  source: {
    sourceId: string;
    sourceName: string;
    sourceUrl: string;
    filePath: string;
    fileHash: string;
  };
  stats: {
    rawRows: number;
    caseFiles: number;
    mapReadyCases: number;
  };
  cases: ArgentinaWorkCase[];
}

export interface EvidencePack {
  packType: "faro_evidence_pack";
  generatedAt: string;
  caseFile: ArgentinaWorkCase;
  receipt: ArgentinaWorkCase["receipt"];
  caveats: string[];
  verificationSteps: string[];
}

export const argentinaWorkDataset = payload as CaseDataset;

export function getCaseById(id: string): ArgentinaWorkCase | null {
  return argentinaWorkDataset.cases.find((caseFile) => caseFile.id === id) ?? null;
}

export function buildEvidencePack(caseFile: ArgentinaWorkCase): EvidencePack {
  return {
    packType: "faro_evidence_pack",
    generatedAt: new Date().toISOString(),
    caseFile,
    receipt: caseFile.receipt,
    caveats: caseFile.caveats,
    verificationSteps: [
      "Abrir la fuente oficial indicada en el receipt.",
      "Buscar el numero de obra y procedimiento en el dataset original.",
      "Cruzar con contratos, pagos y avance fisico antes de publicar conclusiones.",
      "Si se usa Sentinel-2, revisar nubes, fecha de escena y resolucion antes de inferir avance.",
    ],
  };
}
