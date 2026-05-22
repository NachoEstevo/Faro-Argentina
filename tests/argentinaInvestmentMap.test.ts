import test from "node:test";
import assert from "node:assert/strict";

import { buildArgentinaInvestmentMapCases } from "../src/lib/data/argentinaInvestmentMap.ts";
import { assessCoordinateQuality } from "../src/lib/data/coordinateQuality.ts";
import { buildCaseSignalContext, buildCaseSignals } from "../src/lib/data/caseSignals.ts";

const options = {
  sourceId: "AR-MAPA-INVERSIONES-OBRAS",
  sourceName: "Mapa de Inversiones Argentina obras",
  sourceUrl: "https://datos.gob.ar/dataset/obras-mapa-inversiones-argentina",
  rawPath: "data/official/ar/mapa-inversiones-obras.csv",
  fileHash: "sha256-mapa",
  extractedAt: "2026-05-21T00:00:00.000Z",
  parserVersion: "argentina-investment-map@1",
};

test("buildArgentinaInvestmentMapCases keeps progress works available without map geometry", () => {
  const [caseFile] = buildArgentinaInvestmentMapCases(investmentMapCsv(), options);

  assert.equal(caseFile?.id, "AR-MAPA-INV-1610");
  assert.equal(caseFile?.caseType, "public_works_progress");
  assert.equal(caseFile?.workNumber, "NA70056");
  assert.equal(caseFile?.title, "CIERRE DE MALLA RINCON DE MILBERG");
  assert.equal(caseFile?.year, 2019);
  assert.equal(caseFile?.workProvince, "BUENOS AIRES");
  assert.equal(caseFile?.workDepartment, "TIGRE");
  assert.equal(caseFile?.coordinates, null);
  assert.equal(caseFile?.amount?.currency, "ARS");
  assert.equal(caseFile?.physicalProgress, 100);
  assert.equal(caseFile?.financialProgress, 100);
  assert.equal(caseFile?.receipt.locatorType, "official_detail");
  assert.equal(caseFile?.receipt.sourceUrl, "https://mapainversiones.obraspublicas.gob.ar/Proyecto/PerfilProyecto/1610");

  const quality = assessCoordinateQuality({
    caseId: caseFile?.id,
    countryCode: "AR",
    coordinates: caseFile?.coordinates ?? null,
  });
  assert.equal(quality.status, "missing_geometry");
  assert.equal(quality.exposeOnMap, false);

  const signals = buildCaseSignals(caseFile);
  assert.equal(
    signals.some((signal) => signal.code === "official_progress_declared"),
    true,
  );
  assert.equal(
    signals.some((signal) => signal.code === "missing_official_geometry"),
    true,
  );
});

test("Mapa de Inversiones cases do not create supplier recurrence leads by themselves", () => {
  const [caseFile] = buildArgentinaInvestmentMapCases(investmentMapCsv(), options);
  assert.ok(caseFile);

  const repeatedSupplierCases = [
    {
      ...caseFile,
      id: "AR-MAPA-INV-1",
      supplierName: "Constructora de prueba",
      supplierDocument: null,
    },
    {
      ...caseFile,
      id: "AR-MAPA-INV-2",
      supplierName: "Constructora de prueba",
      supplierDocument: null,
    },
    {
      ...caseFile,
      id: "AR-MAPA-INV-3",
      supplierName: "Constructora de prueba",
      supplierDocument: null,
    },
  ];
  const context = buildCaseSignalContext(repeatedSupplierCases);
  const signals = buildCaseSignals(repeatedSupplierCases[0], context);

  assert.equal(
    signals.some((signal) => signal.code === "supplier_identified"),
    true,
  );
  assert.equal(
    signals.some((signal) => signal.code === "recurring_supplier_agency"),
    false,
  );
  assert.equal(
    signals.some((signal) => signal.code === "supplier_concentration"),
    false,
  );
});

function investmentMapCsv(): string {
  return [
    [
      "idproyecto",
      "numeroobra",
      "codigobapin",
      "fechainicioanio",
      "fechafinanio",
      "nombreobra",
      "descripicionfisica",
      "montototal",
      "sectornombre",
      "avancefinanciero",
      "avancefisico",
      "entidadejecutoranombre",
      "duracionobrasdias",
      "objetivogeneral",
      "tipoproyecto",
      "nombredepto",
      "nombreprovincia",
      "codigo_bahra",
      "etapaobra",
      "tipomoneda",
      "url_perfil_obra",
      "programa_infraestructura",
      "organismo_financiador_1",
      "organismo_financiador_2",
      "organismo_financiador_prestamo",
      "contraparte_key",
      "contraparte_val",
      "contraparte_cuit",
      "contraparte_modalidad",
      "tag_accionclimatica",
      "tag_ods_incidencia",
    ].join(","),
    [
      "1610",
      "NA70056",
      "10",
      "2019",
      "2020",
      "CIERRE DE MALLA RINCON DE MILBERG",
      "Instalacion de red secundaria de agua",
      "17872007.00",
      "AGUA Y CLOACA",
      "100.00",
      "100.00",
      "AGUA Y SANEAMIENTOS ARGENTINOS",
      "443",
      "Instalacion de red secundaria de agua",
      "RED SECUNDARIA",
      "TIGRE",
      "BUENOS AIRES",
      "",
      "FINALIZADAS",
      "pesos argentinos",
      "https://mapainversiones.obraspublicas.gob.ar/Proyecto/PerfilProyecto/1610",
      "SIN PROGRAMA",
      "-",
      "",
      "",
      "-",
      "-",
      "-",
      "A+T",
      "Adaptacion",
      "ODS 6 DIRECTA",
    ].join(","),
  ].join("\n");
}
