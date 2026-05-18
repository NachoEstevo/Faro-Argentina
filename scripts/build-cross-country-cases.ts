import { mkdir, readFile, writeFile } from "node:fs/promises";

import {
  buildArgentinaContractCases,
  buildChileCompraCases,
  buildChileCompraOcdsCases,
  buildPeruBudgetCases,
  buildPeruContractCases,
  type ArgentinaSupplierRow,
  type ArgentinaLocationRow,
  type ArgentinaOfferRow,
  type ArgentinaOpeningActRow,
  type ArgentinaProcedureRow,
  type ChileCompraSnapshot,
  type ChileCompraOcdsSnapshot,
  type PeruContractRow,
} from "../src/lib/data/crossCountryCases.ts";
import { parseCsv, type RawArgentinaWorkRow } from "../src/lib/data/argentinaWorks.ts";
import { resolveDataBuildTimestamp } from "../src/lib/data/dataBuildTimestamps.ts";
import { profileCsvSnapshot, profileJsonSnapshot } from "../src/lib/data/snapshots.ts";
import { profileXlsxSnapshot, readXlsxRows } from "../src/lib/data/xlsx.ts";
import { loadFxRegistryFromFiles } from "../src/lib/data/fxSeries.ts";

const pePath = new URL("../data/official/pe/mef-2026-gasto-diario.sample.csv", import.meta.url);
const arWorksPath = new URL("../data/official/ar/onc-contratar-obras.csv", import.meta.url);
const arContractsPath = new URL("../data/official/ar/onc-contratar-contratos.csv", import.meta.url);
const arSuppliersPath = new URL("../data/official/ar/sipro-proveedores.csv", import.meta.url);
const arProceduresPath = new URL(
  "../data/official/ar/onc-contratar-procedimientos.csv",
  import.meta.url,
);
const arOffersPath = new URL("../data/official/ar/onc-contratar-ofertas.csv", import.meta.url);
const arLocationsPath = new URL(
  "../data/official/ar/onc-contratar-ubicacion-geografica.csv",
  import.meta.url,
);
const arOpeningActsPath = new URL(
  "../data/official/ar/onc-contratar-actas-apertura.csv",
  import.meta.url,
);
const peContractsPath = new URL("../data/official/pe/oece-contratos-2025.xlsx", import.meta.url);
const peHistoricalContractsPath = new URL(
  "../data/official/pe/oece-contratos-historicos-seleccionados.json",
  import.meta.url,
);
const peOcdsPath = new URL(
  "../data/official/pe/oece-ocds-seace-v3-contract-releases.sample.json",
  import.meta.url,
);
const peHistoricalOcdsPath = new URL(
  "../data/official/pe/oece-ocds-seace-v3-historical-releases.sample.json",
  import.meta.url,
);
const peDistrictCentroidsPath = new URL(
  "../data/official/pe/idep-district-centroids.json",
  import.meta.url,
);
const clPath = new URL(
  "../data/official/cl/mercado-publico-licitaciones-adjudicadas-2026-05-15.sample.json",
  import.meta.url,
);
const clCommuneCentroidsPath = new URL(
  "../data/official/cl/ciren-commune-centroids.json",
  import.meta.url,
);
const outputPath = new URL("../src/data/crossCountryCaseFiles.json", import.meta.url);
const manifestPath = new URL("../data/official/snapshot-manifest.json", import.meta.url);

const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
  generatedAt?: string;
  snapshots: Array<{ sourceId: string; rawPath?: string; fileHash: string; fetchUrl: string }>;
};
const argentinaContractCaseLimit = 300;

function fxSnapshotMeta(sourceId: string) {
  const entry = manifest.snapshots.find((s) => s.sourceId === sourceId);
  if (!entry) throw new Error(`fx snapshot ${sourceId} missing from manifest`);
  return {
    sourceId,
    sourceName: sourceId,
    sourceUrl: entry.fetchUrl,
    snapshotHash: entry.fileHash,
  };
}

