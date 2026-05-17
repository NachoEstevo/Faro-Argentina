"use client";

import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CircleDollarSign,
  CircleHelp,
  FileCheck,
  Info,
  MapPin,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { CaseLead } from "@/lib/data/caseLeads";
import type { CaseSignalFamily, CaseSignalSeverity } from "@/lib/data/caseSignals";
import styles from "./RegionalMap.module.css";
import SidebarBrand from "./SidebarBrand";
import SyncFooter from "./SyncFooter";
import SidebarFilters, { type SidebarFiltersValue } from "./SidebarFilters";

const FAMILY_ICONS: Record<CaseSignalFamily, LucideIcon> = {
  competition: Users,
  money: CircleDollarSign,
  supplier: Building2,
  traceability: FileCheck,
  geo_visual: MapPin,
  data_gap: CircleHelp,
  context: Info,
};

const SEVERITY_CLASS: Record<"high" | "medium" | "low", string> = {
  high: styles.cpLeadIconHigh,
  medium: styles.cpLeadIconMedium,
  low: styles.cpLeadIconLow,
};

interface Props {
  countryName: string;
  sourceLabel: string;
  visibleCount: number;
  query: string;
  onQueryChange: (value: string) => void;
  filters: SidebarFiltersValue;
  yearBounds: { min: number; max: number };
  onYearFromChange: (year: number) => void;
  onYearToChange: (year: number) => void;
  onToggleFamily: (family: CaseSignalFamily) => void;
  onToggleSeverity: (severity: CaseSignalSeverity) => void;
  onClearFilters: () => void;
  leads: CaseLead[];
  selectedCaseId: string | null;
  onSelectCase: (caseId: string) => void;
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
  filters,
  yearBounds,
  onYearFromChange,
  onYearToChange,
  onToggleFamily,
  onToggleSeverity,
  onClearFilters,
  leads,
  selectedCaseId,
  onSelectCase,
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
            <label className={styles.cpSearch}>
              <Search size={15} aria-hidden />
              <input
                type="text"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Obra, organismo o proveedor"
                aria-label="Buscar"
              />
            </label>
          </section>

          <section className={styles.section} aria-labelledby="filter-heading">
            <SidebarFilters
              value={filters}
              yearBounds={yearBounds}
              onYearFromChange={onYearFromChange}
              onYearToChange={onYearToChange}
              onToggleFamily={onToggleFamily}
              onToggleSeverity={onToggleSeverity}
              onClearAll={onClearFilters}
            />
          </section>

          <section
            className={`${styles.section} ${styles.cpLeadsSection}`}
            aria-labelledby="leads-heading"
          >
            <p className={styles.eyebrow} id="leads-heading">
              Casos a revisar · {leads.length}
            </p>
            {leads.length === 0 ? (
              <p className={styles.cpLeadEmpty}>No hay alertas para estos filtros.</p>
            ) : (
              <div className={styles.cpLeadsList}>
                {leads.map((lead) => {
                  const isSelected = lead.caseId === selectedCaseId;
                  const family = lead.primarySignal.family;
                  const SignalIcon = family ? FAMILY_ICONS[family] : AlertTriangle;
                  const severity = lead.primarySignal.severity;
                  const severityClass = severity ? SEVERITY_CLASS[severity] : "";
                  return (
                    <button
                      key={lead.leadId}
                      type="button"
                      className={`${styles.cpLeadCard} ${isSelected ? styles.cpLeadCardActive : ""}`}
                      onClick={() => onSelectCase(lead.caseId)}
                      aria-pressed={isSelected}
                    >
                      <span className={`${styles.cpLeadIcon} ${severityClass}`}>
                        <SignalIcon size={14} aria-hidden />
                      </span>
                      <span className={styles.cpLeadBody}>
                        <span className={styles.cpLeadMeta}>{lead.sourceName}</span>
                        <strong className={styles.cpLeadTitle}>{lead.caseTitle}</strong>
                        <span className={styles.cpLeadWhy}>{lead.why}</span>
                      </span>
                      <ArrowRight size={14} aria-hidden className={styles.cpLeadArrow} />
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <SyncFooter label={syncLabel} />
        </>
      )}
    </aside>
  );
}
