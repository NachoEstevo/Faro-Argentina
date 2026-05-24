"use client";

import { X } from "lucide-react";

import type { CaseSignalSeverity } from "@/lib/data/caseSignals";
import styles from "./SidebarFilters.module.css";

/**
 * Curated "findings" — UI groupings of one or more raw signal codes that a
 * non-technical investigator can recognize. Each option resolves to the set
 * of signal codes that, if present on a case, count as a match.
 */
export type FindingOption =
  | "low_competition"
  | "recurring_supplier"
  | "over_budget"
  | "claims"
  | "supplier_alias"
  | "missing_amount";

export const FINDING_CODES: Record<FindingOption, string[]> = {
  low_competition: ["single_bidder", "limited_competition"],
  recurring_supplier: [
    "recurring_supplier_agency",
    "repeat_single_bid_winner",
    "supplier_concentration",
  ],
  over_budget: ["amount_over_official_budget"],
  claims: ["high_claim_volume"],
  supplier_alias: ["possible_supplier_alias"],
  missing_amount: ["missing_amount"],
};

const FINDING_LABELS: Record<FindingOption, string> = {
  low_competition: "Competencia baja",
  recurring_supplier: "Proveedor recurrente",
  over_budget: "Monto sobre presupuesto",
  claims: "Reclamos asociados",
  supplier_alias: "Posible alias proveedor",
  missing_amount: "Monto faltante",
};

const FINDING_ORDER: FindingOption[] = [
  "low_competition",
  "recurring_supplier",
  "over_budget",
  "claims",
  "supplier_alias",
  "missing_amount",
];

const SEVERITY_LABELS: Record<CaseSignalSeverity, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

const SEVERITY_ORDER: CaseSignalSeverity[] = ["high", "medium", "low"];

export interface SidebarFiltersValue {
  yearFrom: number;
  yearTo: number;
  findings: Set<FindingOption>;
  severities: Set<CaseSignalSeverity>;
}

interface Props {
  value: SidebarFiltersValue;
  yearBounds: { min: number; max: number };
  onYearFromChange: (year: number) => void;
  onYearToChange: (year: number) => void;
  onToggleFinding: (finding: FindingOption) => void;
  onToggleSeverity: (severity: CaseSignalSeverity) => void;
  onClearAll: () => void;
}

export default function SidebarFilters({
  value,
  yearBounds,
  onYearFromChange,
  onYearToChange,
  onToggleFinding,
  onToggleSeverity,
  onClearAll,
}: Props) {
  const span = Math.max(1, yearBounds.max - yearBounds.min);
  const fromPct = ((value.yearFrom - yearBounds.min) / span) * 100;
  const toPct = ((value.yearTo - yearBounds.min) / span) * 100;
  const hasAny =
    value.yearFrom !== yearBounds.min ||
    value.yearTo !== yearBounds.max ||
    value.findings.size > 0 ||
    value.severities.size > 0;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h3 className={styles.title}>Filtros</h3>
        {hasAny && (
          <button
            type="button"
            className={styles.clearAll}
            onClick={onClearAll}
            aria-label="Limpiar todos los filtros"
          >
            <X size={11} aria-hidden /> Limpiar
          </button>
        )}
      </div>

      <div className={styles.group}>
        <div className={styles.groupHeader}>
          <span className={styles.groupLabel}>Año</span>
          <span className={styles.groupValue}>
            {value.yearFrom} – {value.yearTo}
          </span>
        </div>
        <div className={styles.rangeSlider}>
          <div className={styles.rangeSliderTrack} aria-hidden />
          <div
            className={styles.rangeSliderFill}
            aria-hidden
            style={{ left: `${fromPct}%`, right: `${100 - toPct}%` }}
          />
          <input
            type="range"
            min={yearBounds.min}
            max={yearBounds.max}
            value={value.yearFrom}
            onChange={(event) =>
              onYearFromChange(Math.min(Number(event.target.value), value.yearTo))
            }
            className={styles.rangeSliderInput}
            aria-label="Año desde"
          />
          <input
            type="range"
            min={yearBounds.min}
            max={yearBounds.max}
            value={value.yearTo}
            onChange={(event) =>
              onYearToChange(Math.max(Number(event.target.value), value.yearFrom))
            }
            className={styles.rangeSliderInput}
            aria-label="Año hasta"
          />
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.groupLabel}>Señal</span>
        <div className={styles.chipColumn}>
          {FINDING_ORDER.map((finding) => {
            const active = value.findings.has(finding);
            return (
              <button
                key={finding}
                type="button"
                className={`${styles.chip} ${styles.chipFlex} ${active ? styles.chipActive : ""}`}
                onClick={() => onToggleFinding(finding)}
                aria-pressed={active}
              >
                {FINDING_LABELS[finding]}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.groupLabel}>Prioridad</span>
        <div className={styles.chipRow}>
          {SEVERITY_ORDER.map((severity) => {
            const active = value.severities.has(severity);
            return (
              <button
                key={severity}
                type="button"
                className={`${styles.chip} ${styles[`chipSev_${severity}`]} ${active ? styles.chipActive : ""}`}
                onClick={() => onToggleSeverity(severity)}
                aria-pressed={active}
              >
                <span className={styles.chipDot} aria-hidden />
                {SEVERITY_LABELS[severity]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