const fxRegistry = await loadFxRegistryFromFiles({
  rootDir: new URL("../", import.meta.url),
  profiles: [
    {
      currency: "ARS",
      relativePath: "data/official/fx/ar-bcra-com-a3500.csv",
      dateColumn: "indice_tiempo",
      rateColumn: "dolar_referencia_com_3500",
      dateFormat: "iso",
      delimiter: ",",
      sourceMeta: fxSnapshotMeta("AR-BCRA-COM-A3500"),
    },
    {
      currency: "CLP",
      relativePath: "data/official/fx/cl-bcch-dolar-observado.csv",
      dateColumn: "fecha",
      rateColumn: "dolar_observado",
      dateFormat: "iso",
      delimiter: ",",
      sourceMeta: fxSnapshotMeta("CL-BCCH-DOLAR-OBSERVADO"),
    },
    {
      currency: "PEN",
      relativePath: "data/official/fx/pe-bcrp-sbs-venta.csv",
      dateColumn: "fecha",
      rateColumn: "tipo_cambio_sbs_venta",
      dateFormat: "iso",
      delimiter: ",",
      sourceMeta: fxSnapshotMeta("PE-BCRP-SBS-VENTA"),
    },
  ],
});
const peruOeceContractLimit = Number(process.env.PERU_OECE_CONTRACT_LIMIT ?? "500");
const generatedAt = resolveDataBuildTimestamp({
  envTimestamp: process.env.FARO_DATA_BUILD_TIMESTAMP,
  manifestTimestamp: manifest.generatedAt,
});
const chileOcdsManifestEntries = manifest.snapshots
  .filter((snapshot): snapshot is { sourceId: string; rawPath: string; fileHash: string; fetchUrl: string } =>
    snapshot.sourceId === "CL-CHILECOMPRA-OCDS-PROCESOS" &&
    typeof snapshot.rawPath === "string" &&
    snapshot.rawPath.includes("chilecompra-ocds-procesos-"),
  )
  .sort((left, right) => left.rawPath.localeCompare(right.rawPath));
