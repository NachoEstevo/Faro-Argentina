"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, FileSearch, Map as MapIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import type { CaseDataset } from "@/lib/caseRepository";
import { loadYearlyReleases, pickReleaseForYear } from "@/lib/data/wayback";
import { resolveCaseYear } from "@/lib/data/caseYear";
import type { WaybackState } from "./WaybackControl";
import type { ArgentinaWorkCase } from "@/lib/data/argentinaWorks";
import { buildCaseLeads } from "@/lib/data/caseLeads";
import {
  buildCaseSignalContext,
  buildCaseSignals,
  getCaseAlertSeverity,
  type CaseSignalSeverity,
  type SignalCaseFile,
} from "@/lib/data/caseSignals";
import {
  FINDING_CODES,
  type FindingOption,
} from "./RegionalMap/SidebarFilters";
import type { CrossCountryCaseFile } from "@/lib/data/crossCountryCases";
import { filterExplorerCases, type ExplorerCase } from "@/lib/data/explorerCases";
import {
  buildSearchSuggestions,
  caseMatchesSearch,
  type SearchSuggestion,
} from "@/lib/data/searchSuggestions";
import CasePanel from "./MapUI/CasePanel";
import AportesView from "./Aportes/AportesView";
import EntryGate from "./EntryGate";
import ExplorerView from "./Explorer/ExplorerView";
import InvestigationsView from "./Investigations/InvestigationsView";
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
  initialMode?: "map" | "explorer" | "aportes" | "investigations";
  initialCaseId?: string;
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
  initialCaseId,
}: Props) {
  const router = useRouter();
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
  const [selectedCaseId, setSelectedCaseId] = useState<string>(initialCaseId ?? "");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [yearFrom, setYearFrom] = useState<number | null>(null);
  const [yearTo, setYearTo] = useState<number | null>(null);
  const [selectedFindings, setSelectedFindings] = useState<Set<FindingOption>>(new Set());
  const [selectedSeverities, setSelectedSeverities] = useState<Set<CaseSignalSeverity>>(new Set());
  const [traceMode, setTraceMode] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "explorer" | "aportes" | "investigations">(initialMode);
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

  // Clamp year range to current bounds whenever the country (and thus the
  // available year span) changes. Null means "match the bound" — clearing
  // any explicit pin so the range reads as wide as the country allows.
  useEffect(() => {
    setYearFrom((current) => {
      if (current === null) return null;
      if (current < yearBounds.min || current > yearBounds.max) return null;
      return current;
    });
    setYearTo((current) => {
      if (current === null) return null;
      if (current < yearBounds.min || current > yearBounds.max) return null;
      return current;
    });
  }, [yearBounds.min, yearBounds.max]);

  const effectiveYearFrom = yearFrom ?? yearBounds.min;
  const effectiveYearTo = yearTo ?? yearBounds.max;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [query]);

  // Country review pool: country-scoped, NOT yet filtered by the UI's
  // year / family / case-type / severity chips. Used to build the
  // signal context so chip filters don't reshape signal computation.
  const countryReviewContextCases = useMemo(() => {
    return filterCountryReviewCases({
      cases: allCases,
      countryCode: selectedCountry,
      query: "",
      year: null,
    });
  }, [allCases, selectedCountry]);

  const countrySignalContext = useMemo(
    () => buildCaseSignalContext(countryReviewContextCases as SignalCaseFile[]),
    [countryReviewContextCases],
  );

  // Apply the active sidebar filters (year range, case type, family, severity)
  // to produce the cases that drive both the map markers and the lead list.
  const countryReviewCases = useMemo(() => {
    const base = filterCountryReviewCases({
      cases: allCases,
      countryCode: selectedCountry,
      query: debouncedQuery,
      year: null,
    }).filter((caseFile) => {
      if (
        caseFile.year !== null &&
        (caseFile.year < effectiveYearFrom || caseFile.year > effectiveYearTo)
      ) {
        return false;
      }
      return true;
    });

    if (selectedFindings.size === 0 && selectedSeverities.size === 0) {
      return base;
    }

    // Pre-compute the union of signal codes a case needs to expose to match
    // the active "Hallazgo" chips. A case matches if it carries ANY of those
    // codes (OR within findings, AND across other filter groups).
    const findingCodes = new Set<string>();
    for (const finding of selectedFindings) {
      for (const code of FINDING_CODES[finding]) findingCodes.add(code);
    }

    return base.filter((caseFile) => {
      if (selectedSeverities.size > 0) {
        const severity = getCaseAlertSeverity(caseFile as SignalCaseFile);
        if (!severity || !selectedSeverities.has(severity)) return false;
      }
      if (findingCodes.size > 0) {
        const signals = buildCaseSignals(caseFile as SignalCaseFile, countrySignalContext);
        if (!signals.some((signal) => findingCodes.has(signal.code))) return false;
      }
      return true;
    });
  }, [
    allCases,
    countrySignalContext,
    debouncedQuery,
    effectiveYearFrom,
    effectiveYearTo,
    selectedCountry,
    selectedFindings,
    selectedSeverities,
  ]);

  const leads = useMemo(
    () => buildCaseLeads(countryReviewCases as SignalCaseFile[], { query: debouncedQuery, limit: 1000 }),
    [countryReviewCases, debouncedQuery],
  );

  const searchSuggestions = useMemo(
    () => buildSearchSuggestions(countryReviewContextCases, query, { limit: 8 }),
    [countryReviewContextCases, query],
  );

  const handleSelectSearchSuggestion = useCallback((suggestion: SearchSuggestion) => {
    setQuery(suggestion.query);
    setDebouncedQuery(suggestion.query);
    if (suggestion.caseId) setSelectedCaseId(suggestion.caseId);
  }, []);

  const severityCounts = useMemo(() => {
    let high = 0;
    let medium = 0;
    let total = 0;
    for (const caseFile of countryReviewCases) {
      if (!caseFile.coordinates) continue;
      total += 1;
      const severity = getCaseAlertSeverity(caseFile as SignalCaseFile);
      if (severity === "high") high += 1;
      else if (severity === "medium") medium += 1;
    }
    return { high, medium, total };
  }, [countryReviewCases]);

  useEffect(() => {
    if (viewMode === "aportes" || viewMode === "investigations") {
      setSelectedCaseId("");
      return;
    }
    const selectedPool = viewMode === "explorer" ? allCases : countryReviewCases;
    if (selectedCaseId && !selectedPool.some((caseFile) => caseFile.id === selectedCaseId)) {
      setSelectedCaseId("");
    }
  }, [allCases, countryReviewCases, selectedCaseId, viewMode]);

  const selectedPool = viewMode === "explorer" ? allCases : countryReviewCases;
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

  const handleToggleFinding = useCallback((finding: FindingOption) => {
    setSelectedFindings((current) => {
      const next = new Set(current);
      if (next.has(finding)) next.delete(finding);
      else next.add(finding);
      return next;
    });
  }, []);

  const handleToggleSeverity = useCallback((severity: CaseSignalSeverity) => {
    setSelectedSeverities((current) => {
      const next = new Set(current);
      if (next.has(severity)) next.delete(severity);
      else next.add(severity);
      return next;
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setYearFrom(null);
    setYearTo(null);
    setSelectedFindings(new Set());
    setSelectedSeverities(new Set());
  }, []);

  const filtersValue = useMemo(
    () => ({
      yearFrom: effectiveYearFrom,
      yearTo: effectiveYearTo,
      findings: selectedFindings,
      severities: selectedSeverities,
    }),
    [effectiveYearFrom, effectiveYearTo, selectedFindings, selectedSeverities],
  );

  useEffect(() => {
    setSidebarCollapsed(Boolean(selectedCaseId));
  }, [selectedCaseId]);

  const handleOpenMobileMenu = useCallback(() => setMobileMenuOpen(true), []);
  const handleCloseMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  const country = COUNTRY_META[selectedCountry];
  const syncLabel = "Datos hasta mayo 2026";
  const showMapChrome = viewMode === "map";
  const showOverlayChrome = viewMode === "map" || viewMode === "explorer";

  const shellClasses = [
    styles.shell,
    sidebarCollapsed ? styles.shellCollapsed : "",
    mobileMenuOpen ? styles.shellMobileMenuOpen : "",
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    if (!showMapChrome) setMobileMenuOpen(false);
  }, [showMapChrome]);

  return (
    <main className={shellClasses}>
      <div className={styles.mapArea}>
        <div className={styles.leafletHost}>
          {viewMode === "map" ? (
            <CaseMap
              cases={countryReviewCases}
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

      {showMapChrome && <MobileHeader onOpenMenu={handleOpenMobileMenu} />}

      {showMapChrome && (
        <CountrySidebar
          countryName={country.label}
          sourceLabel={country.status}
          visibleCount={countryReviewCases.length}
          query={query}
          onQueryChange={setQuery}
          searchSuggestions={searchSuggestions}
          searchPending={query.trim() !== debouncedQuery.trim()}
          onSelectSearchSuggestion={handleSelectSearchSuggestion}
          filters={filtersValue}
          yearBounds={yearBounds}
          onYearFromChange={(value) =>
            setYearFrom(value === yearBounds.min ? null : value)
          }
          onYearToChange={(value) =>
            setYearTo(value === yearBounds.max ? null : value)
          }
          onToggleFinding={handleToggleFinding}
          onToggleSeverity={handleToggleSeverity}
          onClearFilters={handleClearFilters}
          leads={leads}
          selectedCaseId={selectedCase?.id ?? null}
          onSelectCase={setSelectedCaseId}
          syncLabel={syncLabel}
          collapsed={sidebarCollapsed}
          onToggle={handleSidebarToggle}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={handleCloseMobileMenu}
        />
      )}

      {showMapChrome && mobileMenuOpen && (
        <button
          type="button"
          className={styles.mobileBackdrop}
          onClick={handleCloseMobileMenu}
          aria-label="Cerrar menú"
        />
      )}

      {showOverlayChrome && (
        <div className={styles.overlayLayer}>
          <button
            type="button"
            className={styles.backToGlobal}
            onClick={() => {
              if (selectedCaseId) {
                setSelectedCaseId("");
                return;
              }
              router.push("/");
            }}
            aria-label={selectedCaseId ? `Volver a ${country.label}` : "Volver al mapa general"}
          >
            <ArrowLeft size={14} aria-hidden />
            <span>{selectedCaseId ? country.label : "Mapa general"}</span>
          </button>
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
      )}

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

      {viewMode === "aportes" && (
        <AportesView
          selectedCountry={selectedCountry}
          onSwitchToMap={() => setViewMode("map")}
          onSwitchToExplorer={() => setViewMode("explorer")}
          onSwitchToInvestigations={() => setViewMode("investigations")}
        />
      )}

      {viewMode === "investigations" && (
        <InvestigationsView
          cases={allCases}
          selectedCountry={selectedCountry}
          onSwitchToMap={() => setViewMode("map")}
          onSwitchToExplorer={() => setViewMode("explorer")}
          onSwitchToAportes={() => setViewMode("aportes")}
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
  const currentYear = new Date().getFullYear();
  const years = cases
    .map((caseFile) => caseFile.year)
    .filter((value): value is number => value !== null);
  if (years.length === 0) {
    return { min: currentYear, max: currentYear };
  }
  // The upper bound always reaches the current year so the slider can include
  // "today" even when the dataset hasn't ingested cases for it yet.
  return {
    min: Math.min(...years),
    max: Math.max(Math.max(...years), currentYear),
  };
}

function filterCountryReviewCases({
  cases,
  countryCode,
  query,
  year,
}: {
  cases: ExplorerCase[];
  countryCode: "AR" | "PE" | "CL";
  query: string;
  year: number | null;
}): ExplorerCase[] {
  return cases.filter((caseFile) => {
    if (caseFile.countryCode !== countryCode) return false;
    if (year !== null && caseFile.year !== year) return false;
    return caseMatchesSearch(caseFile, query);
  });
}
