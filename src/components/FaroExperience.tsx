"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, FileSearch, Map as MapIcon } from "lucide-react";
import Link from "next/link";

import type { CaseDataset } from "@/lib/caseRepository";
import { loadYearlyReleases, pickReleaseForYear } from "@/lib/data/wayback";
import { resolveCaseYear } from "@/lib/data/caseYear";
import type { WaybackState } from "./WaybackControl";
import type { ArgentinaWorkCase } from "@/lib/data/argentinaWorks";
import { buildCaseLeads } from "@/lib/data/caseLeads";
import {
  buildCaseSignalContext,
  getCaseAlertSeverity,
  type SignalCaseFile,
} from "@/lib/data/caseSignals";
import type { CrossCountryCaseFile } from "@/lib/data/crossCountryCases";
import { filterExplorerCases, type ExplorerCase } from "@/lib/data/explorerCases";
import CasePanel from "./MapUI/CasePanel";
import EntryGate from "./EntryGate";
import ExplorerView from "./Explorer/ExplorerView";
import CountrySidebar from "./RegionalMap/CountrySidebar";
import MapLegend from "./RegionalMap/MapLegend";
import MobileHeader from "./RegionalMap/MobileHeader";
import styles from "./RegionalMap/RegionalMap.module.css";

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

const COUNTRY_META: Record<"AR" | "PE" | "CL", { label: string; status: string }> = {
  AR: { label: "Argentina", status: "Obras CONTRAT.AR" },
  PE: { label: "Perú", status: "Contratos OECE" },
  CL: { label: "Chile", status: "Adjudicaciones" },
};

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
  const explorerSignalContext = useMemo(
    () => buildCaseSignalContext(allCases as SignalCaseFile[]),
    [allCases],
  );
  const [entryOpen, setEntryOpen] = useState(initialEntryOpen);
  const [selectedCountry, setSelectedCountry] = useState<"AR" | "PE" | "CL">(initialCountry);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [traceMode, setTraceMode] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "explorer">(initialMode);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [waybackState, setWaybackState] = useState<WaybackState>({ status: "off" });
  const [waybackRetryToken, setWaybackRetryToken] = useState(0);
  const hasArmedWaybackRef = useRef(false);

  const yearBounds = useMemo(() => {
    const pool = filterExplorerCases({
      countryCode: selectedCountry,
      argentinaCases: dataset.cases,
      crossCountryCases,
      query: "",
      year: null,
    });
    return getYearBounds(pool);
  }, [crossCountryCases, dataset.cases, selectedCountry]);

  useEffect(() => {
    if (year === null) return;
    if (year < yearBounds.min || year > yearBounds.max) setYear(null);
  }, [year, yearBounds.min, yearBounds.max]);

  const countryCases = useMemo(() => {
    const filtered = filterExplorerCases({
      countryCode: selectedCountry,
      argentinaCases: dataset.cases,
      crossCountryCases,
      query,
      year: null,
    });
    if (year === null) return filtered;
    return filtered.filter((caseFile) => caseFile.year === year);
  }, [crossCountryCases, dataset.cases, query, selectedCountry, year]);

  const countryContextCases = useMemo(() => {
    const filtered = filterExplorerCases({
      countryCode: selectedCountry,
      argentinaCases: dataset.cases,
      crossCountryCases,
      query: "",
      year: null,
    });
    if (year === null) return filtered;
    return filtered.filter((caseFile) => caseFile.year === year);
  }, [crossCountryCases, dataset.cases, selectedCountry, year]);

  const countrySignalContext = useMemo(
    () => buildCaseSignalContext(countryContextCases as SignalCaseFile[]),
    [countryContextCases],
  );

  const leads = useMemo(
    () => buildCaseLeads(countryContextCases as SignalCaseFile[], { query, limit: 8 }),
    [countryContextCases, query],
  );

  const severityCounts = useMemo(() => {
    let high = 0;
    let medium = 0;
    let total = 0;
    for (const caseFile of countryCases) {
      if (!caseFile.coordinates) continue;
      total += 1;
      const severity = getCaseAlertSeverity(caseFile as SignalCaseFile);
      if (severity === "high") high += 1;
      else if (severity === "medium") medium += 1;
    }
    return { high, medium, total };
  }, [countryCases]);

  useEffect(() => {
    const selectedPool = viewMode === "explorer" ? allCases : countryCases;
    if (selectedCaseId && !selectedPool.some((caseFile) => caseFile.id === selectedCaseId)) {
      setSelectedCaseId("");
    }
  }, [allCases, countryCases, selectedCaseId, viewMode]);

  const selectedPool = viewMode === "explorer" ? allCases : countryCases;
  const selectedCase =
    selectedPool.find((caseFile) => caseFile.id === selectedCaseId) ?? null;
  const activeSignalContext = viewMode === "map" ? countrySignalContext : explorerSignalContext;

  useEffect(() => {
    let cancelled = false;
    const coordinates = selectedCase?.coordinates;
    const caseId = selectedCase?.id;
    if (!caseId || !coordinates || viewMode !== "map") {
      setWaybackState({ status: "off" });
      hasArmedWaybackRef.current = true;
      return;
    }
    if (!hasArmedWaybackRef.current) {
      hasArmedWaybackRef.current = true;
      return;
    }
    setWaybackState({ status: "loading", caseId });
    loadYearlyReleases()
      .then((releases) => {
        if (cancelled) return;
        if (releases.length === 0) {
          setWaybackState({ status: "error", caseId, message: "Wayback no devolvio releases disponibles." });
          return;
        }
        const targetYear = selectedCase ? resolveCaseYear(selectedCase) : null;
        const initial = pickReleaseForYear(releases, targetYear) ?? releases[releases.length - 1];
        setWaybackState({
          status: "active",
          caseId,
          releases,
          activeReleaseId: initial.releaseId,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setWaybackState({
          status: "error",
          caseId,
          message: error instanceof Error ? error.message : "Error desconocido",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCase?.id, selectedCase?.coordinates?.lat, selectedCase?.coordinates?.lon, viewMode, waybackRetryToken]);

  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed((value) => !value);
  }, []);

  const handleOpenMobileMenu = useCallback(() => setMobileMenuOpen(true), []);
  const handleCloseMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  const country = COUNTRY_META[selectedCountry];
  const syncLabel = "Datos hasta mayo 2026";

  const shellClasses = [
    styles.shell,
    sidebarCollapsed ? styles.shellCollapsed : "",
    mobileMenuOpen ? styles.shellMobileMenuOpen : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className={shellClasses}>
      <div className={styles.mapArea}>
        <div className={styles.leafletHost}>
          {viewMode === "map" ? (
            <CaseMap
              cases={countryCases}
              selectedCaseId={selectedCase?.id ?? null}
              traceMode={traceMode}
              onSelectCase={setSelectedCaseId}
              waybackState={waybackState}
            />
          ) : (
            <div className="explorerBackdrop" />
          )}
        </div>
      </div>

      <MobileHeader onOpenMenu={handleOpenMobileMenu} />

      <CountrySidebar
        countryName={country.label}
        sourceLabel={country.status}
        visibleCount={countryCases.length}
        query={query}
        onQueryChange={setQuery}
        year={year}
        yearBounds={yearBounds}
        onYearChange={setYear}
        leads={leads}
        selectedCaseId={selectedCase?.id ?? null}
        onSelectCase={setSelectedCaseId}
        syncLabel={syncLabel}
        collapsed={sidebarCollapsed}
        onToggle={handleSidebarToggle}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={handleCloseMobileMenu}
      />

      {mobileMenuOpen && (
        <button
          type="button"
          className={styles.mobileBackdrop}
          onClick={handleCloseMobileMenu}
          aria-label="Cerrar menú"
        />
      )}

      <div className={styles.overlayLayer}>
        <Link href="/" className={styles.backToGlobal} aria-label="Volver al mapa general">
          <ArrowLeft size={14} aria-hidden />
          <span>Mapa general</span>
        </Link>
        <div className={styles.floatingToggle} role="group" aria-label="Modo de exploración">
          <button
            type="button"
            className={`${styles.floatingToggleButton} ${viewMode === "map" ? styles.active : ""}`}
            onClick={() => setViewMode("map")}
            aria-pressed={viewMode === "map"}
          >
            <MapIcon size={13} aria-hidden />
            Mapa
          </button>
          <button
            type="button"
            className={`${styles.floatingToggleButton} ${viewMode === "explorer" ? styles.active : ""}`}
            onClick={() => setViewMode("explorer")}
            aria-pressed={viewMode === "explorer"}
          >
            <FileSearch size={13} aria-hidden />
            Explorer
          </button>
        </div>
        {viewMode === "map" && !selectedCase && (
          <MapLegend
            highCount={severityCounts.high}
            mediumCount={severityCounts.medium}
            totalCount={severityCounts.total}
          />
        )}
      </div>

      {viewMode === "explorer" && (
        <ExplorerView
          cases={allCases}
          selectedCountry={selectedCountry}
          onSelectCountry={setSelectedCountry}
          selectedCase={selectedCase}
          onSelectCase={(caseId, countryCode) => {
            setSelectedCountry(countryCode);
            setSelectedCaseId(caseId);
          }}
          onClearSelection={() => setSelectedCaseId("")}
          onSwitchToMap={() => setViewMode("map")}
        />
      )}

      {selectedCase && viewMode === "map" && (
        <aside className="casePanel" aria-label="Expediente Faro">
          <CasePanel
            caseFile={selectedCase}
            signalContext={activeSignalContext}
            traceMode={traceMode}
            onTraceModeChange={setTraceMode}
            onClose={() => setSelectedCaseId("")}
            waybackState={waybackState}
            onWaybackReleaseChange={(releaseId) => {
              setWaybackState((current) =>
                current.status === "active" ? { ...current, activeReleaseId: releaseId } : current,
              );
            }}
            onWaybackRetry={() => setWaybackRetryToken((token) => token + 1)}
          />
        </aside>
      )}

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
            setEntryOpen(false);
          }}
        />
      )}
    </main>
  );
}

function getYearBounds(cases: Array<{ year: number | null }>) {
  const years = cases.map((caseFile) => caseFile.year).filter((value): value is number => value !== null);
  if (years.length === 0) {
    const currentYear = new Date().getFullYear();
    return { min: currentYear, max: currentYear };
  }
  return {
    min: Math.min(...years),
    max: Math.max(...years),
  };
}
