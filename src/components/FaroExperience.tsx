"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  Database,
  FileSearch,
  Globe2,
  Map,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

import type { CaseDataset } from "@/lib/caseRepository";
import type { ArgentinaWorkCase } from "@/lib/data/argentinaWorks";
import { buildCaseLeads } from "@/lib/data/caseLeads";
import type { SignalCaseFile } from "@/lib/data/caseSignals";
import type { CrossCountryCaseFile } from "@/lib/data/crossCountryCases";
import { filterExplorerCases, type ExplorerCase } from "@/lib/data/explorerCases";
import CaseInspector from "./CaseInspector";
import { CaseDetails, CountryExplorer } from "./CaseDetails";
import EntryGate from "./EntryGate";
import FaroMark from "./FaroMark";
import InvestigatorExplorer from "./InvestigatorExplorer";
import LeadFeed from "./LeadFeed";

const CaseMap = dynamic(() => import("./CaseMap"), {
  ssr: false,
  loading: () => <div className="mapLoading">Cargando mapa</div>,
});

interface Props {
  dataset: CaseDataset<ArgentinaWorkCase>;
  crossCountryCases: CrossCountryCaseFile[];
  explorerCases?: ExplorerCase[];
  initialCountry?: "AR" | "PE" | "CL";
  initialEntryOpen?: boolean;
  initialMode?: "map" | "explorer";
}

const countries = [
  { code: "AR", label: "Argentina", status: "Obras CONTRAT.AR", ready: true },
  { code: "PE", label: "Peru", status: "Contratos OECE", ready: true },
  { code: "CL", label: "Chile", status: "Adjudicaciones", ready: true },
] as const;

