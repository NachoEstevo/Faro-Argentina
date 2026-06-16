"use client";

import dynamic from "next/dynamic";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";

import { loadYearlyReleases, pickReleaseForYear } from "@/lib/data/wayback";
import { resolveCaseYear } from "@/lib/data/caseYear";
import type { WaybackState } from "./WaybackControl";
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
import type { ExplorerCase } from "@/lib/data/explorerCases";
import {
  buildSearchSuggestionIndex,
  buildSearchSuggestionsFromIndex,
  caseMatchesSearch,
  type SearchSuggestion,
} from "@/lib/data/searchSuggestions";
import CasePanel from "./MapUI/CasePanel";
import AportesView from "./Aportes/AportesView";
import EntryGate from "./EntryGate";
import ExplorerView from "./Explorer/ExplorerView";
import InvestigationsView from "./Investigations/InvestigationsView";
import PlatformModeNav, { buildPlatformModeHref, type PlatformMode } from "./PlatformModeNav";
import CountrySidebar from "./RegionalMap/CountrySidebar";
import LeadsPanel from "./RegionalMap/LeadsPanel";
import MapLegend from "./RegionalMap/MapLegend";
import MobileHeader from "./RegionalMap/MobileHeader";
import styles from "./RegionalMap/RegionalMap.module.css";

const CaseMap = dynamic(() => import("./CaseMap"), {
  ssr: false,
  loading: () => <div className="mapLoading">Cargando mapa</div>,
});

interface Props {
  initialCases: ExplorerCase[];
  fullCasesHref?: string;
  initialCountry?: "AR";
  initialEntryOpen?: boolean;
  initialMode?: PlatformMode;
  initialCaseId?: string;
  initialExplorerPreset?: "selected" | null;
}

type InterfaceTheme = "dark" | "light";
type CaseCorpusStatus = "initial" | "loading" | "ready" | "error";

const INTERFACE_THEME_STORAGE_KEY = "faro-interface-theme";
const fullCaseCorpusPromises = new Map<string, Promise<ExplorerCase[]>>();

const COUNTRY_META: Record<"AR", { label: string; status: string }> = {
  AR: { label: "Argentina", status: "CONTRAT.AR + Mapa de Inversiones" },
};

