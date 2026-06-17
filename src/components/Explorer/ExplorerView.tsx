"use client";

import { type FormEvent, type MouseEvent, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  FolderPlus,
  PanelLeftClose,
  Search,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { addCaseToStoredInvestigationWorkspace } from "@/lib/client/investigationWorkspaceStorage";
import { CURATED_CASES } from "@/data/curatedCases";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CountryCode } from "@/lib/data/countries";
import {
  buildCaseSignals,
  type CaseSignal,
  type SignalCaseFile,
} from "@/lib/data/caseSignals";
import {
  buildEvidenceClaimMatrix,
  type EvidenceClaim,
  type EvidenceClaimCode,
  type EvidenceClaimStatus,
} from "@/lib/data/evidenceClaimMatrix";
import {
  buildCaseInvestigationChecklist,
  type CaseInvestigationChecklist,
} from "@/lib/data/caseInvestigationChecklist";
import {
  buildInvestigatorExplorerFromIndex,
  getInvestigatorRowSignalFacetKeys,
  getInvestigatorRowSignalLabel,
  getInvestigatorRowSearchText,
  getInvestigatorRowSupplierKey,
  type InvestigatorCaseRow,
  type InvestigatorEntityFilter,
  type InvestigatorEntityProfile,
  type InvestigatorFacet,
  type InvestigatorExplorerIndex,
  type InvestigatorGeometryFilter,
} from "@/lib/data/investigatorExplorer";
import {
  INVESTIGATION_RELATION_REASON_OPTIONS,
  type InvestigationCaseRelationReason,
} from "@/lib/data/investigationWorkspaces";
import {
  buildSearchSuggestionIndex,
  buildSearchSuggestionsFromIndex,
  normalizeSearchText,
  type SearchSuggestion,
  type SearchSuggestionCandidate,
  type SearchSuggestionIndex,
} from "@/lib/data/searchSuggestions";
import { describeReceiptLocator } from "@/lib/data/evidenceReceipts";
import { getPublicOfficialSourceHref } from "@/lib/data/receiptOfficialSource";
import { shouldExposeCaseOnMap } from "@/lib/data/uiGates";
import { ContextualCitationsPanel } from "../ContextualCitations";
import FaroMark from "../FaroMark";
import SearchSuggestionGroups from "../SearchSuggestionGroups";
import styles from "./Explorer.module.css";

interface Props {
  index: InvestigatorExplorerIndex;
  selectedCountry: CountryCode;
  selectedCase: ExplorerCase | null;
  selectedCaseStatus?: "idle" | "loading" | "ready" | "error";
  onSelectCase: (caseId: string, countryCode: CountryCode) => void;
  onClearSelection: () => void;
  onSwitchToInvestigations: () => void;
  initialPreset?: ExplorerPreset;
}

const GEOMETRY_OPTIONS: Array<{ id: InvestigatorGeometryFilter; label: string }> = [
  { id: "any", label: "Todas" },
  { id: "with", label: "Con punto oficial" },
  { id: "without", label: "Sin punto en mapa" },
];

const FACET_TYPE_OPTIONS: Array<{ type: InvestigatorFacet["type"]; label: string; limit: number }> = [
  { type: "source", label: "Fuente", limit: 4 },
  { type: "agency", label: "Organismo", limit: 4 },
  { type: "supplier", label: "Proveedor", limit: 4 },
  { type: "signal", label: "Señal", limit: 5 },
];

type ExplorerDetailTab = "resumen" | "dinero" | "actores" | "evidencia" | "mapa" | "relacionados";
type ExplorerPreset = "selected" | null;

interface PublicCuratedEvidence {
  id: string;
  title: string;
  caption: string;
  caveat: string;
  sourceLabel: string;
  permissionNote: string;
  reviewedByName: string;
  promotedAt: string;
}

interface DetailFallback {
  amount: NonNullable<Amount> | null;
  officialBudget: NonNullable<Amount> | null;
  supplierName: string | null;
  supplierDocument: string | null;
}

type SimilarCaseSummary = Pick<
  InvestigatorCaseRow,
  "caseId" | "countryCode" | "workNumber" | "title" | "agencyName"
>;

const DETAIL_TABS: Array<{ id: ExplorerDetailTab; label: string }> = [
  { id: "resumen", label: "Resumen" },
  { id: "dinero", label: "Dinero" },
  { id: "actores", label: "Actores" },
  { id: "evidencia", label: "Evidencia" },
  { id: "mapa", label: "Mapa" },
  { id: "relacionados", label: "Relacionados" },
];

const LEADING_AGENCY_CODE_PATTERN = /^\d+\s*-?\s*/;

