import type { InvestigationCasePack } from "../caseRepository.ts";
import {
  buildInvestigationAggregate,
  type InvestigationAggregate,
  type InvestigationWorkspace,
} from "../data/investigationWorkspaces.ts";
import { cleanInvestigationAnalysisMarkdown } from "../data/investigationAnalysisText.ts";

export interface BuildInvestigationZipInput {
  workspace: InvestigationWorkspace;
  casePacks: InvestigationCasePack[];
  analysisMarkdown?: string;
}

export interface BuiltInvestigationZip {
  filename: string;
  mimeType: "application/zip";
  bytes: Uint8Array;
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
  crc: number;
  offset: number;
}

const textEncoder = new TextEncoder();

export function buildInvestigationZip(input: BuildInvestigationZipInput): BuiltInvestigationZip {
  const files = buildFiles(input);
  return {
    filename: `faro-investigacion-${slugify(input.workspace.title)}.zip`,
    mimeType: "application/zip",
    bytes: writeZip(files),
  };
}

function buildFiles(input: BuildInvestigationZipInput): Array<{ name: string; content: string }> {
  const analysis = cleanInvestigationAnalysisMarkdown(input.analysisMarkdown ??
    input.workspace.analyses[input.workspace.analyses.length - 1]?.markdown ??
    "");
  const aggregate = buildInvestigationAggregate(
    input.workspace,
    input.casePacks.map((pack) => pack.evidencePack),
  );
  const files: Array<{ name: string; content: string }> = [
    {
      name: "workspace.json",
      content: JSON.stringify(input.workspace, null, 2),
    },
    {
      name: "README.txt",
      content: buildReadme(input.workspace),
    },
    {
      name: "summary.md",
      content: buildSummary(input.workspace, aggregate),
    },
    {
      name: "timeline.md",
      content: buildTimeline(aggregate),
    },
    {
      name: "entities.md",
      content: buildEntities(input.workspace, aggregate),
    },
    {
      name: "notes.md",
      content: buildNotes(input.workspace),
    },
    {
      name: "analysis.md",
      content: analysis || "# Análisis\n\nTodavía no se generó análisis de trabajo.",
    },
    {
      name: "sources/links.json",
      content: JSON.stringify(input.workspace.sourceLinks, null, 2),
    },
  ];

  for (const pack of input.casePacks) {
    const safeCaseId = fileSafeId(pack.caseId);
    files.push({
      name: `cases/${safeCaseId}.expediente.json`,
      content: JSON.stringify(pack.expediente, null, 2),
    });
    files.push({
      name: `cases/${safeCaseId}.evidence.json`,
      content: JSON.stringify(pack.evidencePack, null, 2),
    });
  }

  return files;
}

function buildReadme(workspace: InvestigationWorkspace): string {
  return [
    "Carpeta de investigación Faro",
    "",
    `Título: ${workspace.title}`,
    `País: ${workspace.countryCode ?? "sin país fijo"}`,
    "",
    "Este ZIP es una carpeta privada de trabajo. No es una publicación de Faro,",
    "no prueba hechos y no reemplaza la revisión de fuentes oficiales.",
    "",
    "Archivos principales:",
    "- workspace.json: datos estructurados de la carpeta.",
    "- summary.md: resumen determinístico de expedientes, vínculos y brechas.",
    "- timeline.md: línea temporal de expedientes seleccionados.",
    "- entities.md: entidades cargadas y coincidencias detectadas.",
    "- notes.md: notas del usuario.",
    "- analysis.md: análisis de trabajo si fue generado.",
    "- cases/: expedientes y evidence packs seleccionados.",
    "- sources/links.json: links cargados manualmente.",
  ].join("\n");
}

function buildSummary(workspace: InvestigationWorkspace, aggregate: InvestigationAggregate): string {
  return [
    `# ${workspace.title}`,
    "",
    workspace.investigationQuestion ? `Pregunta de trabajo: ${workspace.investigationQuestion}` : null,
    workspace.description ? `Descripción: ${workspace.description}` : null,
    "",
    `Expedientes seleccionados: ${aggregate.caseCount}`,
    `Fuentes oficiales: ${aggregate.sourceIds.length}`,
    `Sin geometría oficial: ${formatCount(aggregate.geometryGaps.count, "expediente")}`,
    "",
    "## Motivos de relación",
    "",
    ...formatEmptyableList(
      aggregate.relationReasons,
      (item) => `- ${item.label}: ${formatCount(item.count, "expediente")} (${formatCaseIds(item.caseIds)})`,
      "- Sin motivos cargados.",
    ),
    "",
    "## Notas de relación",
    "",
    ...formatEmptyableList(
      aggregate.caseRelationNotes,
      (item) => `- ${item.caseId}: ${item.label}. ${item.note}`,
      "- Sin notas de relación.",
    ),
    "",
    "## Repeticiones detectadas",
    "",
    ...formatEmptyableList(
      aggregate.repeatedSuppliers,
      (item) => `- Proveedor: ${item.label} (${formatCount(item.count, "expediente")})`,
      "- Sin proveedores repetidos.",
    ),
    ...formatEmptyableList(
      aggregate.repeatedAgencies,
      (item) => `- Organismo: ${item.label} (${formatCount(item.count, "expediente")})`,
      "- Sin organismos repetidos.",
    ),
    "",
    "## Señales",
    "",
    ...formatEmptyableList(
      aggregate.signals,
      (item) => `- ${item.label}: ${formatCount(item.count, "expediente")} (${formatCaseIds(item.caseIds)})`,
      "- Sin señales cargadas.",
    ),
  ].filter((line): line is string => line !== null).join("\n");
}