export default function FaroExperience({
  dataset,
  crossCountryCases,
  explorerCases,
  initialCountry = "AR",
  initialEntryOpen = true,
  initialMode = "map",
}: Props) {
  const allCases = useMemo(
    () => explorerCases ?? [...dataset.cases, ...crossCountryCases],
    [crossCountryCases, dataset.cases, explorerCases],
  );
  const yearBounds = useMemo(() => getYearBounds(allCases), [allCases]);
  const [entryOpen, setEntryOpen] = useState(initialEntryOpen);
  const [selectedCountry, setSelectedCountry] = useState<"AR" | "PE" | "CL">(initialCountry);
  const [selectedCaseId, setSelectedCaseId] = useState(() => selectDefaultCase(allCases));
  const [query, setQuery] = useState("");
  const [year, setYear] = useState(yearBounds.max);
  const [traceMode, setTraceMode] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "explorer">(initialMode);
  const [explorerPanelMode, setExplorerPanelMode] = useState<"inspector" | "expediente">("inspector");

  useEffect(() => {
    setYear(yearBounds.max);
  }, [yearBounds.max]);

  useEffect(() => {
    if (viewMode === "explorer") setExplorerPanelMode("inspector");
  }, [selectedCaseId, viewMode]);

  const countryCases = useMemo(() => {
    return filterExplorerCases({
      countryCode: selectedCountry,
      argentinaCases: dataset.cases,
      crossCountryCases,
      query,
      year,
    });
  }, [crossCountryCases, dataset.cases, query, selectedCountry, year]);

  const leads = useMemo(
    () => buildCaseLeads(countryCases as SignalCaseFile[], { limit: 8 }),
    [countryCases],
  );

  useEffect(() => {
    const selectedPool = viewMode === "explorer" ? allCases : countryCases;
    if (!selectedPool.some((caseFile) => caseFile.id === selectedCaseId)) {
      setSelectedCaseId(selectDefaultCase(selectedPool));
    }
  }, [allCases, countryCases, selectedCaseId, viewMode]);

  const selectedPool = viewMode === "explorer" ? allCases : countryCases;
  const selectedCase =
    selectedPool.find((caseFile) => caseFile.id === selectedCaseId) ?? selectedPool[0] ?? null;
  const countryExplorerCases = useMemo(
    () => selectedCountry === "AR"
      ? []
      : orderSelectedCaseFirst(countryCases as CrossCountryCaseFile[], selectedCase?.id ?? null),
    [countryCases, selectedCase?.id, selectedCountry],
  );

  return (
    <main className="faroShell">
      {viewMode === "map" ? (
        <CaseMap
          cases={selectedCountry === "AR" ? countryCases : []}
          selectedCaseId={selectedCase?.id ?? null}
          traceMode={traceMode}
          onSelectCase={setSelectedCaseId}
        />
      ) : (
        <div className="explorerBackdrop" />
      )}
      <div className="mapVignette" />

      <header className="topBar">
        <FaroMark />
        <div className="topBarActions">
          <div className="modeSwitch" aria-label="Modo de exploracion">
            <button
              type="button"
              className={viewMode === "map" ? "active" : ""}
              onClick={() => setViewMode("map")}
            >
              <Map size={15} aria-hidden />
              Mapa
            </button>
            <button
              type="button"
              className={viewMode === "explorer" ? "active" : ""}
              onClick={() => setViewMode("explorer")}
            >
              <FileSearch size={15} aria-hidden />
              Explorer
            </button>
          </div>
          <div className="topBarMeta">
            <span>{viewMode === "explorer" ? "Modo investigador" : "Demo 90 seg"}</span>
            <strong>{viewMode === "explorer" ? allCases.length : countryCases.length}</strong>
            <span>{viewMode === "explorer" ? "expedientes" : selectedCountry === "AR" ? "puntos verificables" : "casos exportables"}</span>
          </div>
        </div>
      </header>

      {viewMode === "map" ? (
        <section className="searchDock" aria-label="Explorar casos">
          <label className="searchBox">
            <Search size={18} aria-hidden />
            <input
              aria-label="Buscar obra, organismo o proveedor"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar obra, organismo o proveedor"
            />
          </label>

          <div className="countryRail" aria-label="Paises">
            {countries.map((country) => (
              <button
                key={country.code}
                type="button"
                className={selectedCountry === country.code ? "active" : ""}
                aria-pressed={selectedCountry === country.code}
                onClick={() => setSelectedCountry(country.code)}
              >
                <Globe2 size={15} aria-hidden />
                <span>{country.label}</span>
                <small>{country.status}</small>
              </button>
            ))}
          </div>

          <div className="dateControl">
            <div>
              <SlidersHorizontal size={16} aria-hidden />
              <span>Hasta {year}</span>
            </div>
            <input
              aria-label="Filtrar por anio maximo"
              type="range"
              min={yearBounds.min}
              max={yearBounds.max}
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            />
          </div>

          <LeadFeed
            leads={leads}
            selectedCaseId={selectedCase?.id ?? null}
            onSelectCase={setSelectedCaseId}
          />
        </section>
      ) : (
        <InvestigatorExplorer
          cases={allCases}
          selectedCaseId={selectedCase?.id ?? null}
          onSelectCase={(caseId, countryCode) => {
            setSelectedCountry(countryCode);
            setExplorerPanelMode("inspector");
            setSelectedCaseId(caseId);
          }}
        />
      )}

      <aside className="casePanel" aria-label="Expediente Faro">
        {selectedCase && viewMode === "explorer" && explorerPanelMode === "inspector" ? (
          <CaseInspector
            caseFile={selectedCase}
            onOpenFull={() => setExplorerPanelMode("expediente")}
          />
        ) : selectedCase ? (
          <>
            {viewMode === "explorer" && (
              <div className="panelModeBar">
                <button type="button" onClick={() => setExplorerPanelMode("inspector")}>
                  Volver al inspector
                </button>
              </div>
            )}
            <CaseDetails
              caseFile={selectedCase}
              dataset={dataset}
              traceMode={traceMode}
              onTraceModeChange={setTraceMode}
            />
          </>
        ) : (
          <CountryExplorer
            selectedCountry={selectedCountry}
            cases={countryExplorerCases}
          />
        )}
      </aside>

      <footer className="statusStrip">
        <span>
          <ShieldCheck size={15} aria-hidden />
          Fuente oficial con hash local
        </span>
        <span>
          <Database size={15} aria-hidden />
          {dataset.stats.rawRows} filas crudas
        </span>
        <span>
          <MapPin size={15} aria-hidden />
          {countryCases.length} visibles
        </span>
      </footer>

      {entryOpen && (
        <EntryGate
          onStartGuide={() => {
            setViewMode("map");
            setEntryOpen(false);
          }}
          onEnterMap={() => {
            setViewMode("map");
            setEntryOpen(false);
          }}
          onEnterExplorer={() => {
            setViewMode("explorer");
            setExplorerPanelMode("inspector");
            setEntryOpen(false);
          }}
        />
      )}
    </main>
  );
}

function getYearBounds(cases: Array<{ year: number | null }>) {
  const years = cases.map((caseFile) => caseFile.year).filter((value): value is number => value !== null);
  return {
    min: Math.min(...years, 2017),
    max: Math.max(...years, 2023),
  };
}

function selectDefaultCase(cases: ExplorerCase[]): string {
  return cases.find((caseFile) =>
    "caseType" in caseFile &&
    caseFile.caseType === "procurement_contract" &&
    caseFile.coordinates !== null &&
    caseFile.bidderCount !== null
  )?.id ?? cases[0]?.id ?? "";
}

function orderSelectedCaseFirst(cases: CrossCountryCaseFile[], selectedCaseId: string | null): CrossCountryCaseFile[] {
  if (!selectedCaseId) return cases;
  const selectedIndex = cases.findIndex((caseFile) => caseFile.id === selectedCaseId);
  if (selectedIndex <= 0) return cases;
  const selectedCase = cases[selectedIndex];
  return [
    selectedCase,
    ...cases.slice(0, selectedIndex),
    ...cases.slice(selectedIndex + 1),
  ];
}
