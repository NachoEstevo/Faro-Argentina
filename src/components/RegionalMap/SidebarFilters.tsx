"use client";

import { X } from "lucide-react";

import type { CaseSignalFamily, CaseSignalSeverity } from "@/lib/data/caseSignals";
import styles from "./SidebarFilters.module.css";

export type CaseTypeOption = "procurement_contract" | "procurement_process" | "budget_execution";

const FAMILY_LABELS: Record<CaseSignalFamily, string> = {
  competition: "Competencia",
  money: "Dinero",
  supplier: "Proveedor",
  traceability: "Trazabilidad",
  geo_visual: "Geo/visual",
  data_gap: "Falta de dato",
  context: "Contexto",
};

const CASE_TYPE_LABELS: Record<CaseTypeOption, string> = {
  procurement_contract: "Contrato",
  procurement_process: "Adjudicación",
  budget_execution: "Ejecución",
};

const SEVERITY_LABELS: Record<CaseSignalSeverity, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

const FAMILY_ORDER: CaseSignalFamily[] = [
  "competition",
  "money",
  "supplier",
  "traceability",
  "geo_visual",
  "data_gap",
  "context",
];

const CASE_TYPE_ORDER: CaseTypeOption[] = [
  "procurement_contract",
  "procurement_process",
  "budget_execution",
];

const SEVERITY_ORDER: CaseSignalSeverity[] = ["high", "medium", "low"];

export interface SidebarFiltersValue {
  yearFrom: number;
  yearTo: number;
  families: Set<CaseSignalFamily>;
  caseTypes: Set<CaseTypeOption>;
  severities: Set<CaseSignalSeverity>;
}

interface Props {
  value: SidebarFiltersValue;
  yearBounds: { min: number; max: number };
  onYearFromChange: (year: number) => void;
  onYearToChange: (year: number) => void;
  onToggleFamily: (family: CaseSignalFamily) => void;
  onToggleCaseType: (caseType: CaseTypeOption) => void;
  onToggleSeverity: (severity: CaseSignalSeverity) => void;
  onClearAll: () => void;
}

export default function SidebarFilters({
  value,
  yearBounds,
  onYearFromChange,
  onYearToChange,
  onToggleFamily,
  onToggleCaseType,
  onToggleSeverity,
  onClearAll,
}: Props) {
  const span = Math.max(1, yearBounds.max - yearBounds.min);
  const fromPct = ((value.yearFrom - yearBounds.min) / span) * 100;
  const toPct = ((value.yearTo - yearBounds.min) / span) * 100;
  const hasAny =
    value.yearFrom !== yearBounds.min ||
    value.yearTo !== yearBounds.max ||
    value.families.size > 0 ||
    value.caseTypes.size > 0 ||
    value.severities.size > 0;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Filtros</p>
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
        <span className={styles.groupLabel}>Tipo</span>
        <div className={styles.chipRow}>
          {CASE_TYPE_ORDER.map((option) => {
            const active = value.caseTypes.has(option);
            return (
              <button
                key={option}
                type="button"
                className={`${styles.chip} ${active ? styles.chipActive : ""}`}
                onClick={() => onToggleCaseType(option)}
                aria-pressed={active}
              >
                {CASE_TYPE_LABELS[option]}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.groupLabel}>Familia</span>
        <div className={styles.chipRow}>
          {FAMILY_ORDER.map((family) => {
            const active = value.families.has(family);
            return (
              <button
                key={family}
                type="button"
                className={`${styles.chip} ${active ? styles.chipActive : ""}`}
                onClick={() => onToggleFamily(family)}
                aria-pressed={active}
              >
                {FAMILY_LABELS[family]}
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
