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
import type { InvestigatorExplorerIndex } from "@/lib/data/investigatorExplorer";
import {
  buildSearchSuggestionIndex,
  buildSearchSuggestionsFromIndex,
  caseMatchesSearch,
  type SearchSuggestion,
} from "@/lib/data/searchSuggestions";
import CasePanel from "./MapUI/CasePanel";
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
const ExplorerView = dynamic(() => import("./Explorer/ExplorerView"), {
  ssr: false,
  loading: () => <div className="mapLoading">Preparando Explorer</div>,
});
const AportesView = dynamic(() => import("./Aportes/AportesView"), {
  ssr: false,
  loading: () => <div className="mapLoading">Preparando aportes</div>,
});
const InvestigationsView = dynamic(() => import("./Investigations/InvestigationsView"), {
  ssr: false,
  loading: () => <div className="mapLoading">Preparando carpetas</div>,
});
const EntryGate = dynamic(() => import("./EntryGate"), {
  ssr: false,
});

interface Props {
  initialCases: ExplorerCase[];
  fullCasesHref?: string;
  explorerIndexHref?: string;
  initialCountry?: "AR";
  initialEntryOpen?: boolean;
  initialMode?: PlatformMode;
  initialCaseId?: string;
  initialExplorerPreset?: "selected" | null;
}

type InterfaceTheme = "dark" | "light";
type PlatformTheme = InterfaceTheme | "mapCream";
type CaseCorpusStatus = "initial" | "loading" | "ready" | "error";

const INTERFACE_THEME_STORAGE_KEY = "faro-interface-theme";
const explorerIndexPromises = new Map<string, Promise<InvestigatorExplorerIndex>>();
const fullCaseCorpusPromises = new Map<string, Promise<ExplorerCase[]>>();
const fullMapCasePromises = new Map<string, Promise<ExplorerCase>>();

const COUNTRY_META: Record<"AR", { label: string; status: string }> = {
  AR: { label: "Argentina", status: "CONTRAT.AR + Mapa de Inversiones" },
};