if (chileOcdsManifestEntries.length === 0) {
  throw new Error("No CL-CHILECOMPRA-OCDS-PROCESOS snapshots found in manifest");
}
const peText = await readFile(pePath, "utf8");
const arWorksText = await readFile(arWorksPath, "utf8");
const arContractsText = await readFile(arContractsPath, "utf8");
const arSuppliersText = await readFile(arSuppliersPath, "utf8");
const arProceduresText = await readFile(arProceduresPath, "utf8");
const arOffersText = await readFile(arOffersPath, "utf8");
const arLocationsText = await readFile(arLocationsPath, "utf8");
const arOpeningActsText = await readFile(arOpeningActsPath, "utf8");
const peContractsBuffer = await readFile(peContractsPath);
const peHistoricalContractsText = await readFile(peHistoricalContractsPath, "utf8");
const peOcdsText = await readFile(peOcdsPath, "utf8");
const peHistoricalOcdsText = await readFile(peHistoricalOcdsPath, "utf8");
const peDistrictCentroidsText = await readFile(peDistrictCentroidsPath, "utf8");
const clText = await readFile(clPath, "utf8");
const clOcdsSnapshotTexts = await Promise.all(chileOcdsManifestEntries.map(async (entry) => ({
  entry,
  text: await readFile(new URL(`../${entry.rawPath}`, import.meta.url), "utf8"),
})));
const clCommuneCentroidsText = await readFile(clCommuneCentroidsPath, "utf8");
const arWorksProfile = profileCsvSnapshot({
  sourceId: "AR-CONTRATAR-OBRAS",
  rawPath: "data/official/ar/onc-contratar-obras.csv",
  text: arWorksText,
  keyColumns: ["numero_obra", "procedimiento_numero", "latitud_1", "longitud_1"],
});
const arContractsProfile = profileCsvSnapshot({
  sourceId: "AR-CONTRATAR-CONTRATOS",
  rawPath: "data/official/ar/onc-contratar-contratos.csv",
  text: arContractsText,
  keyColumns: ["contrato_numero", "procedimiento_numero", "contratista_cuit", "contrato_monto"],
});
const arSuppliersProfile = profileCsvSnapshot({
  sourceId: "AR-SIPRO-PROVEEDORES",
  rawPath: "data/official/ar/sipro-proveedores.csv",
  text: arSuppliersText,
  keyColumns: ["cuit___nit", "razon_social", "provincia"],
});
const arProceduresProfile = profileCsvSnapshot({
  sourceId: "AR-CONTRATAR-PROCEDIMIENTOS",
  rawPath: "data/official/ar/onc-contratar-procedimientos.csv",
  text: arProceduresText,
  keyColumns: [
    "procedimiento_numero",
    "procedimiento_estado",
    "procedimiento_tipo",
    "presupuesto_oficial_monto",
  ],
});
const arOffersProfile = profileCsvSnapshot({
  sourceId: "AR-CONTRATAR-OFERTAS",
  rawPath: "data/official/ar/onc-contratar-ofertas.csv",
  text: arOffersText,
  keyColumns: ["procedimiento_numero", "oferente_cuit", "oferente_razon_social", "oferta_monto"],
});
const arLocationsProfile = profileCsvSnapshot({
  sourceId: "AR-CONTRATAR-UBICACION",
  rawPath: "data/official/ar/onc-contratar-ubicacion-geografica.csv",
  text: arLocationsText,
  keyColumns: ["numero_obra", "provincia_nombre", "departamento_nombre", "localidad_nombre"],
});
const arOpeningActsProfile = profileCsvSnapshot({
  sourceId: "AR-CONTRATAR-ACTAS-APERTURA",
  rawPath: "data/official/ar/onc-contratar-actas-apertura.csv",
  text: arOpeningActsText,
  keyColumns: ["procedimiento_numero", "fecha_creacion", "cantidad_ofertas_confirmadas"],
});
const peProfile = profileCsvSnapshot({
  sourceId: "PE-MEF-GASTO-DIARIO",
  rawPath: "data/official/pe/mef-2026-gasto-diario.sample.csv",
  text: peText,
  keyColumns: ["ANO_EJE", "SEC_EJEC", "PRODUCTO_PROYECTO", "MONTO_DEVENGADO"],
});
const clProfile = profileJsonSnapshot({
  sourceId: "CL-MERCADO-PUBLICO-API",
  rawPath: "data/official/cl/mercado-publico-licitaciones-adjudicadas-2026-05-15.sample.json",
  text: clText,
  recordPath: ["details"],
});
const clOcdsProfiles = clOcdsSnapshotTexts.map(({ entry, text }) => ({
  entry,
  text,
  profile: profileJsonSnapshot({
    sourceId: "CL-CHILECOMPRA-OCDS-PROCESOS",
    rawPath: entry.rawPath,
    text,
    recordPath: ["records"],
  }),
}));
const peContractsProfile = profileXlsxSnapshot({
  sourceId: "PE-OECE-CONTRATOS",
  rawPath: "data/official/pe/oece-contratos-2025.xlsx",
  buffer: peContractsBuffer,
});
const peHistoricalContractsProfile = profileJsonSnapshot({
  sourceId: "PE-OECE-CONTRATOS-HISTORICOS",
  rawPath: "data/official/pe/oece-contratos-historicos-seleccionados.json",
  text: peHistoricalContractsText,
  recordPath: ["selected"],
});
const peOcdsProfile = profileJsonSnapshot({
  sourceId: "PE-OECE-OCDS",
  rawPath: "data/official/pe/oece-ocds-seace-v3-contract-releases.sample.json",
  text: peOcdsText,
  recordPath: ["releases"],
});
const peHistoricalOcdsProfile = profileJsonSnapshot({
  sourceId: "PE-OECE-OCDS",
  rawPath: "data/official/pe/oece-ocds-seace-v3-historical-releases.sample.json",
  text: peHistoricalOcdsText,
  recordPath: ["releases"],
});
const peDistrictCentroidsProfile = profileJsonSnapshot({
  sourceId: "PE-IDEP-LIMITE-DISTRITAL",
  rawPath: "data/official/pe/idep-district-centroids.json",
  text: peDistrictCentroidsText,
  recordPath: ["centroids"],
});
const clCommuneCentroidsProfile = profileJsonSnapshot({
  sourceId: "CL-CIREN-LIMITE-COMUNAL",
  rawPath: "data/official/cl/ciren-commune-centroids.json",
  text: clCommuneCentroidsText,
  recordPath: ["centroids"],
});
const adminCentroids = [
  ...(JSON.parse(peDistrictCentroidsText) as { centroids: [] }).centroids,
  ...(JSON.parse(clCommuneCentroidsText) as { centroids: [] }).centroids,
];