export default function FaroExperience({
  initialCases,
  fullCasesHref,
  initialCountry = "AR",
  initialEntryOpen = true,
  initialMode = "map",
  initialCaseId,
  initialExplorerPreset = null,
}: Props) {
  const router = useRouter();
  const [allCases, setAllCases] = useState<ExplorerCase[]>(() => initialCases);
  const [caseCorpusStatus, setCaseCorpusStatus] = useState<CaseCorpusStatus>(
    fullCasesHref ? "initial" : "ready",
  );
  const [caseCorpusError, setCaseCorpusError] = useState("");
  const [caseCorpusRequestKey, setCaseCorpusRequestKey] = useState(0);
  const explorerSignalContext = useMemo(
    () => buildCaseSignalContext(allCases as SignalCaseFile[]),
    [allCases],
  );
  const [entryOpen, setEntryOpen] = useState(initialEntryOpen);
  const [selectedCountry, setSelectedCountry] = useState<"AR">(initialCountry);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(initialCaseId ?? "");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [yearFrom, setYearFrom] = useState<number | null>(null);
  const [yearTo, setYearTo] = useState<number | null>(null);
  const [selectedFindings, setSelectedFindings] = useState<Set<FindingOption>>(new Set());
  const [selectedSeverities, setSelectedSeverities] = useState<Set<CaseSignalSeverity>>(new Set());
  const [traceMode, setTraceMode] = useState(false);
  const [viewMode, setViewMode] = useState<PlatformMode>(initialMode);
  const [interfaceTheme, setInterfaceThemeState] = useState<InterfaceTheme>("dark");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [waybackState, setWaybackState] = useState<WaybackState>({ status: "off" });
  const [waybackTileLoading, setWaybackTileLoading] = useState(false);
  const [waybackRetryToken, setWaybackRetryToken] = useState(0);
  const [leadsPanelOpen, setLeadsPanelOpen] = useState(false);
  const hasArmedWaybackRef = useRef(false);
  const needsFullCaseCorpus = viewMode !== "map";
  const hasFullCaseCorpus = !fullCasesHref || caseCorpusStatus === "ready";

  useEffect(() => {
    if (!needsFullCaseCorpus || !fullCasesHref || caseCorpusStatus === "ready") return;

    let cancelled = false;
    setCaseCorpusStatus("loading");
    setCaseCorpusError("");
    loadFullCaseCorpus(fullCasesHref)
      .then((cases) => {
        if (cancelled) return;
        setAllCases(cases);
        setCaseCorpusStatus("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCaseCorpusError(error instanceof Error ? error.message : "Error desconocido");
        setCaseCorpusStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [caseCorpusRequestKey, fullCasesHref, needsFullCaseCorpus]);

  const handleRetryCaseCorpus = useCallback(() => {
    if (!fullCasesHref) return;
    fullCaseCorpusPromises.delete(fullCasesHref);
    setCaseCorpusStatus("initial");
    setCaseCorpusError("");
    setCaseCorpusRequestKey((key) => key + 1);
  }, [fullCasesHref]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(INTERFACE_THEME_STORAGE_KEY);
      if (stored === "dark" || stored === "light") {
        setInterfaceThemeState(stored);
      }
    } catch {
      // Theme persistence is a convenience; platform views still render.
    }
  }, []);

  const setInterfaceTheme = useCallback((theme: InterfaceTheme) => {
    setInterfaceThemeState(theme);
    try {
      window.localStorage.setItem(INTERFACE_THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore private-mode storage failures.
    }
  }, []);

  const switchViewMode = useCallback(
    (mode: PlatformMode) => {
      setViewMode(mode);
      router.replace(buildPlatformModeHref(mode, selectedCountry), { scroll: false });
    },
    [router, selectedCountry],
  );

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

  const yearBounds = useMemo(() => getYearBounds(countryReviewContextCases), [countryReviewContextCases]);

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
    // the active signal chips. A case matches if it carries ANY of those
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

  const searchSuggestionIndex = useMemo(
    () => buildSearchSuggestionIndex(countryReviewContextCases),
    [countryReviewContextCases],
  );
  const searchSuggestions = useMemo(
    () => buildSearchSuggestionsFromIndex(searchSuggestionIndex, deferredQuery, { limit: 8 }),
    [deferredQuery, searchSuggestionIndex],
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
  const selectedCaseWaybackEligible = shouldEnableWaybackForCase(selectedCase);
  const activeSignalContext = viewMode === "map" ? countrySignalContext : explorerSignalContext;

  useEffect(() => {
    let cancelled = false;
    const coordinates = selectedCase?.coordinates;
    const caseId = selectedCase?.id;
    if (!caseId || !coordinates || viewMode !== "map" || !selectedCaseWaybackEligible) {
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
  }, [selectedCase?.id, selectedCase?.coordinates?.lat, selectedCase?.coordinates?.lon, selectedCaseWaybackEligible, viewMode, waybackRetryToken]);

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

  const handleSelectLead = useCallback(
    (caseId: string) => {
      setSelectedCaseId(caseId);
      setLeadsPanelOpen(false);
    },
    [],
  );

  useEffect(() => {
    if (viewMode !== "map") setLeadsPanelOpen(false);
  }, [viewMode]);

  const handleToggleLeadsPanel = useCallback(() => {
    setLeadsPanelOpen((open) => !open);
  }, []);

  const handleCloseLeadsPanel = useCallback(() => {
    setLeadsPanelOpen(false);
  }, []);

  const handleWaybackTileLoadingChange = useCallback((loading: boolean) => {
    setWaybackTileLoading(loading);
  }, []);

  const country = COUNTRY_META[selectedCountry];
  const syncLabel = "Datos hasta mayo 2026";
  const showMapChrome = viewMode === "map";
  const showBackControl = viewMode === "map";
  const activePlatformTheme = viewMode === "map" ? "dark" : interfaceTheme;

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
    <main className={shellClasses} data-platform-theme={activePlatformTheme}>
      <div className={styles.mapArea}>
        <div className={styles.leafletHost}>
          {viewMode === "map" ? (
            <CaseMap
              cases={countryReviewCases}
              selectedCaseId={selectedCase?.id ?? null}
              traceMode={traceMode}
              onSelectCase={setSelectedCaseId}
              waybackState={waybackState}
              onWaybackTileLoadingChange={handleWaybackTileLoadingChange}
            />
          ) : (
            <div className="explorerBackdrop" />
          )}
        </div>
        {showMapChrome && waybackTileLoading && (
          <div
            className={`${styles.mapTileStatusRegion} ${selectedCase ? styles.mapTileStatusRegionWithCase : ""}`}
          >
            <div className={styles.mapTileStatus} role="status" aria-live="polite">
              <span className={styles.mapTileSpinner} aria-hidden />
              <span>Cargando imagen satelital</span>
            </div>
          </div>
        )}
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
          leadsCount={leads.length}
          leadsPanelOpen={leadsPanelOpen}
          onOpenLeadsPanel={handleToggleLeadsPanel}
          syncLabel={syncLabel}
          collapsed={sidebarCollapsed}
          onToggle={handleSidebarToggle}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={handleCloseMobileMenu}
        />
      )}

      {showMapChrome && (
        <LeadsPanel
          open={leadsPanelOpen}
          leads={leads}
          selectedCaseId={selectedCase?.id ?? null}
          onSelectCase={handleSelectLead}
          onClose={handleCloseLeadsPanel}
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

      <div className={styles.overlayLayer}>
        <div className={styles.overlayTopBar}>
          {showBackControl && (
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
          )}
          <PlatformModeNav
            activeMode={viewMode}
            onModeChange={switchViewMode}
            variant="floatingBar"
          />
        </div>
        {viewMode === "map" && !selectedCase && (
          <MapLegend
            highCount={severityCounts.high}
            mediumCount={severityCounts.medium}
            totalCount={severityCounts.total}
          />
        )}
      </div>

      {viewMode !== "map" && (
        <InterfaceThemeToggle
          theme={interfaceTheme}
          onThemeChange={setInterfaceTheme}
        />
      )}

      {viewMode === "explorer" && (
        hasFullCaseCorpus ? (
          <ExplorerView
            cases={allCases}
            selectedCountry={selectedCountry}
            selectedCase={selectedCase}
            onSelectCase={(caseId, countryCode) => {
              setSelectedCountry(countryCode);
              setSelectedCaseId(caseId);
            }}
            onClearSelection={() => setSelectedCaseId("")}
            onSwitchToInvestigations={() => switchViewMode("investigations")}
            initialPreset={initialExplorerPreset}
          />
        ) : (
          <CaseCorpusGate
            status={caseCorpusStatus}
            error={caseCorpusError}
            onRetry={handleRetryCaseCorpus}
          />
        )
      )}

      {viewMode === "aportes" && (
        hasFullCaseCorpus ? (
          <AportesView
            selectedCountry={selectedCountry}
            cases={allCases}
          />
        ) : (
          <CaseCorpusGate
            status={caseCorpusStatus}
            error={caseCorpusError}
            onRetry={handleRetryCaseCorpus}
          />
        )
      )}

      {viewMode === "investigations" && (
        hasFullCaseCorpus ? (
          <InvestigationsView
            cases={allCases}
            selectedCountry={selectedCountry}
          />
        ) : (
          <CaseCorpusGate
            status={caseCorpusStatus}
            error={caseCorpusError}
            onRetry={handleRetryCaseCorpus}
          />
        )
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
            switchViewMode("map");
            setEntryOpen(false);
          }}
          onEnterMap={() => {
            switchViewMode("map");
            setEntryOpen(false);
          }}
          onEnterExplorer={() => {
            switchViewMode("explorer");
            setEntryOpen(false);
          }}
        />
      )}
    </main>
  );
}

function loadFullCaseCorpus(href: string): Promise<ExplorerCase[]> {
  const existing = fullCaseCorpusPromises.get(href);
  if (existing) return existing;

  const request = fetch(href, { cache: "force-cache" })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = (await response.json()) as { cases?: unknown };
      if (!Array.isArray(payload.cases)) {
        throw new Error("El corpus no tiene el formato esperado.");
      }
      return payload.cases as ExplorerCase[];
    })
    .catch((error: unknown) => {
      fullCaseCorpusPromises.delete(href);
      throw error;
    });

  fullCaseCorpusPromises.set(href, request);
  return request;
}

