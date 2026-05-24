import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSearchSuggestions,
  caseMatchesSearch,
  normalizeSearchText,
  type SearchSuggestionCase,
} from "../src/lib/data/searchSuggestions.ts";

const judicialCase: SearchSuggestionCase = {
  id: "AR-HIST-JUD-VIALIDAD-CFP-5048-SENTENCIA-FIRME",
  countryCode: "AR",
  caseType: "judicial_context",
  title: "Causa Vialidad CFP 5048/2016/TO1",
  workNumber: "VIALIDAD-CFP-5048-SENTENCIA-FIRME",
  year: 2025,
  procedureNumber: "CFP 5048/2016/TO1",
  agencyName: "Tribunal Oral en lo Criminal Federal Nro. 2",
  agencyCode: "TOF2",
  contractingUnit: "Poder Judicial de la Nacion",
  coordinates: null,
  amount: { value: 46_000_000_000, currency: "ARS", label: "monto contextual informado por MPF" },
  supplierName: "Grupo Baez",
  supplierDocument: null,
  judicialStatus: "Sentencia firme desde 2025-06-10.",
  contextSummary: "El Poder Judicial y el MPF documentan la Causa Vialidad.",
  receipt: {
    sourceId: "AR-CIJ-VIALIDAD-VEREDICTO",
    sourceName: "CIJ Causa Vialidad",
    sourceUrl: "https://www.cij.gov.ar/login/d/sentencia.pdf",
  },
};

const contractCase: SearchSuggestionCase = {
  id: "AR-CONTRACT-46-0620-CON22",
  countryCode: "AR",
  caseType: "procurement_contract",
  title: "OBRA: CONSTRUCCION DE OBRA BASICA Y PAVIMENTO EN VARIANTE RUTA NACIONAL N° 40",
  workNumber: "46-0620-CON22",
  year: 2022,
  procedureNumber: "46-0262-LPU21",
  agencyName: "604 - Dirección Nacional de Vialidad",
  agencyCode: "604",
  contractingUnit: "46/000 - Coordinación de Licitaciones y Contrataciones - DNV",
  coordinates: { lat: -27.718103, lon: -67.157028 },
  amount: { value: 455_370_328.95, currency: "ARS", label: "monto_contrato" },
  officialBudget: { value: 193_160_911.2, currency: "ARS", label: "presupuesto_oficial" },
  bidderCount: 1,
  offerCount: 1,
  supplierName: "TRANSREDES SA",
  supplierDocument: "30-71079146-1",
  workProvince: "CATAMARCA",
  workDepartment: "BELÉN",
  workLocality: "LONDRES",
  receipt: {
    sourceId: "AR-CONTRATAR-CONTRATOS",
    sourceName: "CONTRAT.AR contratos",
    sourceUrl: "https://infra.datos.gob.ar/catalog/jgm/dataset/30/distribution/30.4/download/onc-contratar-contratos.csv",
  },
};

test("normalizeSearchText removes accents, punctuation and case differences", () => {
  assert.equal(normalizeSearchText("Lázaro Báez - DNV Nº 40"), "lazaro baez dnv n 40");
});

test("caseMatchesSearch supports human aliases and partial official identifiers", () => {
  assert.equal(caseMatchesSearch(judicialCase, "lazaro"), true);
  assert.equal(caseMatchesSearch(judicialCase, "Báez"), true);
  assert.equal(caseMatchesSearch(contractCase, "dnv"), true);
  assert.equal(caseMatchesSearch(contractCase, "46-0262"), true);
  assert.equal(caseMatchesSearch(contractCase, "1 oferente"), true);
  assert.equal(caseMatchesSearch(contractCase, "monto sobre presupuesto"), true);
});

test("buildSearchSuggestions returns categorized suggestions from matched cases", () => {
  const suggestions = buildSearchSuggestions([judicialCase, contractCase], "baez", { limit: 8 });

  assert.equal(
    suggestions.some((suggestion) =>
      suggestion.kind === "case" &&
      suggestion.caseId === "AR-HIST-JUD-VIALIDAD-CFP-5048-SENTENCIA-FIRME"
    ),
    true,
  );
  assert.equal(
    suggestions.some((suggestion) =>
      suggestion.kind === "supplier" &&
      suggestion.label === "Grupo Baez"
    ),
    true,
  );
});

test("buildSearchSuggestions includes CUIT, alias and location suggestions", () => {
  const cuitSuggestions = buildSearchSuggestions([contractCase], "30-71079146-1", { limit: 8 });
  const aliasSuggestions = buildSearchSuggestions([contractCase], "dnv", { limit: 8 });
  const locationSuggestions = buildSearchSuggestions([contractCase], "catamarca", { limit: 8 });

  assert.equal(
    cuitSuggestions.some((suggestion) =>
      suggestion.kind === "document" &&
      suggestion.label === "30-71079146-1" &&
      suggestion.detail === "CUIT / documento de proveedor"
    ),
    true,
  );
  assert.equal(
    aliasSuggestions.some((suggestion) =>
      suggestion.kind === "alias" &&
      suggestion.label === "DNV" &&
      suggestion.query === "Dirección Nacional de Vialidad"
    ),
    true,
  );
  assert.equal(
    aliasSuggestions.some((suggestion) => suggestion.kind === "alias" && suggestion.label === "Lázaro Báez"),
    false,
  );
  assert.equal(
    locationSuggestions.some((suggestion) =>
      suggestion.kind === "location" &&
      suggestion.label === "CATAMARCA" &&
      suggestion.detail === "Provincia"
    ),
    true,
  );
});

test("buildSearchSuggestions includes signal and identifier suggestions", () => {
  const oneBidderSuggestions = buildSearchSuggestions([contractCase], "1 oferente", { limit: 8 });
  const identifierSuggestions = buildSearchSuggestions([contractCase], "46-0262", { limit: 8 });

  assert.equal(
    oneBidderSuggestions.some((suggestion) =>
      suggestion.kind === "signal" &&
      suggestion.query === "1 oferente"
    ),
    true,
  );
  assert.equal(
    identifierSuggestions.some((suggestion) =>
      suggestion.kind === "identifier" &&
      suggestion.label === "46-0262-LPU21"
    ),
    true,
  );
});