const peCases = buildPeruBudgetCases(peText, {
  sourceId: "PE-MEF-GASTO-DIARIO",
  sourceName: "MEF presupuesto y ejecucion de gasto diario",
  sourceUrl: "https://fs.datosabiertos.mef.gob.pe/datastorefiles/2026-Gasto-Diario.csv",
  rawPath: "data/official/pe/mef-2026-gasto-diario.sample.csv",
  fileHash: peProfile.fileHash,
  extractedAt: generatedAt,
  parserVersion: "cross-country@1",
  fxRegistry,
});
const arContractCases = buildArgentinaContractCases(arContractsText, {
  sourceId: "AR-CONTRATAR-CONTRATOS",
  sourceName: "CONTRAT.AR contratos",
  sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.4/download/onc-contratar-contratos.csv",
  rawPath: "data/official/ar/onc-contratar-contratos.csv",
  fileHash: arContractsProfile.fileHash,
  extractedAt: generatedAt,
  parserVersion: "cross-country@1",
  fxRegistry,
}, {
  limit: argentinaContractCaseLimit,
  works: {
    rows: parseCsv<RawArgentinaWorkRow>(arWorksText),
    source: {
      sourceId: "AR-CONTRATAR-OBRAS",
      sourceName: "CONTRAT.AR obras",
      sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.5/download/onc-contratar-obras.csv",
      rawPath: "data/official/ar/onc-contratar-obras.csv",
      fileHash: arWorksProfile.fileHash,
      extractedAt: generatedAt,
      parserVersion: "argentina-works@1",
    },
  },
  suppliers: {
    rows: parseCsv<ArgentinaSupplierRow>(arSuppliersText),
    source: {
      sourceId: "AR-SIPRO-PROVEEDORES",
      sourceName: "SIPRO proveedores",
      sourceUrl: "https://infra.datos.gob.ar/catalog/modernizacion/dataset/2/distribution/2.11/download/proveedores.csv",
      rawPath: "data/official/ar/sipro-proveedores.csv",
      fileHash: arSuppliersProfile.fileHash,
      extractedAt: generatedAt,
      parserVersion: "argentina-suppliers@1",
    },
  },
  procedures: {
    rows: parseCsv<ArgentinaProcedureRow>(arProceduresText),
    source: {
      sourceId: "AR-CONTRATAR-PROCEDIMIENTOS",
      sourceName: "CONTRAT.AR procedimientos",
      sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.1/download/onc-contratar-procedimientos.csv",
      rawPath: "data/official/ar/onc-contratar-procedimientos.csv",
      fileHash: arProceduresProfile.fileHash,
      extractedAt: generatedAt,
      parserVersion: "argentina-procedures@1",
    },
  },
  offers: {
    rows: parseCsv<ArgentinaOfferRow>(arOffersText),
    source: {
      sourceId: "AR-CONTRATAR-OFERTAS",
      sourceName: "CONTRAT.AR ofertas",
      sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.3/download/onc-contratar-ofertas.csv",
      rawPath: "data/official/ar/onc-contratar-ofertas.csv",
      fileHash: arOffersProfile.fileHash,
      extractedAt: generatedAt,
      parserVersion: "argentina-offers@1",
    },
  },
  locations: {
    rows: parseCsv<ArgentinaLocationRow>(arLocationsText),
    source: {
      sourceId: "AR-CONTRATAR-UBICACION",
      sourceName: "CONTRAT.AR ubicacion geografica",
      sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.6/download/onc-contratar-ubicacion-geografica.csv",
      rawPath: "data/official/ar/onc-contratar-ubicacion-geografica.csv",
      fileHash: arLocationsProfile.fileHash,
      extractedAt: generatedAt,
      parserVersion: "argentina-locations@1",
    },
  },
  openingActs: {
    rows: parseCsv<ArgentinaOpeningActRow>(arOpeningActsText),
    source: {
      sourceId: "AR-CONTRATAR-ACTAS-APERTURA",
      sourceName: "CONTRAT.AR actas de apertura",
      sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.8/download/onc-contratar-actas-apertura.csv",
      rawPath: "data/official/ar/onc-contratar-actas-apertura.csv",
      fileHash: arOpeningActsProfile.fileHash,
      extractedAt: generatedAt,
      parserVersion: "argentina-opening-acts@1",
    },
  },
});
const peContractRows = readXlsxRows(peContractsBuffer, { limit: peruOeceContractLimit })
  .rows as unknown as PeruContractRow[];