function CaseCorpusGate({
  status,
  error,
  onRetry,
}: {
  status: CaseCorpusStatus;
  error: string;
  onRetry: () => void;
}) {
  const isError = status === "error";

  return (
    <section className={styles.caseCorpusGate} aria-live="polite">
      <div className={styles.caseCorpusGatePanel} role={isError ? "alert" : "status"}>
        {!isError && <span className={styles.caseCorpusSpinner} aria-hidden />}
        <div className={styles.caseCorpusCopy}>
          <h1>{isError ? "No se pudo cargar el corpus" : "Cargando corpus investigador"}</h1>
          <p>
            {isError
              ? "La vista conserva el mapa inicial. Reintentá la descarga del corpus completo."
              : "Preparando los expedientes completos para esta vista."}
          </p>
          {isError && error && <small>{error}</small>}
        </div>
        {isError && (
          <button type="button" onClick={onRetry} className={styles.caseCorpusRetry}>
            Reintentar
          </button>
        )}
      </div>
    </section>
  );
}

function InterfaceThemeToggle({
  theme,
  onThemeChange,
}: {
  theme: InterfaceTheme;
  onThemeChange: (theme: InterfaceTheme) => void;
}) {
  const nextTheme: InterfaceTheme = theme === "dark" ? "light" : "dark";
  const nextLabel = nextTheme === "dark" ? "Cambiar a modo oscuro" : "Cambiar a modo claro";
  const ThemeIcon = theme === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      className={styles.interfaceThemeDock}
      onClick={() => onThemeChange(nextTheme)}
      aria-label={nextLabel}
      title={nextLabel}
    >
      <ThemeIcon size={15} aria-hidden />
    </button>
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

function shouldEnableWaybackForCase(caseFile: ExplorerCase | null): boolean {
  if (!caseFile?.coordinates) return false;
  if (!("geoEvidence" in caseFile) || !caseFile.geoEvidence?.length) return true;

  const mapEvidence = caseFile.geoEvidence.find((evidence) =>
    evidence.exposeOnMap && evidence.coordinates,
  );
  return mapEvidence ? mapEvidence.satelliteEligible : true;
}

function filterCountryReviewCases({
  cases,
  countryCode,
  query,
  year,
}: {
  cases: ExplorerCase[];
  countryCode: "AR";
  query: string;
  year: number | null;
}): ExplorerCase[] {
  return cases.filter((caseFile) => {
    if (caseFile.countryCode !== countryCode) return false;
    if (year !== null && caseFile.year !== year) return false;
    return caseMatchesSearch(caseFile, query);
  });
}