function buildTimeline(aggregate: InvestigationAggregate): string {
  if (aggregate.timeline.length === 0) return "# Línea temporal\n\nSin años disponibles.";
  return [
    "# Línea temporal",
    "",
    ...aggregate.timeline.map((bucket) =>
      `- ${bucket.year}: ${formatCount(bucket.count, "expediente")} (${formatCaseIds(bucket.caseIds)})`
    ),
  ].join("\n");
}

function buildEntities(workspace: InvestigationWorkspace, aggregate: InvestigationAggregate): string {
  return [
    "# Entidades",
    "",
    "## Cargadas por el usuario",
    "",
    ...formatEmptyableList(
      workspace.entities,
      (entity) => `- ${entity.label} (${entity.kind})${entity.note ? `: ${entity.note}` : ""}`,
      "- Sin entidades cargadas.",
    ),
    "",
    "## Coincidencias en expedientes",
    "",
    ...formatEmptyableList(
      aggregate.entityMatches,
      (match) => `- ${match.entityLabel}: ${formatCaseIds(match.caseIds)}`,
      "- Sin coincidencias detectadas.",
    ),
    "",
    "## Montos",
    "",
    ...formatEmptyableList(
      aggregate.amountsByCurrency,
      (amount) => `- ${amount.currency}: ${amount.total} (${formatCount(amount.count, "expediente")})`,
      "- Sin montos estructurados.",
    ),
  ].join("\n");
}

function buildNotes(workspace: InvestigationWorkspace): string {
  if (workspace.notes.length === 0) return "# Notas\n\nSin notas cargadas.";
  return [
    "# Notas",
    "",
    ...workspace.notes.flatMap((note) => [
      `## ${note.id}`,
      "",
      note.body,
      "",
    ]),
  ].join("\n");
}

function writeZip(files: Array<{ name: string; content: string }>): Uint8Array {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  const entries: ZipEntry[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = textEncoder.encode(file.name);
    const data = textEncoder.encode(file.content);
    const entry: ZipEntry = {
      name: file.name,
      data,
      crc: crc32(data),
      offset,
    };
    const localHeader = localFileHeader(nameBytes, entry);
    localParts.push(localHeader, data);
    entries.push(entry);
    offset += localHeader.byteLength + data.byteLength;
  }

  let centralSize = 0;
  for (const entry of entries) {
    const header = centralDirectoryHeader(textEncoder.encode(entry.name), entry);
    centralParts.push(header);
    centralSize += header.byteLength;
  }

  const eocd = endOfCentralDirectory(entries.length, centralSize, offset);
  return concatBytes([...localParts, ...centralParts, eocd]);
}

function localFileHeader(nameBytes: Uint8Array, entry: ZipEntry): Uint8Array {
  const bytes: number[] = [];
  pushUint32(bytes, 0x04034b50);
  pushUint16(bytes, 20);
  pushUint16(bytes, 0);
  pushUint16(bytes, 0);
  pushUint16(bytes, 0);
  pushUint16(bytes, 0);
  pushUint32(bytes, entry.crc);
  pushUint32(bytes, entry.data.byteLength);
  pushUint32(bytes, entry.data.byteLength);
  pushUint16(bytes, nameBytes.byteLength);
  pushUint16(bytes, 0);
  return concatBytes([Uint8Array.from(bytes), nameBytes]);
}

function centralDirectoryHeader(nameBytes: Uint8Array, entry: ZipEntry): Uint8Array {
  const bytes: number[] = [];
  pushUint32(bytes, 0x02014b50);
  pushUint16(bytes, 20);
  pushUint16(bytes, 20);
  pushUint16(bytes, 0);
  pushUint16(bytes, 0);
  pushUint16(bytes, 0);
  pushUint16(bytes, 0);
  pushUint32(bytes, entry.crc);
  pushUint32(bytes, entry.data.byteLength);
  pushUint32(bytes, entry.data.byteLength);
  pushUint16(bytes, nameBytes.byteLength);
  pushUint16(bytes, 0);
  pushUint16(bytes, 0);
  pushUint16(bytes, 0);
  pushUint16(bytes, 0);
  pushUint32(bytes, 0);
  pushUint32(bytes, entry.offset);
  return concatBytes([Uint8Array.from(bytes), nameBytes]);
}

function endOfCentralDirectory(entryCount: number, centralSize: number, centralOffset: number): Uint8Array {
  const bytes: number[] = [];
  pushUint32(bytes, 0x06054b50);
  pushUint16(bytes, 0);
  pushUint16(bytes, 0);
  pushUint16(bytes, entryCount);
  pushUint16(bytes, entryCount);
  pushUint32(bytes, centralSize);
  pushUint32(bytes, centralOffset);
  pushUint16(bytes, 0);
  return Uint8Array.from(bytes);
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

function pushUint16(bytes: number[], value: number) {
  bytes.push(value & 0xff, (value >>> 8) & 0xff);
}

function pushUint32(bytes: number[], value: number) {
  bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function slugify(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "carpeta";
}

function fileSafeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function formatEmptyableList<T>(items: T[], formatter: (item: T) => string, emptyText: string): string[] {
  if (items.length === 0) return [emptyText];
  return items.map(formatter);
}

function formatCount(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function formatCaseIds(caseIds: string[]): string {
  return caseIds.join(", ");
}
