"use client";

import { AlertTriangle, ChevronRight, Search } from "lucide-react";

import type { CaseSignalSeverity } from "@/lib/data/caseSignals";
import type { SearchSuggestion } from "@/lib/data/searchSuggestions";
import styles from "./RegionalMap.module.css";
import SidebarBrand from "./SidebarBrand";
import SyncFooter from "./SyncFooter";
import SidebarFilters, {
  type FindingOption,
  type SidebarFiltersValue,
} from "./SidebarFilters";

interface Props {
  countryName: string;
  sourceLabel: string;
  visibleCount: number;
  query: string;
  onQueryChange: (value: string) => void;
  searchSuggestions: SearchSuggestion[];
  searchPending: boolean;
  onSelectSearchSuggestion: (suggestion: SearchSuggestion) => void;
  filters: SidebarFiltersValue;
  yearBounds: { min: number; max: number };
  onYearFromChange: (year: number) => void;
  onYearToChange: (year: number) => void;
  onToggleFinding: (finding: FindingOption) => void;
  onToggleSeverity: (severity: CaseSignalSeverity) => void;
  onClearFilters: () => void;
  leadsCount: number;
  leadsPanelOpen: boolean;
  onOpenLeadsPanel: () => void;
  syncLabel: string;
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function CountrySidebar({
  countryName,
  sourceLabel,
  visibleCount,
  query,
  onQueryChange,
  searchSuggestions,
  searchPending,
  onSelectSearchSuggestion,
  filters,
  yearBounds,
  onYearFromChange,
  onYearToChange,
  onToggleFinding,
  onToggleSeverity,
  onClearFilters,
  leadsCount,
  leadsPanelOpen,
  onOpenLeadsPanel,
  syncLabel,
  collapsed,
  onToggle,
  mobileOpen,
  onCloseMobile,
}: Props) {
  const classes = [
    styles.sidebar,
    collapsed ? styles.sidebarCollapsed : "",
    mobileOpen ? styles.sidebarMobileOpen : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside className={classes} aria-label={`Información de ${countryName}`}>
      <SidebarBrand
        collapsed={collapsed}
        onToggle={mobileOpen ? onCloseMobile : onToggle}
        toggleVariant={mobileOpen ? "close" : "collapse"}
      />
      {!collapsed && (
        <>
          <section className={styles.section} aria-labelledby="country-context">
            <p className={styles.eyebrow} id="country-context">
              {countryName} · {sourceLabel}
            </p>
            <h2 className={styles.introTitle}>
              {visibleCount.toLocaleString("es-AR")} expedientes
            </h2>
            <p className={styles.introBody}>
              Tocá un punto del mapa o una pista de la lista para abrir el expediente con los datos oficiales.
            </p>
          </section>

          <section className={styles.section} aria-labelledby="search-heading">
            <p className={styles.eyebrow} id="search-heading">
              Buscar
            </p>
            <div className={styles.cpSearchWrap}>
              <label className={styles.cpSearch}>
                <Search size={15} aria-hidden />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  placeholder="Baez, DNV, 1 oferente, 46-0262"
                  aria-label="Buscar"
                  aria-controls="country-search-suggestions"
                  aria-expanded={query.trim().length >= 2 && searchSuggestions.length > 0}
                />
              </label>
              {query.trim().length >= 2 && (
                <div
                  id="country-search-suggestions"
                  className={styles.cpSearchSuggestions}
                  role="listbox"
                  aria-label="Sugerencias de búsqueda"
                >
                  {searchPending && (
                    <span className={styles.cpSearchStatus}>Actualizando resultados</span>
                  )}
                  {searchSuggestions.length > 0 ? (
                    searchSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        className={styles.cpSuggestion}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => onSelectSearchSuggestion(suggestion)}
                        role="option"
                      >
                        <span className={styles.cpSuggestionKind}>
                          {labelSuggestionKind(suggestion.kind)}
                        </span>
                        <span className={styles.cpSuggestionBody}>
                          <strong>{suggestion.label}</strong>
                          <span>{suggestion.detail}</span>
                        </span>
                      </button>
                    ))
                  ) : (
                    !searchPending && (
                      <span className={styles.cpSearchStatus}>Sin sugerencias directas</span>
                    )
                  )}
                </div>
              )}
            </div>
          </section>

          <section className={styles.section} aria-labelledby="filter-heading">
            <SidebarFilters
              value={filters}
              yearBounds={yearBounds}
              onYearFromChange={onYearFromChange}
              onYearToChange={onYearToChange}
              onToggleFinding={onToggleFinding}
              onToggleSeverity={onToggleSeverity}
              onClearAll={onClearFilters}
            />
          </section>

          <section className={styles.section} aria-labelledby="leads-button-heading">
            <p className={styles.eyebrow} id="leads-button-heading">
              Revisión
            </p>
            <button
              type="button"
              className={`${styles.cpLeadsButton} ${leadsPanelOpen ? styles.cpLeadsButtonActive : ""}`}
              onClick={onOpenLeadsPanel}
              disabled={leadsCount === 0}
              aria-expanded={leadsPanelOpen}
              aria-controls="leads-panel"
            >
              <AlertTriangle size={18} aria-hidden className={styles.cpLeadsButtonIcon} />
              <span className={styles.cpLeadsButtonLabel}>
                <span className={styles.cpLeadsButtonTitle}>
                  {leadsCount === 0 ? "Sin prioridades para estos filtros" : "Prioridad de revisión"}
                </span>
                {leadsCount > 0 && (
                  <span className={styles.cpLeadsButtonCount}>
                    {leadsCount.toLocaleString("es-AR")}
                  </span>
                )}
              </span>
              <ChevronRight size={14} aria-hidden className={styles.cpLeadsButtonChevron} />
            </button>
          </section>

          <div className={styles.spacer} aria-hidden />
          <SyncFooter label={syncLabel} />
        </>
      )}
    </aside>
  );
}

function labelSuggestionKind(kind: SearchSuggestion["kind"]): string {
  if (kind === "case") return "Caso";
  if (kind === "supplier") return "Proveedor";
  if (kind === "agency") return "Organismo";
  if (kind === "signal") return "Señal";
  if (kind === "identifier") return "ID";
  return "Fuente";
}