const peContractCases = buildPeruContractCases(peContractRows, {
  sourceId: "PE-OECE-CONTRATOS",
  sourceName: "OECE contratos",
  sourceUrl: "https://www.datosabiertos.gob.pe/node/20236/dataset",
  rawPath: "data/official/pe/oece-contratos-2025.xlsx",
  fileHash: peContractsProfile.fileHash,
  extractedAt: generatedAt,
  parserVersion: "cross-country@1",
  fxRegistry,
}, peruOeceContractLimit, {
  releases: (JSON.parse(peOcdsText) as { releases: [] }).releases,
  source: {
    sourceId: "PE-OECE-OCDS",
    sourceName: "Portal de contrataciones abiertas OCDS",
    sourceUrl: "https://contratacionesabiertas.oece.gob.pe/descargas",
    rawPath: "data/official/pe/oece-ocds-seace-v3-contract-releases.sample.json",
    fileHash: peOcdsProfile.fileHash,
    extractedAt: generatedAt,
    parserVersion: "peru-ocds@1",
  },
}, {
  adminCentroids,
});
const peHistoricalSnapshot = JSON.parse(peHistoricalContractsText) as {
  selected: Array<{ row: PeruContractRow }>;
};
const peHistoricalRows = peHistoricalSnapshot.selected.map((item) => item.row);
const existingPeCaseIds = new Set([...peCases, ...peContractCases].map((caseFile) => caseFile.id));
const peHistoricalContractCases = buildPeruContractCases(peHistoricalRows, {
  sourceId: "PE-OECE-CONTRATOS-HISTORICOS",
  sourceName: "OECE contratos historicos seleccionados",
  sourceUrl: "https://www.datosabiertos.gob.pe/dataset/contratos-de-las-entidades-organismo-supervisor-de-las-contrataciones-del-estado-osce",
  rawPath: "data/official/pe/oece-contratos-historicos-seleccionados.json",
  fileHash: peHistoricalContractsProfile.fileHash,
  extractedAt: generatedAt,
  parserVersion: "peru-historical-contracts@1",
  fxRegistry,
}, peHistoricalRows.length, {
  releases: (JSON.parse(peHistoricalOcdsText) as { releases: [] }).releases,
  source: {
    sourceId: "PE-OECE-OCDS",
    sourceName: "Portal de contrataciones abiertas OCDS",
    sourceUrl: "https://contratacionesabiertas.oece.gob.pe/descargas",
    rawPath: "data/official/pe/oece-ocds-seace-v3-historical-releases.sample.json",
    fileHash: peHistoricalOcdsProfile.fileHash,
    extractedAt: generatedAt,
    parserVersion: "peru-ocds@1",
  },
}, {
  adminCentroids,
}).filter((caseFile) => !existingPeCaseIds.has(caseFile.id));
const chileOcdsCaseGroups = dedupeCaseGroupsByCaseId(clOcdsProfiles.map(({ entry, text, profile }) => ({
  entry,
  profile,
  cases: buildChileCompraOcdsCases(JSON.parse(text) as ChileCompraOcdsSnapshot, {
    sourceId: "CL-CHILECOMPRA-OCDS-PROCESOS",
    sourceName: "ChileCompra descargas OCDS procesos",
    sourceUrl: "https://datos-abiertos.chilecompra.cl/descargas/procesos-ocds",
    rawPath: entry.rawPath,
    fileHash: profile.fileHash,
    extractedAt: generatedAt,
    parserVersion: "chilecompra-ocds@1",
    fxRegistry,
  }, {
    adminCentroids,
  }),
})));
const clOcdsCases = chileOcdsCaseGroups.flatMap((group) => group.cases);
const clCases = buildChileCompraCases(JSON.parse(clText) as ChileCompraSnapshot, {
  sourceId: "CL-MERCADO-PUBLICO-API",
  sourceName: "API de Mercado Publico",
  sourceUrl: "https://api.mercadopublico.cl/modules/api.aspx",
  rawPath: "data/official/cl/mercado-publico-licitaciones-adjudicadas-2026-05-15.sample.json",
  fileHash: clProfile.fileHash,
  extractedAt: generatedAt,
  parserVersion: "cross-country@1",
  fxRegistry,
}, {
  adminCentroids,
});