export default function ExplorerView({
  index,
  selectedCountry,
  selectedCase,
  selectedCaseStatus = "idle",
  onSelectCase,
  onClearSelection,
  onSwitchToInvestigations,
  initialPreset = null,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const countryScope = selectedCountry;
  const [geometryFilter, setGeometryFilter] = useState<InvestigatorGeometryFilter>("any");
  const [activeFacets, setActiveFacets] = useState<InvestigatorFacet[]>([]);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [page, setPage] = useState(0);
  const [folderStatus, setFolderStatus] = useState<{ caseId: string; message: string } | null>(null);
  const [preset, setPreset] = useState<ExplorerPreset>(initialPreset);
  const shellRef = useRef<HTMLElement | null>(null);

  const countries = useMemo(() => [countryScope], [countryScope]);
  const selectedCaseIds = useMemo(
    () => new Set(CURATED_CASES.map((caseFile) => caseFile.caseId)),
    [],
  );
  const selectedCasesForBanner = useMemo(
    () => CURATED_CASES.filter((caseFile) =>
      index.rows.some((candidate) => candidate.caseId === caseFile.caseId && candidate.countryCode === countryScope)
    ),
    [countryScope, index.rows],
  );

  const presetScopedRows = useMemo(
    () =>
      preset === "selected"
        ? index.rows.filter((row) => selectedCaseIds.has(row.caseId))
        : index.rows,
    [index.rows, preset, selectedCaseIds],
  );

  const countryAllRows = useMemo(
    () => presetScopedRows.filter((row) => row.countryCode === countryScope),
    [countryScope, presetScopedRows],
  );

  const yearBounds = useMemo(() => {
    const years = countryAllRows
      .map((row) => row.year)
      .filter((value): value is number => value !== null);
    if (years.length === 0) {
      const now = new Date().getFullYear();
      return { min: now, max: now };
    }
    return { min: Math.min(...years), max: Math.max(...years) };
  }, [countryAllRows]);

  const [yearFrom, setYearFrom] = useState<number>(yearBounds.min);
  const [yearTo, setYearTo] = useState<number>(yearBounds.max);

  const activeEntities = useMemo<InvestigatorEntityFilter[]>(
    () => activeFacets.map((facet) => ({ type: facet.type, key: facet.key })),
    [activeFacets],
  );

  useEffect(() => {
    setPage(0);
  }, [activeFacets, countryScope, geometryFilter, query, yearFrom, yearTo]);

  useEffect(() => {
    setYearFrom(yearBounds.min);
    setYearTo(yearBounds.max);
  }, [yearBounds.min, yearBounds.max]);

  useEffect(() => {
    if (!selectedCase) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClearSelection();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedCase, onClearSelection]);

  const selectedDetailCase =
    selectedCase && (preset !== "selected" || selectedCaseIds.has(selectedCase.id))
      ? selectedCase
      : null;

  useEffect(() => {
    if (!selectedDetailCase) return;
    shellRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [selectedDetailCase?.id, selectedDetailCase]);

  const explorerIndex = useMemo<InvestigatorExplorerIndex>(
    () => ({ ...index, rows: presetScopedRows }),
    [index, presetScopedRows],
  );

  const explorer = useMemo(
    () => buildInvestigatorExplorerFromIndex(explorerIndex, {
      countries,
      entities: activeEntities,
      geometry: geometryFilter,
      yearFrom,
      yearTo,
      limit: 500,
      query: deferredQuery,
    }),
    [activeEntities, countries, deferredQuery, explorerIndex, geometryFilter, yearFrom, yearTo],
  );

  const hasSearchQuery = deferredQuery.trim().length > 0;
  const searchSuggestionIndex = useMemo(
    () => hasSearchQuery ? buildExplorerSearchSuggestionIndex(countryAllRows, yearFrom, yearTo) : null,
    [countryAllRows, hasSearchQuery, yearFrom, yearTo],
  );

  const searchSuggestions = useMemo(
    () => searchSuggestionIndex
      ? buildSearchSuggestionsFromIndex(searchSuggestionIndex, deferredQuery, { limit: 12 })
      : [],
    [deferredQuery, searchSuggestionIndex],
  );

  const facetGroups = useMemo(
    () => FACET_TYPE_OPTIONS
      .map((group) => ({
        ...group,
        facets: explorer.facets
          .filter((facet) => facet.type === group.type)
          .slice(0, group.limit),
      }))
      .filter((group) => group.facets.length > 0),
    [explorer.facets],
  );

  const PAGE_SIZE = 8;
  const pagedRows = useMemo(
    () => explorer.rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [explorer.rows, page],
  );

  const clearPreset = () => {
    if (preset !== "selected") return;
    setPreset(null);
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete("preset");
    const nextQuery = nextSearchParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  const returnToFilteredList = () => {
    if (selectedDetailCase) onClearSelection();
  };

  const resetFilters = () => {
    clearPreset();
    returnToFilteredList();
    setActiveFacets([]);
    setGeometryFilter("any");
    setQuery("");
    setYearFrom(yearBounds.min);
    setYearTo(yearBounds.max);
  };

  const toggleFacet = (facet: InvestigatorFacet) => {
    clearPreset();
    returnToFilteredList();
    setActiveFacets((prev) => {
      const exists = prev.some((active) => isSameFacet(active, facet));
      if (exists) return prev.filter((active) => !isSameFacet(active, facet));
      return [...prev, facet];
    });
  };

  const clearActiveFacets = () => {
    clearPreset();
    returnToFilteredList();
    setActiveFacets([]);
  };

  const handleGeometryFilterChange = (value: InvestigatorGeometryFilter) => {
    clearPreset();
    returnToFilteredList();
    setGeometryFilter(value);
  };

  const handleYearFromChange = (value: number) => {
    clearPreset();
    returnToFilteredList();
    setYearFrom(value);
  };

  const handleYearToChange = (value: number) => {
    clearPreset();
    returnToFilteredList();
    setYearTo(value);
  };

  const handleQueryChange = (value: string) => {
    clearPreset();
    returnToFilteredList();
    setQuery(value);
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    clearPreset();
    setQuery(suggestion.query);
    if (suggestion.caseId) onSelectCase(suggestion.caseId, countryScope);
    else returnToFilteredList();
  };

  const handleProfileSelect = (profile: InvestigatorEntityProfile) => {
    clearPreset();
    if (!profile.filter) {
      returnToFilteredList();
      setQuery(profile.label);
      return;
    }
    toggleFacet({
      type: profile.filter.type,
      key: profile.filter.key,
      label: profile.label,
      count: profile.caseCount,
      watchCount: profile.watchCount,
      sampleCaseId: profile.sampleCaseIds[0] ?? "",
    });
  };

  const saveRowToFolder = (event: MouseEvent<HTMLButtonElement>, row: InvestigatorCaseRow) => {
    event.stopPropagation();
    const result = addCaseToStoredInvestigationWorkspace({
      caseId: row.caseId,
      countryCode: "AR",
    });
    setFolderStatus({ caseId: row.caseId, message: labelFolderSaveStatus(result.status) });
  };

  return (
    <section ref={shellRef} className={styles.shell} aria-label="Explorar">
      <aside className={styles.sidebar} aria-label="Filtros y guardados">
        <header className={styles.sidebarBrand}>
          <div className={styles.sidebarBrandIdentity}>
            <FaroMark compact />
            <span className={styles.sidebarBrandName}>Faro</span>
          </div>
          <button type="button" className={styles.sidebarCollapse} aria-label="Colapsar">
            <PanelLeftClose size={16} aria-hidden />
          </button>
        </header>
        <div className={styles.sidebarStaticFilters}>
          <section className={styles.sidebarSection} aria-labelledby="explorer-filters-heading">
            <div className={styles.sectionHead}>
              <p className={styles.eyebrow} id="explorer-filters-heading">
                Filtros
              </p>
              <button
                type="button"
                className={styles.sectionLink}
                onClick={resetFilters}
              >
                Limpiar
              </button>
            </div>
            <div className={styles.filterGroup}>
              <p className={styles.filterGroupLabel}>Ubicación en mapa</p>
              {GEOMETRY_OPTIONS.map((option) => {
                const isChecked = geometryFilter === option.id;
                return (
                  <label key={option.id} className={styles.checkRow}>
                    <input
                      type="radio"
                      name="explorer-geometry"
                      checked={isChecked}
                      onChange={() => handleGeometryFilterChange(option.id)}
                    />
                    <span className={`${styles.checkDot} ${geometryDotClass(option.id, styles)}`} aria-hidden />
                    <span className={styles.checkLabel}>{option.label}</span>
                  </label>
                );
              })}
            </div>
            <div className={styles.filterGroup}>
              <div className={styles.filterRowHead}>
                <span className={styles.filterGroupLabel}>Período</span>
                <span className={styles.filterRowValue}>
                  {yearFrom} – {yearTo}
                </span>
              </div>
              <RangeSlider
                min={yearBounds.min}
                max={yearBounds.max}
                from={yearFrom}
                to={yearTo}
                onFromChange={handleYearFromChange}
                onToChange={handleYearToChange}
              />
            </div>
          </section>
        </div>
        <div className={styles.sidebarScrollRegion}>
          <hr className={styles.sidebarDivider} />
          <section className={styles.sidebarSection} aria-labelledby="explorer-pivots-heading">
            <div className={styles.sectionHead}>
              <p className={styles.eyebrow} id="explorer-pivots-heading">
                Pivots
              </p>
              {activeFacets.length > 0 && (
                <button type="button" className={styles.sectionLink} onClick={clearActiveFacets}>
                  Quitar todo
                </button>
              )}
            </div>
            {activeFacets.length > 0 && (
              <div className={styles.activePivotList} aria-label="Pivots activos">
                {activeFacets.map((facet) => (
                  <button
                    key={`active-${facet.type}:${facet.key}`}
                    type="button"
                    className={styles.activePivotChip}
                    onClick={() => toggleFacet(facet)}
                  >
                    <span>{facetTypeLabel(facet.type)}</span>
                    <span className={styles.activePivotLabel}>{formatFacetLabel(facet)}</span>
                    <span className={styles.activePivotRemove} aria-hidden>×</span>
                  </button>
                ))}
              </div>
            )}
            <div className={styles.facetGroups}>
              {facetGroups.map((group) => (
                <div key={group.type} className={styles.facetGroup}>
                  <div className={styles.facetGroupHead}>
                    <span>{group.label}</span>
                  </div>
                  <div className={styles.facetList}>
                    {group.facets.map((facet) => {
                      const isActive = activeFacets.some((active) => isSameFacet(active, facet));
                      return (
                        <button
                          key={`${facet.type}:${facet.key}`}
                          type="button"
                          className={`${styles.facetButton} ${isActive ? styles.facetButtonActive : ""}`}
                          onClick={() => toggleFacet(facet)}
                          aria-pressed={isActive}
                        >
                          <span className={styles.facetLabel}>{formatFacetLabel(facet)}</span>
                          {shouldShowFacetCount(group.type) && (
                            <span className={styles.facetCount}>{facet.count}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
          <a className={styles.exportRow} href={buildExportHref(countryScope, query)}>
            <Download size={14} aria-hidden />
            <span>Exportar resultados</span>
          </a>
        </div>
      </aside>
      <main className={styles.main}>
        {selectedDetailCase ? (
          <ExplorerDetail
            caseFile={selectedDetailCase}
            poolRows={countryAllRows}
            onBack={onClearSelection}
            onSelectCase={onSelectCase}
            onSwitchToInvestigations={onSwitchToInvestigations}
          />
        ) : selectedCaseStatus === "loading" ? (
          <ExplorerDetailGate status="loading" />
        ) : selectedCaseStatus === "error" ? (
          <ExplorerDetailGate status="error" />
        ) : (
        <>
        <header className={styles.mainHeader}>
          <h1 className={styles.mainTitle}>Explorar</h1>
        </header>
        <details className={styles.mobileFilterDetails}>
          <summary>
            <span>Filtros</span>
            <strong>
              {GEOMETRY_OPTIONS.find((option) => option.id === geometryFilter)?.label ?? "Todas"} · {yearFrom}–{yearTo}
            </strong>
          </summary>
          <div className={styles.mobileFilterBody}>
            <div className={styles.mobileFilterGroup}>
              <p className={styles.filterGroupLabel}>Ubicación en mapa</p>
              <div className={styles.mobileSegmentedFilters}>
                {GEOMETRY_OPTIONS.map((option) => {
                  const isChecked = geometryFilter === option.id;
                  return (
                    <label key={`mobile-${option.id}`} className={styles.mobileSegmentOption}>
                      <input
                        type="radio"
                        name="explorer-geometry-mobile"
                        checked={isChecked}
                        onChange={() => handleGeometryFilterChange(option.id)}
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className={styles.mobileFilterGroup}>
              <div className={styles.filterRowHead}>
                <span className={styles.filterGroupLabel}>Período</span>
                <span className={styles.filterRowValue}>
                  {yearFrom} – {yearTo}
                </span>
              </div>
              <RangeSlider
                min={yearBounds.min}
                max={yearBounds.max}
                from={yearFrom}
                to={yearTo}
                onFromChange={handleYearFromChange}
                onToChange={handleYearToChange}
              />
            </div>
            {activeFacets.length > 0 && (
              <div className={styles.activePivotList} aria-label="Pivots activos">
                {activeFacets.map((facet) => (
                  <button
                    key={`mobile-active-${facet.type}:${facet.key}`}
                    type="button"
                    className={styles.activePivotChip}
                    onClick={() => toggleFacet(facet)}
                  >
                    <span>{facetTypeLabel(facet.type)}</span>
                    <span className={styles.activePivotLabel}>{formatFacetLabel(facet)}</span>
                    <span className={styles.activePivotRemove} aria-hidden>×</span>
                  </button>
                ))}
              </div>
            )}
            <div className={styles.mobileFacetGroups}>
              {facetGroups.map((group) => (
                <section key={`mobile-${group.type}`} className={styles.facetGroup}>
                  <div className={styles.facetGroupHead}>
                    <span>{group.label}</span>
                  </div>
                  <div className={styles.facetList}>
                    {group.facets.map((facet) => {
                      const isActive = activeFacets.some((active) => isSameFacet(active, facet));
                      return (
                        <button
                          key={`mobile-${facet.type}:${facet.key}`}
                          type="button"
                          className={`${styles.facetButton} ${isActive ? styles.facetButtonActive : ""}`}
                          onClick={() => toggleFacet(facet)}
                          aria-pressed={isActive}
                        >
                          <span className={styles.facetLabel}>{formatFacetLabel(facet)}</span>
                          {shouldShowFacetCount(group.type) && (
                            <span className={styles.facetCount}>{facet.count}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
            <div className={styles.mobileFilterActions}>
              <button type="button" className={styles.sectionLink} onClick={resetFilters}>
                Limpiar filtros
              </button>
              <a className={styles.mobileExportLink} href={buildExportHref(countryScope, query)}>
                <Download size={14} aria-hidden />
                Exportar resultados
              </a>
            </div>
          </div>
        </details>
        {preset === "selected" && (
          <div className={styles.searchWrap}>
            <section className={styles.presetBanner} aria-label="Expedientes seleccionados">
              <div className={styles.presetBannerHeader}>
                <div className={styles.presetBannerIntro}>
                  <p className={styles.presetEyebrow}>Selección curada</p>
                  <h2>Casos para presentar</h2>
                  <p>Un set corto para mostrar el flujo sin convertirlo en galería.</p>
                </div>
                <button type="button" className={styles.presetClearButton} onClick={clearPreset}>
                  Ver todos los expedientes
                </button>
              </div>
              <div className={styles.presetRationaleList} aria-label="Criterio de selección">
                {selectedCasesForBanner.map((caseFile) => (
                  <button
                    key={caseFile.caseId}
                    type="button"
                    className={styles.presetRationaleItem}
                    onClick={() => onSelectCase(caseFile.caseId, caseFile.countryCode)}
                    aria-label={`${caseFile.title}. ${caseFile.presentationReason} ${caseFile.officialBasis} ${caseFile.caveat} Próximo paso: ${caseFile.nextStep}`}
                  >
                    <span className={styles.presetCaseKicker}>{caseFile.kicker}</span>
                    <strong>{caseFile.title}</strong>
                    <small>{caseFile.presentationReason}</small>
                    <span className={styles.presetCaseMeta}>
                      {caseFile.officialBasis}
                      <span>Abrir expediente</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
        {preset !== "selected" && (
          <>
            <div className={styles.searchWrap}>
              <label className={styles.searchBox}>
                <Search size={15} aria-hidden />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => handleQueryChange(event.target.value)}
                  placeholder="Buscar provincia, localidad, ruta, proveedor, CUIT, organismo o expediente…"
                  aria-label="Buscar"
                />
              </label>
              <SearchSuggestionGroups
                suggestions={searchSuggestions}
                onSelectSuggestion={handleSuggestionSelect}
              />
            </div>
            <div className={styles.statsGrid} aria-label="Resumen">
              <StatCard label="Expedientes" value={explorer.stats.filteredCases.toLocaleString("es-AR")} />
              <StatCard label="Con señal prioritaria" value={explorer.stats.filteredCasesWithPrimarySignal.toLocaleString("es-AR")} />
              <StatCard label="Sin geometría de mapa" value={explorer.stats.filteredCasesWithoutMapGeometry.toLocaleString("es-AR")} />
              <StatCard label="Pivots" value={explorer.stats.facets.toLocaleString("es-AR")} />
            </div>
            <InvestigatorProfilesPanel
              profiles={explorer.profiles}
              onSelectProfile={handleProfileSelect}
            />
            <div className={styles.tableWrap}>
              {(() => {
                const totalPages = Math.max(1, Math.ceil(explorer.rows.length / PAGE_SIZE));
                const safePage = Math.min(page, totalPages - 1);
                const from = explorer.rows.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
                const to = Math.min(explorer.rows.length, (safePage + 1) * PAGE_SIZE);
                return (
                  <div className={styles.tableFoot}>
                    <span className={styles.tableFootLabel}>
                      Mostrando {from}-{to} de {explorer.rows.length.toLocaleString("es-AR")}
                    </span>
                    <div className={styles.pagination} role="navigation" aria-label="Paginación">
                      <button
                        type="button"
                        className={styles.pageNav}
                        onClick={() => setPage(Math.max(0, safePage - 1))}
                        disabled={safePage === 0}
                        aria-label="Página anterior"
                      >
                        <ChevronLeft size={14} aria-hidden />
                      </button>
                      {buildPageList(safePage, totalPages).map((entry, idx) =>
                        entry === "…" ? (
                          <span key={`gap-${idx}`} className={styles.pageGap}>…</span>
                        ) : (
                          <button
                            key={entry}
                            type="button"
                            className={`${styles.pageBtn} ${entry === safePage ? styles.pageBtnActive : ""}`}
                            onClick={() => setPage(entry)}
                            aria-current={entry === safePage ? "page" : undefined}
                          >
                            {entry + 1}
                          </button>
                        ),
                      )}
                      <button
                        type="button"
                        className={styles.pageNav}
                        onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
                        disabled={safePage >= totalPages - 1}
                        aria-label="Página siguiente"
                      >
                        <ChevronRight size={14} aria-hidden />
                      </button>
                    </div>
                  </div>
                );
              })()}
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tipo</th>
                    <th>Organismo</th>
                    <th>Proveedor</th>
                    <th className={styles.tableNumeric}>Monto</th>
                    <th>Fuente</th>
                    <th>Señal</th>
                    <th>Carpeta</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length === 0 && (
                    <tr className={styles.tableEmptyRow}>
                      <td colSpan={8} className={styles.tableEmpty}>
                        No hay expedientes que coincidan con los filtros actuales.
                      </td>
                    </tr>
                  )}
                  {pagedRows.map((caseFile) => {
                    const state = computeRowState(caseFile);
                    return (
                      <tr
                        key={caseFile.caseId}
                        className={styles.tableRow}
                        onClick={() => onSelectCase(caseFile.caseId, caseFile.countryCode)}
                      >
                        <td className={styles.cellId} data-label="ID">
                          <span>{caseFile.countryCode}</span>
                          <span>#{caseFile.workNumber || caseFile.caseId}</span>
                        </td>
                        <td data-label="Tipo">{caseTypeLabel(caseFile.caseType)}</td>
                        <td className={styles.cellEllipsis} data-label="Organismo">{caseFile.agencyName}</td>
                        <td className={styles.cellEllipsis} data-label="Proveedor">{caseFile.supplierLabel}</td>
                        <td className={styles.tableNumeric} data-label="Monto">
                          <span className={styles.rowAmount}>{caseFile.amountLabel}</span>
                        </td>
                        <td className={styles.cellEllipsis} data-label="Fuente">
                          <span className={styles.sourceStack}>
                            <span>{caseFile.sourceName}</span>
                            <span>{caseFile.locatorLabel}</span>
                          </span>
                        </td>
                        <td data-label="Señal">
                          <span className={`${styles.stateBadge} ${styles[`state_${state.tone}`]}`}>
                            <span className={styles.stateBadgeDot} aria-hidden />
                            {state.label}
                          </span>
                        </td>
                        <td className={styles.tableActionCell} data-label="Carpeta">
                          <button
                            type="button"
                            className={`${styles.saveCaseButton} ${
                              folderStatus?.caseId === caseFile.caseId ? styles.saveCaseButtonSaved : ""
                            }`}
                            onClick={(event) => saveRowToFolder(event, caseFile)}
                            aria-label={`Guardar ${caseFile.caseId} en carpeta`}
                          >
                            <FolderPlus size={13} aria-hidden />
                            <span>{folderStatus?.caseId === caseFile.caseId ? "Guardado" : "Guardar"}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        </>
        )}
      </main>
    </section>
  );
}

function ExplorerDetail({
  caseFile,
  poolRows,
  onBack,
  onSelectCase,
  onSwitchToInvestigations,
}: {
  caseFile: ExplorerCase;
  poolRows: InvestigatorCaseRow[];
  onBack: () => void;
  onSelectCase: (caseId: string, countryCode: CountryCode) => void;
  onSwitchToInvestigations: () => void;
}) {
  const [activeDetailTab, setActiveDetailTab] = useState<ExplorerDetailTab>("resumen");
  const [curatedEvidence, setCuratedEvidence] = useState<PublicCuratedEvidence[]>([]);
  const [sourceActionStatus, setSourceActionStatus] =
    useState<"idle" | "opening" | "copied" | "blocked">("idle");
  const signals = buildCaseSignals(caseFile as SignalCaseFile);
  const primarySignal = selectPrimaryDetailSignal(signals);
  const nextAction = getDetailNextAction(primarySignal);
  const relatedContractRow =
    poolRows.find(
      (entry) =>
        entry.caseId !== caseFile.id &&
        entry.publicWorkNumber === caseFile.workNumber,
    ) ?? null;
  const relatedFallback = relatedContractRow ? buildDetailFallback(relatedContractRow) : null;
  const supplierKey =
    "supplierName" in caseFile && caseFile.supplierName
      ? entityKeyForExplorer(caseFile.supplierName)
      : null;
  const similar = poolRows
    .filter((entry) => entry.caseId !== caseFile.id)
    .filter((entry) => {
      if (entry.agencyName === caseFile.agencyName) return true;
      if (supplierKey && getInvestigatorRowSupplierKey(entry) === supplierKey) return true;
      return false;
    })
    .slice(0, 4);
  const sourceUrl = caseFile.receipt
    ? getPublicOfficialSourceHref(caseFile.receipt)
    : null;
  const receiptLocator = caseFile.receipt
    ? describeReceiptLocator(caseFile.receipt.locatorType)
    : null;
  useEffect(() => {
    setActiveDetailTab("resumen");
    setSourceActionStatus("idle");
  }, [caseFile.id]);
  useEffect(() => {
    let cancelled = false;
    setCuratedEvidence([]);
    fetch(`/api/cases/${encodeURIComponent(caseFile.id)}/curated-evidence`)
      .then((response) => response.ok ? response.json() : null)
      .then((payload: { evidence?: PublicCuratedEvidence[] } | null) => {
        if (!cancelled) setCuratedEvidence(payload?.evidence ?? []);
      })
      .catch(() => {
        if (!cancelled) setCuratedEvidence([]);
      });
    return () => {
      cancelled = true;
    };
  }, [caseFile.id]);
  const handleSourceAction = async (event: MouseEvent<HTMLAnchorElement>) => {
    if (!sourceUrl) return;
    event.preventDefault();

    let copied = false;
    try {
      await navigator.clipboard.writeText(sourceUrl);
      copied = true;
    } catch {
      copied = false;
    }

    const opened = window.open(sourceUrl, "_blank", "noopener,noreferrer");
    if (copied) {
      setSourceActionStatus("copied");
      return;
    }
    setSourceActionStatus(opened ? "opening" : "blocked");
  };

  return (
    <section className={styles.detail} aria-label="Detalle de expediente">
      <div className={styles.detailTopBar}>
        <button type="button" className={styles.detailBack} onClick={onBack}>
          <ChevronLeft size={14} aria-hidden />
          <span>Volver al listado</span>
        </button>
        <div className={styles.detailActionGroup}>
          <a
            className={styles.detailPrimaryAction}
            href={buildReportHref(caseFile.id)}
          >
            <FileText size={13} aria-hidden />
            Informe PDF
          </a>
          {sourceUrl && (
            <a
              className={styles.detailSecondaryAction}
              href={sourceUrl}
              onClick={handleSourceAction}
            >
              {receiptLocator?.actionLabel ?? "Abrir fuente"}
            </a>
          )}
          <button
            type="button"
            className={styles.detailSecondaryAction}
            onClick={() => setActiveDetailTab("actores")}
          >
            <FolderPlus size={13} aria-hidden />
            Guardar en carpeta
          </button>
        </div>
        {sourceActionStatus !== "idle" && (
          <p className={styles.detailActionStatus} role="status">
            {sourceActionStatus === "copied"
              ? "Enlace oficial copiado. Si el portal no abre, pegalo en otra pestaña."
              : sourceActionStatus === "opening"
                ? "Intentando abrir la fuente oficial."
                : (
                    <>
                      El navegador bloqueó la apertura y no permitió copiar el enlace. Enlace oficial:{" "}
                      <span className={styles.detailActionUrl}>{sourceUrl}</span>
                    </>
                  )}
          </p>
        )}
      </div>
      <p className={styles.detailEyebrow}>
        {caseFile.countryCode} · #{caseFile.workNumber}
      </p>
      <h2 className={styles.detailTitle}>{caseFile.title}</h2>
      <p className={styles.detailSubtitle}>{caseFile.agencyName}</p>
      {signals.length > 0 && (
        <div className={styles.detailChips}>
          {signals.slice(0, 5).map((signal) => {
            const tone =
              signal.kind === "watch"
                ? signal.severity === "high"
                  ? "flag"
                  : "review"
                : "verified";
            return (
              <span key={signal.code} className={`${styles.detailChip} ${styles[`state_${tone}`]}`}>
                <span className={styles.stateBadgeDot} aria-hidden />
                {signal.label}
              </span>
            );
          })}
        </div>
      )}
      <CaseDetailSummary primarySignal={primarySignal} nextAction={nextAction} />
      <MoneyTrailStrip caseFile={caseFile} fallback={relatedFallback} />
      {caseFile.workNumber.includes("OBR") &&
        !relatedContractRow &&
        !("amount" in caseFile && (caseFile as AnyCase).amount) && (
          <p className={styles.detailNote}>
            Esta obra aparece declarada en el catálogo oficial pero todavía no
            tiene contrato adjudicatario emparejado en los datasets cruzados, por
            eso no se ven proveedor ni monto.
          </p>
        )}
      <CaseDetailTabs activeTab={activeDetailTab} onTabChange={setActiveDetailTab} />
      <DetailTabPanel
        activeTab={activeDetailTab}
        caseFile={caseFile}
        fallback={relatedFallback}
        receiptLocator={receiptLocator}
        similar={similar}
        curatedEvidence={curatedEvidence}
        onSelectCase={onSelectCase}
        onSwitchToInvestigations={onSwitchToInvestigations}
      />
    </section>
  );
}

function ExplorerDetailGate({ status }: { status: "loading" | "error" }) {
  const isError = status === "error";
  return (
    <section className={styles.detail} aria-label="Detalle de expediente">
      <article className={styles.detailEmpty} role={isError ? "alert" : "status"} aria-live="polite">
        {isError
          ? "No se pudo cargar el expediente completo. Volvé al listado e intentá abrirlo otra vez."
          : "Cargando expediente completo con receipts, caveats y fuente oficial."}
      </article>
    </section>
  );
}

function buildExplorerSearchSuggestionIndex(
  rows: InvestigatorCaseRow[],
  yearFrom: number,
  yearTo: number,
): SearchSuggestionIndex {
  const scopedRows = rows.filter((row) =>
    row.year === null || (row.year >= yearFrom && row.year <= yearTo),
  );
  const staticCandidates = buildSearchSuggestionIndex([]).staticCandidates;
  const entityCandidates: SearchSuggestionCandidate[] = [];
  const caseCandidates: SearchSuggestionCandidate[] = [];

  for (const row of scopedRows) {
    const [supplierName, supplierDocument] = splitSupplierLabel(row.supplierLabel);
    addExplorerFieldCandidate(entityCandidates, {
      kind: "supplier",
      label: supplierName,
      detail: supplierDocument ? `Proveedor · ${supplierDocument}` : "Proveedor",
      candidateText: row.supplierLabel,
    });
    addExplorerFieldCandidate(entityCandidates, {
      kind: "document",
      label: supplierDocument,
      detail: "CUIT / documento de proveedor",
      candidateText: [supplierDocument, compactIdentifier(supplierDocument)].join(" "),
    });
    addExplorerFieldCandidate(entityCandidates, {
      kind: "agency",
      label: row.agencyName,
      detail: "Organismo",
      candidateText: row.agencyName,
    });
    addExplorerFieldCandidate(entityCandidates, {
      kind: "source",
      label: row.sourceName,
      detail: row.sourceId,
      candidateText: [row.sourceName, row.sourceId].join(" "),
    });
    [row.procedureNumber, row.workNumber].forEach((identifier) => {
      addExplorerFieldCandidate(entityCandidates, {
        kind: "identifier",
        label: identifier,
        detail: "Identificador oficial",
        candidateText: identifier,
      });
    });
    addExplorerFieldCandidate(entityCandidates, {
      kind: "location",
      label: row.workProvince,
      detail: "Provincia",
      candidateText: row.workProvince,
    });
    addExplorerFieldCandidate(entityCandidates, {
      kind: "location",
      label: row.workDepartment,
      detail: "Departamento",
      candidateText: row.workDepartment,
    });
    addExplorerFieldCandidate(entityCandidates, {
      kind: "location",
      label: row.workLocality,
      detail: "Localidad",
      candidateText: row.workLocality,
    });
    for (const signalCode of getInvestigatorRowSignalFacetKeys(row)) {
      const signalLabel = getInvestigatorRowSignalLabel(row, signalCode);
      addExplorerFieldCandidate(entityCandidates, {
        kind: "signal",
        label: signalLabel,
        detail: "Señal",
        candidateText: [signalLabel, signalCode].join(" "),
      });
    }
    caseCandidates.push({
      suggestion: {
        id: `case:${row.caseId}`,
        kind: "case",
        label: row.title,
        detail: `${caseTypeLabel(row.caseType)} · ${row.sourceName}`,
        query: row.title,
        caseId: row.caseId,
      },
      searchText: normalizeSearchText(getInvestigatorRowSearchText(row)),
    });
  }

  return { staticCandidates, entityCandidates, caseCandidates };
}

function addExplorerFieldCandidate(
  candidates: SearchSuggestionCandidate[],
  {
    kind,
    label,
    detail,
    candidateText,
  }: {
    kind: SearchSuggestion["kind"];
    label: string | null | undefined;
    detail: string;
    candidateText: string | null | undefined;
  },
) {
  const cleanLabel = String(label ?? "").trim();
  if (!cleanLabel) return;
  candidates.push({
    suggestion: {
      id: `${kind}:${normalizeSearchText(cleanLabel)}`,
      kind,
      label: cleanLabel,
      detail,
      query: cleanLabel,
      matchCount: 1,
    },
    searchText: normalizeSearchText(candidateText),
  });
}

function buildDetailFallback(row: InvestigatorCaseRow): DetailFallback {
  const [supplierName, supplierDocument] = splitSupplierLabel(row.supplierLabel);
  return {
    amount: row.amountValue !== null && row.amountCurrency
      ? { value: row.amountValue, currency: row.amountCurrency, label: row.amountLabel }
      : null,
    officialBudget: null,
    supplierName,
    supplierDocument,
  };
}

function splitSupplierLabel(label: string): [string | null, string | null] {
  if (!label || label === "Sin proveedor") return [null, null];
  const [name, document] = label.split(" / ");
  return [name?.trim() || null, document?.trim() || null];
}

function compactIdentifier(value: string | null | undefined): string {
  return String(value ?? "").replace(/[^a-zA-Z0-9]/g, "");
}

function entityKeyForExplorer(value: string | null | undefined): string | null {
  const normalized = normalizeSearchText(value);
  return normalized.length > 0 ? normalized : null;
}

function CaseDetailSummary({
  primarySignal,
  nextAction,
}: {
  primarySignal: CaseSignal | null;
  nextAction: string;
}) {
  return (
    <div className={styles.detailSummaryGrid}>
      <article className={styles.detailReason}>
        <p className={styles.detailReasonEyebrow}>Por qué mirar este expediente</p>
        <p className={styles.detailReasonBody}>
          {primarySignal?.summary ?? "Este expediente tiene fuente oficial disponible para revisar datos, caveats y próximos pasos."}
        </p>
        {primarySignal?.caveat && (
          <p className={styles.detailReasonCaveat}>{primarySignal.caveat}</p>
        )}
      </article>
      <article className={styles.detailNextStep}>
        <p className={styles.detailReasonEyebrow}>Próximo paso</p>
        <p className={styles.detailReasonBody}>{nextAction}</p>
      </article>
    </div>
  );
}

function MoneyTrailStrip({
  caseFile,
  fallback,
}: {
  caseFile: ExplorerCase;
  fallback?: DetailFallback | null;
}) {
  const amount = getField<Amount>(caseFile, "amount") ?? fallback?.amount ?? null;
  const budget = getField<Amount>(caseFile, "officialBudget") ?? fallback?.officialBudget ?? null;
  if (!amount && !budget) return null;
  const variation = formatMoneyVariation(amount, budget);
  return (
    <section className={styles.moneyTrailStrip} aria-label="Rastro económico">
      <MoneyTrailCell label="Presupuesto oficial" amount={budget} emptyText="Sin presupuesto oficial" />
      <MoneyTrailCell label={amount ? amountDetailLabel(amount) : "Adjudicado"} amount={amount} emptyText="Monto no informado" />
      <div className={`${styles.moneyTrailCell} ${variation ? styles.moneyTrailReview : ""}`}>
        <span className={styles.moneyTrailLabel}>Variación</span>
        <strong className={styles.moneyTrailValue}>{variation ?? moneyVariationFallback(amount, budget)}</strong>
        <small className={styles.moneyTrailMeta}>
          {variation ? "Revisar alcance y fuente" : moneyVariationMeta(amount, budget)}
        </small>
      </div>
    </section>
  );
}

function MoneyTrailCell({
  label,
  amount,
  emptyText,
}: {
  label: string;
  amount: Amount;
  emptyText: string;
}) {
  const formatted = amount ? formatRowAmount(amount) : null;
  return (
    <div className={`${styles.moneyTrailCell} ${amount ? styles.moneyTrailAvailable : ""}`}>
      <span className={styles.moneyTrailLabel}>{label}</span>
      <strong className={styles.moneyTrailValue}>{formatted?.primary ?? emptyText}</strong>
      <small className={styles.moneyTrailMeta}>{formatted?.usd ? `≈ ${formatted.usd}` : "Dato a verificar en fuente"}</small>
    </div>
  );
}

function CaseDetailTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: ExplorerDetailTab;
  onTabChange: (tab: ExplorerDetailTab) => void;
}) {
  return (
    <div className={styles.detailTabs} role="tablist" aria-label="Categorías del expediente">
      {DETAIL_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`${styles.detailTabButton} ${activeTab === tab.id ? styles.detailTabButtonActive : ""}`}
          onClick={() => onTabChange(tab.id)}
          role="tab"
          aria-selected={activeTab === tab.id}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function DetailTabPanel({
  activeTab,
  caseFile,
  fallback,
  receiptLocator,
  similar,
  curatedEvidence,
  onSelectCase,
  onSwitchToInvestigations,
}: {
  activeTab: ExplorerDetailTab;
  caseFile: ExplorerCase;
  fallback?: DetailFallback | null;
  receiptLocator: ReturnType<typeof describeReceiptLocator> | null;
  similar: SimilarCaseSummary[];
  curatedEvidence: PublicCuratedEvidence[];
  onSelectCase: (caseId: string, countryCode: CountryCode) => void;
  onSwitchToInvestigations: () => void;
}) {
  return (
    <div className={styles.detailTabPanel}>
      {activeTab === "resumen" && (
        <div className={styles.detailTabGrid}>
          <CompetenciaCard caseFile={caseFile} />
          <CronologiaCard caseFile={caseFile} />
          <UbicacionObraCard caseFile={caseFile} />
          <TopCaveatCard caseFile={caseFile} />
        </div>
      )}
      {activeTab === "dinero" && (
        <div className={styles.detailTabGrid}>
          <MontoCard caseFile={caseFile} fallback={fallback} />
          <EjecucionCard caseFile={caseFile} />
        </div>
      )}
      {activeTab === "actores" && (
        <>
          <AddToInvestigationForm caseFile={caseFile} onSwitchToInvestigations={onSwitchToInvestigations} />
          <div className={styles.detailTabGrid}>
            <ProveedorCard caseFile={caseFile} fallback={fallback} />
            <ProcedimientoCard caseFile={caseFile} />
            <OrganismoCard caseFile={caseFile} />
          </div>
        </>
      )}
      {activeTab === "evidencia" && (
        <>
          <InvestigationStatusPanel caseFile={caseFile} />
          <CuratedEvidencePanel evidence={curatedEvidence} />
          <AdvancedEvidenceDetails
            caseFile={caseFile}
            receiptLocator={receiptLocator}
            contextualCitations={caseFile.contextualCitations ?? []}
          />
        </>
      )}
      {activeTab === "mapa" && (
        <div className={styles.detailTabGrid}>
          {caseFile.coordinates && shouldExposeCaseOnMap(caseFile)
            ? <PuntoGeoCard caseFile={caseFile} />
            : <MapGapCard />}
        </div>
      )}
      {activeTab === "relacionados" && (
        <SimilarCasesPanel similar={similar} onSelectCase={onSelectCase} />
      )}
    </div>
  );
}

function CuratedEvidencePanel({ evidence }: { evidence: PublicCuratedEvidence[] }) {
  if (evidence.length === 0) return null;
  return (
    <article className={styles.curatedEvidenceCard}>
      <p className={styles.detailCardHead}>Aportes curados</p>
      <p className={styles.detailInlineText}>
        Material aportado y revisado por el equipo. No reemplaza la fuente oficial ni confirma por sí solo la relación investigada.
      </p>
      <div className={styles.curatedEvidenceList}>
        {evidence.map((item) => (
          <div key={item.id} className={styles.curatedEvidenceItem}>
            <span>{item.sourceLabel} · {item.promotedAt.slice(0, 10)}</span>
            <strong>{item.title}</strong>
            <p>{item.caption}</p>
            <small>{item.caveat}</small>
          </div>
        ))}
      </div>
    </article>
  );
}

function InvestigationStatusPanel({ caseFile }: { caseFile: ExplorerCase }) {
  const checklist = buildCaseInvestigationChecklist(caseFile as SignalCaseFile);
  const chips = buildInvestigationStatusChips(checklist);
  const primaryStep = selectPrimaryInvestigationStep(checklist);
  return (
    <article className={styles.investigationStatusPanel}>
      <div className={styles.investigationStatusHeader}>
        <p className={styles.detailCardHead}>Estado de investigación</p>
        <h3>{checklist.label}</h3>
        <p>{checklist.summary}</p>
      </div>
      {chips.length > 0 && (
        <div className={styles.investigationStatusChips}>
          {chips.map((chip) => (
            <span key={chip}>{chip}</span>
          ))}
        </div>
      )}
      <div className={styles.investigationNextStep}>
        <span>Próximo paso</span>
        <p>{primaryStep}</p>
      </div>
    </article>
  );
}

function AdvancedEvidenceDetails({
  caseFile,
  receiptLocator,
  contextualCitations,
}: {
  caseFile: ExplorerCase;
  receiptLocator: ReturnType<typeof describeReceiptLocator> | null;
  contextualCitations: NonNullable<ExplorerCase["contextualCitations"]>;
}) {
  return (
    <details className={styles.advancedEvidenceDetails}>
      <summary>
        <span>Ver matriz completa, receipts y caveats</span>
        <small>Para auditoría, export y revisión documental fina</small>
      </summary>
      <div className={styles.advancedEvidenceContent}>
        <EvidenceClaimMatrixPanel caseFile={caseFile} />
        <CaveatsCard caseFile={caseFile} />
        <ReceiptCard caseFile={caseFile} receiptLocator={receiptLocator} />
        <ContextualCitationsPanel citations={contextualCitations} compact />
      </div>
    </details>
  );
}

function buildInvestigationStatusChips(checklist: CaseInvestigationChecklist): string[] {
  const chips = [
    checklist.doNotClaim.some((item) => /pago a proveedor/i.test(item)) ? "No prueba pago" : "",
    checklist.followUps.some((item) => item.sourceId === "AR-PRESUPUESTO-ABIERTO-CREDITO-BAPIN")
      ? "Cruce BAPIN posible"
      : "",
    checklist.gaps.some((gap) => gap.claimCode === "official_location") ? "Ubicación a verificar" : "",
    checklist.gaps.some((gap) => gap.claimCode === "supplier_identity") ? "Proveedor incompleto" : "",
  ].filter(Boolean);
  return Array.from(new Set(chips)).slice(0, 3);
}

function selectPrimaryInvestigationStep(checklist: CaseInvestigationChecklist): string {
  const candidateFollowUp = checklist.followUps.find((item) => item.sourceStatus === "candidate");
  if (candidateFollowUp) return candidateFollowUp.action;
  return checklist.gaps[0]?.nextStep ?? checklist.followUps[0]?.action ?? "Abrir la fuente oficial y conservar el receipt antes de citar.";
}

const CLAIM_COLUMN_LIMIT = 3;
const CLAIM_PRIORITY: EvidenceClaimCode[] = [
  "provider_payment",
  "official_record",
  "declared_amount",
  "official_budget",
  "supplier_identity",
  "competition",
  "official_location",
  "declared_progress",
  "budget_execution",
  "judicial_context",
];

function EvidenceClaimMatrixPanel({ caseFile }: { caseFile: ExplorerCase }) {
  const matrix = buildEvidenceClaimMatrix(caseFile as SignalCaseFile);
  const supportedClaims = selectClaimsForColumn(matrix.claims, "supported");
  const partialClaims = selectClaimsForColumn(matrix.claims, "partial");
  const missingClaims = selectClaimsForColumn(matrix.claims, "not_supported");

  return (
    <article className={styles.claimMatrixPanel}>
      <div className={styles.claimMatrixHeader}>
        <p className={styles.detailCardHead}>Qué prueba / qué falta</p>
        <p className={styles.claimMatrixIntro}>
          Lectura rápida para separar evidencia directa, pistas parciales y afirmaciones que todavía no conviene hacer.
        </p>
      </div>
      <div className={styles.claimMatrixColumns}>
        <EvidenceClaimColumn
          title="Puede sostener"
          status="supported"
          claims={supportedClaims}
          emptyText="Sin afirmaciones fuertes con soporte directo."
        />
        <EvidenceClaimColumn
          title="Parcial / revisar"
          status="partial"
          claims={partialClaims}
          emptyText="Sin pistas parciales relevantes."
        />
        <EvidenceClaimColumn
          title="No afirmar todavía"
          status="not_supported"
          claims={missingClaims}
          emptyText="Sin faltantes críticos detectados."
        />
      </div>
    </article>
  );
}

function EvidenceClaimColumn({
  title,
  status,
  claims,
  emptyText,
}: {
  title: string;
  status: EvidenceClaimStatus;
  claims: EvidenceClaim[];
  emptyText: string;
}) {
  const toneClass =
    status === "supported"
      ? styles.claimStatusSupported
      : status === "partial"
        ? styles.claimStatusPartial
        : styles.claimStatusMissing;
  return (
    <section className={styles.claimMatrixColumn}>
      <div className={styles.claimMatrixColumnHead}>
        <span className={`${styles.claimStatusDot} ${toneClass}`} aria-hidden />
        <h3>{title}</h3>
      </div>
      {claims.length > 0 ? (
        <ul className={styles.claimMatrixList}>
          {claims.map((claim) => (
            <li key={claim.code} className={styles.claimMatrixItem}>
              <strong>{formatClaimTitle(claim)}</strong>
              <span>{claim.status === "not_supported" ? claim.caveat : claim.evidence}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.claimMatrixEmpty}>{emptyText}</p>
      )}
    </section>
  );
}

function selectClaimsForColumn(
  claims: EvidenceClaim[],
  status: EvidenceClaimStatus,
): EvidenceClaim[] {
  return claims
    .filter((claim) => claim.status === status)
    .sort((left, right) => claimPriority(left.code) - claimPriority(right.code))
    .slice(0, CLAIM_COLUMN_LIMIT);
}

function claimPriority(code: EvidenceClaimCode): number {
  const index = CLAIM_PRIORITY.indexOf(code);
  return index === -1 ? CLAIM_PRIORITY.length : index;
}

function formatClaimTitle(claim: EvidenceClaim): string {
  if (claim.code === "provider_payment" && claim.status === "not_supported") {
    return "No hay pago a proveedor soportado";
  }
  return claim.label;
}

function TopCaveatCard({ caseFile }: { caseFile: ExplorerCase }) {
  const caveat = caseFile.caveats?.[0];
  if (!caveat) return null;
  return (
    <article className={styles.detailCard}>
      <p className={styles.detailCardHead}>Aclaración principal</p>
      <p className={styles.detailInlineText}>{caveat}</p>
    </article>
  );
}

function CaveatsCard({ caseFile }: { caseFile: ExplorerCase }) {
  if (!caseFile.caveats || caseFile.caveats.length === 0) return null;
  return (
    <article className={styles.caveatCard}>
      <p className={styles.detailCardHead}>Aclaraciones de la fuente</p>
      <ul className={styles.caveatList}>
        {caseFile.caveats.map((caveat, idx) => (
          <li key={idx}>{caveat}</li>
        ))}
      </ul>
    </article>
  );
}

function ReceiptCard({
  caseFile,
  receiptLocator,
}: {
  caseFile: ExplorerCase;
  receiptLocator: ReturnType<typeof describeReceiptLocator> | null;
}) {
  if (!caseFile.receipt) return null;
  return (
    <article className={styles.receiptCard}>
      <p className={styles.detailCardHead}>Recibo</p>
      <DetailRow
        label="Fuente"
        value={caseFile.receipt.sourceName || caseFile.receipt.sourceId}
      />
      {receiptLocator && (
        <>
          <DetailRow label="Tipo de locator" value={receiptLocator.label} />
          <DetailRow label="Nota" value={receiptLocator.note} />
        </>
      )}
      <DetailRow label="Record ID" value={caseFile.receipt.recordId} />
      <DetailRow label="Raw path" value={caseFile.receipt.rawPath} />
      {caseFile.receipt.sourceUrl && (
        <DetailRow
          label="Página oficial"
          value={`${receiptLocator?.actionLabel ?? "Abrir fuente"} ↗`}
          href={getPublicOfficialSourceHref(caseFile.receipt)}
        />
      )}
      <DetailRow
        label="Snapshot"
        value={caseFile.receipt.snapshotHash?.slice(0, 16) ?? "—"}
      />
      <DetailRow
        label="Row hash"
        value={caseFile.receipt.rowHash?.slice(0, 16) ?? "—"}
      />
      <DetailRow
        label="Extraído"
        value={caseFile.receipt.extractedAt?.slice(0, 10) ?? "—"}
      />
    </article>
  );
}

function MapGapCard() {
  return (
    <article className={styles.detailCard}>
      <p className={styles.detailCardHead}>Mapa</p>
      <p className={styles.detailInlineText}>
        Este expediente queda disponible para Explorer y exportación, pero no se dibuja en el mapa porque falta geometría oficial validada.
      </p>
    </article>
  );
}

function SimilarCasesPanel({
  similar,
  onSelectCase,
}: {
  similar: SimilarCaseSummary[];
  onSelectCase: (caseId: string, countryCode: CountryCode) => void;
}) {
  if (similar.length === 0) {
    return (
      <article className={styles.detailEmpty}>
        No hay casos relacionados suficientes con el filtro actual.
      </article>
    );
  }
  return (
    <section className={styles.similarSection} aria-label="Casos similares">
      <p className={styles.similarHead}>Casos similares</p>
      <div className={styles.similarGrid}>
        {similar.map((entry) => (
          <button
            key={entry.caseId}
            type="button"
            className={styles.similarCard}
            onClick={() => onSelectCase(entry.caseId, entry.countryCode)}
          >
            <span className={styles.similarCardId}>#{entry.workNumber}</span>
            <strong className={styles.similarCardTitle}>{entry.title}</strong>
            <span className={styles.similarCardMeta}>{entry.agencyName}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function AddToInvestigationForm({
  caseFile,
  onSwitchToInvestigations,
}: {
  caseFile: ExplorerCase;
  onSwitchToInvestigations: () => void;
}) {
  const [reason, setReason] = useState<InvestigationCaseRelationReason>("manual_hypothesis");
  const [note, setNote] = useState("");
  const [statusText, setStatusText] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = addCaseToStoredInvestigationWorkspace({
      caseId: caseFile.id,
      countryCode: "AR",
      reason,
      note,
    });
    setStatusText(labelFolderSaveStatus(result.status));
    if (result.status === "created" || result.status === "added" || result.status === "updated") {
      setNote("");
    }
  }

  return (
    <form className={styles.detailFolderForm} onSubmit={handleSubmit}>
      <div className={styles.detailFolderFields}>
        <label className={styles.detailFolderField}>
          <span>Motivo</span>
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value as InvestigationCaseRelationReason)}
          >
            {INVESTIGATION_RELATION_REASON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className={styles.detailFolderField}>
          <span>Nota de relación</span>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Por qué entra en esta carpeta"
          />
        </label>
      </div>
      <button className={styles.detailFolderSubmit} type="submit">
        <FolderPlus size={13} aria-hidden />
        Guardar en carpeta
      </button>
      {statusText && (
        <p className={styles.detailFolderStatus}>
          <span>{statusText}</span>
          <button type="button" onClick={onSwitchToInvestigations}>Ver carpeta</button>
        </p>
      )}
    </form>
  );
}

function DetailRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string | null;
}) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailRowLabel}>{label}</span>
      {href ? (
        <a
          className={styles.detailRowLink}
          href={href}
          target="_blank"
          rel="noreferrer"
          title={value}
        >
          {value}
        </a>
      ) : (
        <span className={styles.detailRowValue}>{value}</span>
      )}
    </div>
  );
}

function geometryDotClass(
  id: InvestigatorGeometryFilter,
  moduleStyles: Record<string, string>,
): string {
  if (id === "with") return moduleStyles.dot_verified;
  if (id === "without") return moduleStyles.dot_no_geometry;
  return moduleStyles.dot_review;
}

function facetTypeLabel(type: InvestigatorFacet["type"]): string {
  if (type === "supplier") return "Proveedor";
  if (type === "agency") return "Organismo";
  if (type === "source") return "Fuente";
  return "Señal";
}

function formatFacetLabel(facet: Pick<InvestigatorFacet, "type" | "label">): string {
  const label = facet.label.trim();
  if (facet.type === "agency") return label.replace(LEADING_AGENCY_CODE_PATTERN, "");
  if (facet.type === "supplier") return label.split(" / ")[0] ?? label;
  return label;
}

function shouldShowFacetCount(type: InvestigatorFacet["type"]): boolean {
  return type !== "agency" && type !== "supplier";
}

function labelFolderSaveStatus(status: "created" | "added" | "updated" | "already_present"): string {
  if (status === "created") return "Carpeta creada y expediente guardado.";
  if (status === "added") return "Expediente guardado en tu carpeta.";
  if (status === "updated") return "Motivo y nota actualizados.";
  return "Este expediente ya estaba en tu carpeta.";
}

function isSameFacet(
  left: Pick<InvestigatorFacet, "type" | "key">,
  right: Pick<InvestigatorFacet, "type" | "key">,
): boolean {
  return left.type === right.type && left.key === right.key;
}

function buildReportHref(caseId: string): string {
  return `/expediente/${encodeURIComponent(caseId)}/informe`;
}

function buildExportHref(countryScope: CountryCode, query: string): string {
  const params = new URLSearchParams();
  params.set("country", countryScope);
  if (query.trim()) params.set("q", query.trim());
  const suffix = params.toString();
  return `/api/export?${suffix}`;
}

function RangeSlider({
  min,
  max,
  from,
  to,
  onFromChange,
  onToChange,
}: {
  min: number;
  max: number;
  from: number;
  to: number;
  onFromChange: (value: number) => void;
  onToChange: (value: number) => void;
}) {
  const span = Math.max(1, max - min);
  const fromPct = ((from - min) / span) * 100;
  const toPct = ((to - min) / span) * 100;
  return (
    <div className={styles.rangeSlider}>
      <div className={styles.rangeSliderTrack} aria-hidden />
      <div
        className={styles.rangeSliderFill}
        aria-hidden
        style={{ left: `${fromPct}%`, right: `${100 - toPct}%` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        value={from}
        onChange={(event) => onFromChange(Math.min(Number(event.target.value), to))}
        className={styles.rangeSliderInput}
        aria-label="Año desde"
      />
      <input
        type="range"
        min={min}
        max={max}
        value={to}
        onChange={(event) => onToChange(Math.max(Number(event.target.value), from))}
        className={styles.rangeSliderInput}
        aria-label="Año hasta"
      />
    </div>
  );
}

type AnyCase = ExplorerCase & Record<string, unknown>;
type Amount = {
  value: number;
  currency: string;
  label?: string;
  usdEquivalent?: { usd: number } | null;
} | null | undefined;

function getField<T = unknown>(caseFile: ExplorerCase, key: string): T | null {
  const value = (caseFile as AnyCase)[key];
  if (value === null || value === undefined || value === "") return null;
  return value as T;
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const iso = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return value;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatAmountInline(amount: Amount): string {
  const formatted = formatRowAmount(amount ?? null);
  return formatted.usd ? `${formatted.primary} · ≈ ${formatted.usd}` : formatted.primary;
}

function formatMoneyVariation(amount: Amount, budget: Amount): string | null {
  if (!amount || !budget || budget.value <= 0 || amount.currency !== budget.currency) return null;
  const delta = ((amount.value - budget.value) / budget.value) * 100;
  if (Math.abs(delta) < 0.5) return "0,0 %";
  return `${delta > 0 ? "+" : ""}${delta.toFixed(1).replace(".", ",")} %`;
}

function moneyVariationFallback(amount: Amount, budget: Amount): string {
  if (amount && budget && amount.currency !== budget.currency) return "Monedas distintas";
  return "Requiere dos montos";
}

function moneyVariationMeta(amount: Amount, budget: Amount): string {
  if (amount && budget && amount.currency !== budget.currency) return "No se compara sin misma moneda";
  return "No se estima sin presupuesto y adjudicación";
}

function selectPrimaryDetailSignal(signals: CaseSignal[]): CaseSignal | null {
  return signals.find((signal) => signal.kind === "watch" && signal.leadEligible !== false) ??
    signals.find((signal) => signal.leadEligible) ??
    signals[0] ??
    null;
}

function getDetailNextAction(signal: CaseSignal | null): string {
  return signal?.action ?? "Abrir la fuente oficial, revisar receipts y registrar brechas antes de citar una conclusión.";
}

function MontoCard({
  caseFile,
  fallback,
}: {
  caseFile: ExplorerCase;
  fallback?: DetailFallback | null;
}) {
  const amount = getField<Amount>(caseFile, "amount") ?? fallback?.amount ?? null;
  const budget = getField<Amount>(caseFile, "officialBudget") ?? fallback?.officialBudget ?? null;
  if (!amount && !budget) return null;
  let overrun: string | null = null;
  if (amount && budget && budget.value > 0 && amount.currency === budget.currency) {
    const delta = ((amount.value - budget.value) / budget.value) * 100;
    if (Math.abs(delta) >= 0.5) {
      overrun = `${delta > 0 ? "+" : ""}${delta.toFixed(1).replace(".", ",")} %`;
    }
  }
  return (
    <div className={styles.detailCard}>
      <p className={styles.detailCardHead}>Monto</p>
      {amount && <DetailRow label={amountDetailLabel(amount)} value={formatAmountInline(amount)} />}
      {budget && <DetailRow label="Presupuesto oficial" value={formatAmountInline(budget)} />}
      {overrun && <DetailRow label="Variación" value={overrun} />}
    </div>
  );
}

function amountDetailLabel(amount: Exclude<Amount, null | undefined>): string {
  const label = amount.label?.toLowerCase() ?? "";
  if (label.includes("contextual") || label.includes("recaudacion")) return "Monto contextual";
  if (label.includes("presupuesto")) return "Presupuesto";
  return "Adjudicado";
}

function CronologiaCard({ caseFile }: { caseFile: ExplorerCase }) {
  const published = formatDate(getField<string>(caseFile, "publishedAt"));
  const opening = formatDate(getField<string>(caseFile, "openingAt"));
  const closing = formatDate(getField<string>(caseFile, "closedAt"));
  const awarded = formatDate(getField<string>(caseFile, "awardedAt"));
  const year = caseFile.year ? String(caseFile.year) : null;
  const hasAny = published || opening || closing || awarded;
  if (!hasAny && !year) return null;
  return (
    <div className={styles.detailCard}>
      <p className={styles.detailCardHead}>Cronología</p>
      {published && <DetailRow label="Publicación" value={published} />}
      {opening && <DetailRow label="Apertura" value={opening} />}
      {closing && <DetailRow label="Cierre" value={closing} />}
      {awarded && <DetailRow label="Adjudicación" value={awarded} />}
      {!hasAny && year && <DetailRow label="Año" value={year} />}
    </div>
  );
}

function CompetenciaCard({ caseFile }: { caseFile: ExplorerCase }) {
  const bidders = getField<number>(caseFile, "bidderCount");
  const offers = getField<number>(caseFile, "offerCount");
  const claims = getField<number>(caseFile, "claimCount");
  const state = getField<string>(caseFile, "procedureState");
  if (bidders === null && offers === null && claims === null && !state) return null;
  return (
    <div className={styles.detailCard}>
      <p className={styles.detailCardHead}>Competencia</p>
      {bidders !== null && <DetailRow label="Oferentes" value={String(bidders)} />}
      {offers !== null && <DetailRow label="Ofertas" value={String(offers)} />}
      {claims !== null && <DetailRow label="Reclamos" value={String(claims)} />}
      {state && <DetailRow label="Estado" value={state} />}
    </div>
  );
}

function UbicacionObraCard({ caseFile }: { caseFile: ExplorerCase }) {
  const locality = getField<string>(caseFile, "workLocality");
  const department = getField<string>(caseFile, "workDepartment");
  const province = getField<string>(caseFile, "workProvince");
  const named = getField<string>(caseFile, "locationName");
  if (!locality && !department && !province && !named) return null;
  return (
    <div className={styles.detailCard}>
      <p className={styles.detailCardHead}>Ubicación de obra</p>
      {locality && <DetailRow label="Localidad" value={locality} />}
      {department && <DetailRow label="Departamento" value={department} />}
      {province && <DetailRow label="Provincia / Región" value={province} />}
      {named && !locality && !department && !province && (
        <DetailRow label="Punto declarado" value={named} />
      )}
    </div>
  );
}

function ProveedorCard({
  caseFile,
  fallback,
}: {
  caseFile: ExplorerCase;
  fallback?: DetailFallback | null;
}) {
  const name =
    getField<string>(caseFile, "supplierName") ??
    fallback?.supplierName ??
    null;
  const document =
    getField<string>(caseFile, "supplierDocument") ??
    fallback?.supplierDocument ??
    null;
  const locality = getField<string>(caseFile, "supplierLocality");
  const province = getField<string>(caseFile, "supplierProvince");
  if (!name && !document) return null;
  return (
    <div className={styles.detailCard}>
      <p className={styles.detailCardHead}>Proveedor</p>
      {name && <DetailRow label="Razón social" value={name} />}
      {document && <DetailRow label="CUIT / Documento" value={document} />}
      {locality && <DetailRow label="Localidad" value={locality} />}
      {province && <DetailRow label="Provincia / Región" value={province} />}
    </div>
  );
}

function ProcedimientoCard({ caseFile }: { caseFile: ExplorerCase }) {
  const method = getField<string>(caseFile, "procurementMethodDetails");
  const awardNumber = getField<string>(caseFile, "awardNumber");
  const awardUrl = getField<string>(caseFile, "awardActUrl");
  const procedure = caseFile.procedureNumber;
  return (
    <div className={styles.detailCard}>
      <p className={styles.detailCardHead}>Procedimiento</p>
      <DetailRow label="Tipo de caso" value={describeCaseType(caseFile)} />
      {procedure && <DetailRow label="Número" value={procedure} />}
      {method && <DetailRow label="Modalidad" value={method} />}
      {awardNumber && <DetailRow label="Acto adjudicatario" value={awardNumber} />}
      {awardUrl && <DetailRow label="Acto oficial" value="Abrir documento ↗" href={awardUrl} />}
    </div>
  );
}

function EjecucionCard({ caseFile }: { caseFile: ExplorerCase }) {
  const term = getField<string>(caseFile, "executionTerm");
  const termType = getField<string>(caseFile, "executionTermType");
  const stage = getField<string>(caseFile, "projectStage");
  const physical = getField<number>(caseFile, "physicalProgress");
  const financial = getField<number>(caseFile, "financialProgress");
  if (!term && !termType && !stage && physical === null && financial === null) return null;
  return (
    <div className={styles.detailCard}>
      <p className={styles.detailCardHead}>Ejecución</p>
      {stage && <DetailRow label="Etapa" value={stage} />}
      {physical !== null && <DetailRow label="Avance físico" value={formatPercent(physical)} />}
      {financial !== null && <DetailRow label="Avance financiero" value={formatPercent(financial)} />}
      {term && <DetailRow label="Plazo declarado" value={term} />}
      {termType && <DetailRow label="Unidad de plazo" value={termType} />}
    </div>
  );
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function OrganismoCard({ caseFile }: { caseFile: ExplorerCase }) {
  const agency = caseFile.agencyName;
  const code = getField<string>(caseFile, "agencyCode");
  const unit = getField<string>(caseFile, "contractingUnit");
  if (!agency && !code && !unit) return null;
  return (
    <div className={styles.detailCard}>
      <p className={styles.detailCardHead}>Organismo</p>
      {agency && <DetailRow label="Nombre" value={agency} />}
      {code && <DetailRow label="Código SAF" value={code} />}
      {unit && <DetailRow label="Unidad operativa" value={unit} />}
    </div>
  );
}

function PuntoGeoCard({ caseFile }: { caseFile: ExplorerCase }) {
  const coords = caseFile.coordinates;
  if (!coords || !shouldExposeCaseOnMap(caseFile)) return null;
  const mapUrl = `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lon}#map=15/${coords.lat}/${coords.lon}`;
  return (
    <div className={styles.detailCard}>
      <p className={styles.detailCardHead}>Punto geográfico</p>
      <DetailRow label="Latitud" value={coords.lat.toFixed(6)} />
      <DetailRow label="Longitud" value={coords.lon.toFixed(6)} />
      <DetailRow label="Ver en mapa" value="Abrir en OpenStreetMap ↗" href={mapUrl} />
    </div>
  );
}

function buildPageList(current: number, total: number): Array<number | "…"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i);
  }
  const pages: Array<number | "…"> = [0];
  const start = Math.max(1, current - 1);
  const end = Math.min(total - 2, current + 1);
  if (start > 1) pages.push("…");
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < total - 2) pages.push("…");
  pages.push(total - 1);
  return pages;
}

function computeRowState(row: {
  hasOfficialGeometry: boolean;
  primarySignal: { severity?: "low" | "medium" | "high" } | null;
}): { tone: "verified" | "review" | "flag" | "unknown"; label: string } {
  if (row.primarySignal?.severity === "high") return { tone: "flag", label: "Prioritaria" };
  if (row.primarySignal?.severity === "medium") return { tone: "review", label: "Revisar" };
  if (!row.hasOfficialGeometry) return { tone: "unknown", label: "Sin geometría" };
  return { tone: "verified", label: "Con fuente" };
}

const CASE_TYPE_LABELS: Record<string, string> = {
  argentina_contract: "Contrato AR",
  argentina_work: "Obra AR",
  procurement_contract: "Contrato",
  procurement_process: "Compra o adjudicacion",
  public_work: "Obra publica",
  public_works_progress: "Obra con avance",
  judicial_context: "Contexto judicial",
  historical_public_work: "Obra histórica",
  supplier_judicial_context: "Proveedor con causa judicial",
};

function describeCaseType(caseFile: ExplorerCase): string {
  if ("caseType" in caseFile && caseFile.caseType) {
    return caseTypeLabel(caseFile.caseType);
  }
  return "Obra";
}

function caseTypeLabel(caseType: string): string {
  return CASE_TYPE_LABELS[caseType] ?? caseType.replace(/_/g, " ");
}

function formatRowAmount(
  amount: { value: number; currency: string; usdEquivalent?: { usd: number } | null } | null | undefined,
): { primary: string; usd: string | null } {
  if (!amount) return { primary: "—", usd: null };
  const primary = `${amount.currency} ${compactNumber(amount.value)}`;
  if (amount.currency === "USD") return { primary, usd: null };
  if (amount.usdEquivalent) {
    return { primary, usd: `US$ ${compactNumber(amount.usdEquivalent.usd)}` };
  }
  return { primary, usd: null };
}

function compactNumber(value: number): string {
  const abs = value;
  if (abs >= 1_000_000_000) return `${(abs / 1_000_000_000).toFixed(1).replace(".", ",")} B`;
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1).replace(".", ",")} M`;
  if (abs >= 1_000) return `${(abs / 1_000).toFixed(1).replace(".", ",")} K`;
  return abs.toLocaleString("es-AR");
}

function InvestigatorProfilesPanel({
  profiles,
  onSelectProfile,
}: {
  profiles: InvestigatorEntityProfile[];
  onSelectProfile: (profile: InvestigatorEntityProfile) => void;
}) {
  if (profiles.length === 0) return null;
  return (
    <section className={styles.profilePanel} aria-label="Perfiles investigativos">
      <div className={styles.profilePanelHead}>
        <div>
          <p className={styles.profileEyebrow}>Perfiles investigativos</p>
          <h2>Actores, fuentes y zonas para abrir</h2>
        </div>
        <p>Lectura agrupada del resultado actual. Sirve para orientar la revisión, no para concluir.</p>
      </div>
      <div className={styles.profileGrid}>
        {profiles.map((profile) => (
          <button
            key={`${profile.type}:${profile.key}`}
            type="button"
            className={styles.profileCard}
            onClick={() => onSelectProfile(profile)}
            aria-label={`${profile.categoryLabel}: ${profile.label}. ${profile.basis} ${profile.caveat}`}
          >
            <span className={styles.profileKind}>{profile.categoryLabel}</span>
            <strong>{profile.label}</strong>
            <span className={styles.profileMeta}>
              {profile.caseCount.toLocaleString("es-AR")} expedientes · {profile.sourceCount} fuentes
            </span>
            <span className={styles.profileAmount}>{profile.amountLabel}</span>
            <span className={styles.profileCaveat}>{profile.caveat}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function StatCard({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
      {sublabel && <p className={styles.statSublabel}>{sublabel}</p>}
    </div>
  );
}
