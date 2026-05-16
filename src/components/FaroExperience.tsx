"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  Database,
  Globe2,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

import type { CaseDataset } from "@/lib/caseRepository";
import type { ArgentinaWorkCase } from "@/lib/data/argentinaWorks";
import { CaseDetails, EmptyCountry } from "./CaseDetails";
import EntryGate from "./EntryGate";
import FaroMark from "./FaroMark";

const CaseMap = dynamic(() => import("./CaseMap"), {
  ssr: false,
  loading: () => <div className="mapLoading">Cargando mapa</div>,
});

interface Props {
  dataset: CaseDataset<ArgentinaWorkCase>;
}

const countries = [
  { code: "AR", label: "Argentina", status: "Obras CONTRAT.AR", ready: true },
  { code: "PE", label: "Peru", status: "SEACE/OECE", ready: false },
  { code: "CL", label: "Chile", status: "ChileCompra", ready: false },
] as const;

export default function FaroExperience({ dataset }: Props) {
  const yearBounds = useMemo(() => getYearBounds(dataset.cases), [dataset.cases]);
  const [entryOpen, setEntryOpen] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<"AR" | "PE" | "CL">("AR");
  const [selectedCaseId, setSelectedCaseId] = useState(dataset.cases[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [year, setYear] = useState(yearBounds.max);
  const [traceMode, setTraceMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "map") setEntryOpen(false);
  }, []);

  useEffect(() => {
    setYear(yearBounds.max);
  }, [yearBounds.max]);

  const filteredCases = useMemo(() => {
    if (selectedCountry !== "AR") return [];
    const normalizedQuery = query.trim().toLowerCase();
    return dataset.cases.filter((caseFile) => {
      const matchesYear = caseFile.year === null || caseFile.year <= year;
      const searchable = [
        caseFile.title,
        caseFile.workNumber,
        caseFile.procedureNumber,
        caseFile.agencyName,
      ]
        .join(" ")
        .toLowerCase();
      return matchesYear && (normalizedQuery.length === 0 || searchable.includes(normalizedQuery));
    });
  }, [dataset.cases, query, selectedCountry, year]);

  useEffect(() => {
    if (!filteredCases.some((caseFile) => caseFile.id === selectedCaseId)) {
      setSelectedCaseId(filteredCases[0]?.id ?? "");
    }
  }, [filteredCases, selectedCaseId]);

  const selectedCase =
    filteredCases.find((caseFile) => caseFile.id === selectedCaseId) ?? filteredCases[0] ?? null;

  return (
    <main className="faroShell">
      <CaseMap
        cases={filteredCases}
        selectedCaseId={selectedCase?.id ?? null}
        traceMode={traceMode}
        onSelectCase={setSelectedCaseId}
      />
      <div className="mapVignette" />

      <header className="topBar">
        <FaroMark />
        <div className="topBarMeta">
          <span>Demo 90 seg</span>
          <strong>{dataset.stats.mapReadyCases}</strong>
          <span>puntos verificables</span>
        </div>
      </header>

      <section className="searchDock" aria-label="Explorar casos">
        <label className="searchBox">
          <Search size={18} aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar obra, organismo o numero"
          />
        </label>

        <div className="countryRail" aria-label="Paises">
          {countries.map((country) => (
            <button
              key={country.code}
              type="button"
              className={selectedCountry === country.code ? "active" : ""}
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
            type="range"
            min={yearBounds.min}
            max={yearBounds.max}
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          />
        </div>
      </section>

      <aside className="casePanel" aria-label="Expediente Faro">
        {selectedCase ? (
          <CaseDetails
            caseFile={selectedCase}
            dataset={dataset}
            traceMode={traceMode}
            onTraceModeChange={setTraceMode}
          />
        ) : (
          <EmptyCountry selectedCountry={selectedCountry} />
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
          {filteredCases.length} visibles
        </span>
      </footer>

      {entryOpen && <EntryGate onEnter={() => setEntryOpen(false)} />}
    </main>
  );
}

function getYearBounds(cases: ArgentinaWorkCase[]) {
  const years = cases.map((caseFile) => caseFile.year).filter((value): value is number => value !== null);
  return {
    min: Math.min(...years, 2017),
    max: Math.max(...years, 2023),
  };
}