const payload = {
  generatedAt,
  datasets: [
    buildDataset({
      sourceId: "AR-CONTRATAR-CONTRATOS",
      sourceName: "CONTRAT.AR contratos",
      sourceUrl: "https://datos.gob.ar/dataset/jgm-procesos-contratacion-obra-publica-gestionados-plataforma-contratar",
      filePath: "data/official/ar/onc-contratar-contratos.csv",
      fileHash: arContractsProfile.fileHash,
      snapshotProfile: arContractsProfile,
      rawRows: arContractsProfile.rowCount,
      cases: arContractCases,
    }),
    buildDataset({
      sourceId: "PE-MEF-GASTO-DIARIO",
      sourceName: "MEF presupuesto y ejecucion de gasto diario",
      sourceUrl: "https://www.datosabiertos.gob.pe/dataset/presupuesto-y-ejecuci%C3%B3n-de-gasto",
      filePath: "data/official/pe/mef-2026-gasto-diario.sample.csv",
      fileHash: peProfile.fileHash,
      snapshotProfile: peProfile,
      rawRows: peProfile.rowCount,
      cases: peCases,
    }),
    buildDataset({
      sourceId: "PE-OECE-CONTRATOS",
      sourceName: "OECE contratos",
      sourceUrl: "https://www.datosabiertos.gob.pe/node/20236/dataset",
      filePath: "data/official/pe/oece-contratos-2025.xlsx",
      fileHash: peContractsProfile.fileHash,
      snapshotProfile: peContractsProfile,
      rawRows: peContractsProfile.rowCount,
      cases: peContractCases,
    }),
    buildDataset({
      sourceId: "PE-OECE-CONTRATOS-HISTORICOS",
      sourceName: "OECE contratos historicos seleccionados",
      sourceUrl: "https://www.datosabiertos.gob.pe/dataset/contratos-de-las-entidades-organismo-supervisor-de-las-contrataciones-del-estado-osce",
      filePath: "data/official/pe/oece-contratos-historicos-seleccionados.json",
      fileHash: peHistoricalContractsProfile.fileHash,
      snapshotProfile: peHistoricalContractsProfile,
      rawRows: peHistoricalContractsProfile.recordCount,
      cases: peHistoricalContractCases,
    }),
    buildDataset({
      sourceId: "CL-MERCADO-PUBLICO-API",
      sourceName: "API de Mercado Publico",
      sourceUrl: "https://api.mercadopublico.cl/modules/api.aspx",
      filePath: "data/official/cl/mercado-publico-licitaciones-adjudicadas-2026-05-15.sample.json",
      fileHash: clProfile.fileHash,
      snapshotProfile: clProfile,
      rawRows: clProfile.recordCount,
      cases: clCases,
    }),
    ...chileOcdsCaseGroups.map((group) => buildDataset({
      sourceId: "CL-CHILECOMPRA-OCDS-PROCESOS",
      sourceName: "ChileCompra descargas OCDS procesos",
      sourceUrl: "https://datos-abiertos.chilecompra.cl/descargas/procesos-ocds",
      filePath: group.entry.rawPath,
      fileHash: group.profile.fileHash,
      snapshotProfile: group.profile,
      rawRows: group.profile.recordCount,
      cases: group.cases,
    })),
  ],
  cases: [...arContractCases, ...peCases, ...peContractCases, ...peHistoricalContractCases, ...clCases, ...clOcdsCases],
};

await mkdir(new URL("../src/data/", import.meta.url), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

function dedupeCaseGroupsByCaseId<T extends {
  cases: Array<{ id: string }>;
}>(groups: T[]): T[] {
  const winningGroupByCaseId = new Map<string, number>();
  groups.forEach((group, groupIndex) => {
    group.cases.forEach((caseFile) => {
      winningGroupByCaseId.set(caseFile.id, groupIndex);
    });
  });

  return groups.map((group, groupIndex) => ({
    ...group,
    cases: group.cases.filter((caseFile) => winningGroupByCaseId.get(caseFile.id) === groupIndex),
  }));
}

function buildDataset({
  sourceId,
  sourceName,
  sourceUrl,
  filePath,
  fileHash,
  snapshotProfile,
  rawRows,
  cases,
}: {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  filePath: string;
  fileHash: string;
  snapshotProfile: unknown;
  rawRows: number;
  cases: Array<{ coordinates: unknown | null; receipt?: unknown }>;
}) {
  return {
    generatedAt,
    source: { sourceId, sourceName, sourceUrl, filePath, fileHash },
    snapshotProfile,
    stats: {
      rawRows,
      caseFiles: cases.length,
      mapReadyCases: cases.filter((caseFile) => caseFile.coordinates !== null).length,
    },
    cases,
  };
}