export default function FaroExperience({
  initialCases,
  fullCasesHref,
  explorerIndexHref,
  initialCountry = "AR",
  initialEntryOpen = true,
  initialMode = "map",
  initialCaseId,
  initialExplorerPreset = null,
}: Props) {
  const router = useRouter();
  const [allCases, setAllCases] = useState<ExplorerCase[]>(() => initialCases);
  const [explorerIndex, setExplorerIndex] = useState<InvestigatorExplorerIndex | null>(null);
  const [explorerIndexStatus, setExplorerIndexStatus] = useState<CaseCorpusStatus>(
    explorerIndexHref ? "initial" : "error",
  );
  const [explorerIndexError, setExplorerIndexError] = useState("");
  const [explorerIndexRequestKey, setExplorerIndexRequestKey] = useState(0);
  const [caseCorpusStatus, setCaseCorpusStatus] = useState<CaseCorpusStatus>(
    fullCasesHref ? "initial" : "ready",
  );
  const [caseCorpusError, setCaseCorpusError] = useState("");
  const [caseCorpusRequestKey, setCaseCorpusRequestKey] = useState(0);
  const [selectedFullMapCase, setSelectedFullMapCase] = useState<ExplorerCase | null>(null);
  const [selectedFullMapCaseStatus, setSelectedFullMapCaseStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [selectedExplorerCase, setSelectedExplorerCase] = useState<ExplorerCase | null>(null);
  const [selectedExplorerCaseStatus, setSelectedExplorerCaseStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
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
  const needsExplorerIndex = viewMode === "explorer";
  const needsFullCaseCorpus = viewMode === "aportes" || viewMode === "investigations";
  const hasExplorerIndex = explorerIndexStatus === "ready" && explorerIndex !== null;
  const hasFullCaseCorpus = !fullCasesHref || caseCorpusStatus === "ready";

  useEffect(() => {
    if (!needsExplorerIndex || !explorerIndexHref || explorerIndexStatus === "ready") return;

    let cancelled = false;
    setExplorerIndexStatus("loading");
    setExplorerIndexError("");
    loadExplorerIndex(explorerIndexHref)
      .then((index) => {
        if (cancelled) return;
        setExplorerIndex(index);
        setExplorerIndexStatus("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setExplorerIndexError(error instanceof Error ? error.message : "Error desconocido");
        setExplorerIndexStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [explorerIndexHref, explorerIndexRequestKey, explorerIndexStatus, needsExplorerIndex]);

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

  const handleRetryExplorerIndex = useCallback(() => {
    if (!explorerIndexHref) return;
    explorerIndexPromises.delete(explorerIndexHref);
    setExplorerIndex(null);
    setExplorerIndexStatus("initial");
    setExplorerIndexError("");
    setExplorerIndexRequestKey((key) => key + 1);
  }, [explorerIndexHref]);

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
    if (viewMode === "explorer") {
      if (
        selectedCaseId &&
        hasExplorerIndex &&
        !explorerIndex.rows.some((row) => row.caseId === selectedCaseId)
      ) {
        setSelectedCaseId("");
      }
      return;
    }
    if (selectedCaseId && !countryReviewCases.some((caseFile) => caseFile.id === selectedCaseId)) {
      setSelectedCaseId("");
    }
  }, [countryReviewCases, explorerIndex, hasExplorerIndex, selectedCaseId, viewMode]);

  const selectedMapCase =
    countryReviewCases.find((caseFile) => caseFile.id === selectedCaseId) ?? null;
  const selectedCase =
    viewMode === "explorer"
      ? selectedExplorerCase
      : selectedMapCase;
  const selectedPanelCase = viewMode === "map" ? selectedFullMapCase : selectedCase;
  const selectedCaseWaybackEligible = shouldEnableWaybackForCase(selectedCase);
  const activeSignalContext = viewMode === "map" ? countrySignalContext : explorerSignalContext;

  useEffect(() => {
    if (viewMode !== "explorer" || !selectedCaseId) {
      setSelectedExplorerCase(null);
      setSelectedExplorerCaseStatus("idle");
      return;
    }

    const loadedCase = allCases.find((caseFile) => caseFile.id === selectedCaseId);
    if (loadedCase && hasFullMapCaseDetails(loadedCase)) {
      setSelectedExplorerCase(loadedCase);
      setSelectedExplorerCaseStatus("ready");
      return;
    }

    let cancelled = false;
    setSelectedExplorerCase(null);
    setSelectedExplorerCaseStatus("loading");
    loadFullMapCase(selectedCaseId)
      .then((caseFile) => {
        if (cancelled) return;
        setSelectedExplorerCase(caseFile);
        setSelectedExplorerCaseStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setSelectedExplorerCaseStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [allCases, selectedCaseId, viewMode]);

  useEffect(() => {
    if (viewMode !== "map" || !selectedCase?.id) {
      setSelectedFullMapCase(null);
      setSelectedFullMapCaseStatus("idle");
      return;
    }

    if (hasFullMapCaseDetails(selectedCase)) {
      setSelectedFullMapCase(selectedCase);
      setSelectedFullMapCaseStatus("ready");
      return;
    }

    let cancelled = false;
    setSelectedFullMapCase(null);
    setSelectedFullMapCaseStatus("loading");
    loadFullMapCase(selectedCase.id)
      .then((caseFile) => {
        if (cancelled) return;
        setSelectedFullMapCase(caseFile);
        setSelectedFullMapCaseStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setSelectedFullMapCaseStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCase?.id, selectedCase, viewMode]);

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
  const activePlatformTheme: PlatformTheme = viewMode === "map" ? "mapCream" : interfaceTheme;

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
            showSecondaryAction={viewMode !== "map"}
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
        hasExplorerIndex ? (
          <ExplorerView
            index={explorerIndex}
            selectedCountry={selectedCountry}
            selectedCase={selectedCase}
            selectedCaseStatus={selectedExplorerCaseStatus}
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
            status={explorerIndexStatus}
            error={explorerIndexError}
            onRetry={handleRetryExplorerIndex}
            loadingTitle="Preparando Explorer"
            loadingDescription="Cargando el índice compacto de expedientes para esta vista."
            errorTitle="No se pudo cargar Explorer"
            errorDescription="La vista conserva el mapa inicial. Reintentá la descarga del índice compacto."
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

      {selectedCase && viewMode === "map" && selectedPanelCase && (
        <aside className="casePanel" aria-label="Expediente Faro">
          <CasePanel
            caseFile={selectedPanelCase}
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

      {selectedCase && viewMode === "map" && !selectedPanelCase && (
        <aside className="casePanel" aria-label="Expediente Faro">
          <CasePanelGate status={selectedFullMapCaseStatus} />
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

function loadExplorerIndex(href: string): Promise<InvestigatorExplorerIndex> {
  const existing = explorerIndexPromises.get(href);
  if (existing) return existing;

  const request = fetch(href, { cache: "no-cache" })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = (await response.json()) as { index?: unknown };
      if (!payload.index || typeof payload.index !== "object") {
        throw new Error("El indice no tiene el formato esperado.");
      }
      return payload.index as InvestigatorExplorerIndex;
    })
    .catch((error: unknown) => {
      explorerIndexPromises.delete(href);
      throw error;
    });

  explorerIndexPromises.set(href, request);
  return request;
}

function loadFullMapCase(caseId: string): Promise<ExplorerCase> {
  const existing = fullMapCasePromises.get(caseId);
  if (existing) return existing;

  const request = fetch(`/api/cases/${encodeURIComponent(caseId)}/case-file`, { cache: "force-cache" })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = (await response.json()) as { caseFile?: unknown };
      if (!payload.caseFile || typeof payload.caseFile !== "object") {
        throw new Error("El expediente no tiene el formato esperado.");
      }
      return payload.caseFile as ExplorerCase;
    })
    .catch((error: unknown) => {
      fullMapCasePromises.delete(caseId);
      throw error;
    });

  fullMapCasePromises.set(caseId, request);
  return request;
}

function hasFullMapCaseDetails(caseFile: ExplorerCase): boolean {
  return Boolean(
    caseFile.receipt &&
    "fileHash" in caseFile.receipt &&
    "rawPath" in caseFile.receipt &&
    Array.isArray(caseFile.caveats),
  );
}

function CasePanelGate({ status }: { status: "idle" | "loading" | "ready" | "error" }) {
  const isError = status === "error";
  return (
    <div className="casePanelGate" role={isError ? "alert" : "status"} aria-live="polite">
      {!isError && <span className="casePanelGateSpinner" aria-hidden />}
      <div>
        <strong>{isError ? "No se pudo cargar el expediente" : "Cargando expediente"}</strong>
        <p>
          {isError
            ? "El mapa sigue disponible. Cerrá el panel y volvé a intentar abrir este expediente."
            : "Abriendo la ficha completa con receipts, hashes y fuentes oficiales."}
        </p>
      </div>
    </div>
  );
}

function CaseCorpusGate({
  status,
  error,
  onRetry,
  loadingTitle = "Cargando corpus investigador",
  loadingDescription = "Preparando los expedientes completos para esta vista.",
  errorTitle = "No se pudo cargar el corpus",
  errorDescription = "La vista conserva el mapa inicial. Reintentá la descarga del corpus completo.",
}: {
  status: CaseCorpusStatus;
  error: string;
  onRetry: () => void;
  loadingTitle?: string;
  loadingDescription?: string;
  errorTitle?: string;
  errorDescription?: string;
}) {
  const isError = status === "error";

  return (
    <section className={styles.caseCorpusGate} aria-live="polite">
      <div className={styles.caseCorpusGatePanel} role={isError ? "alert" : "status"}>
        {!isError && <span className={styles.caseCorpusSpinner} aria-hidden />}
        <div className={styles.caseCorpusCopy}>
          <h1>{isError ? errorTitle : loadingTitle}</h1>
          <p>{isError ? errorDescription : loadingDescription}</p>
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
  return (
    <div className={styles.interfaceThemeDock} role="group" aria-label="Tema de interfaz">
      <button
        type="button"
        className={`${styles.interfaceThemeOption} ${theme === "light" ? styles.interfaceThemeOptionActive : ""}`}
        onClick={() => onThemeChange("light")}
        aria-label="Modo claro"
        aria-pressed={theme === "light"}
        title="Modo claro"
      >
        <Sun size={15} aria-hidden />
      </button>
      <button
        type="button"
        className={`${styles.interfaceThemeOption} ${theme === "dark" ? styles.interfaceThemeOptionActive : ""}`}
        onClick={() => onThemeChange("dark")}
        aria-label="Modo oscuro"
        aria-pressed={theme === "dark"}
        title="Modo oscuro"
      >
        <Moon size={15} aria-hidden />
      </button>
    </div>
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
