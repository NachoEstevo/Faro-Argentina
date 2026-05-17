"use client";

import { useMemo, useState } from "react";
import { Download, PanelLeftClose, Plus } from "lucide-react";

import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CountryCode } from "@/lib/data/countries";
import {
  getCaseAlertSeverity,
  type SignalCaseFile,
} from "@/lib/data/caseSignals";
import FaroMark from "../FaroMark";
import SyncFooter from "../RegionalMap/SyncFooter";
import styles from "./Explorer.module.css";

interface Props {
  cases: ExplorerCase[];
  selectedCountry: CountryCode;
  onSelectCountry: (code: CountryCode) => void;
  selectedCaseId: string | null;
  onSelectCase: (caseId: string, countryCode: CountryCode) => void;
}

type StateFilter = "verified" | "review" | "no_geometry";

const STATE_OPTIONS: Array<{ id: StateFilter; label: string }> = [
  { id: "verified", label: "Verificadas" },
  { id: "review", label: "A revisar" },
  { id: "no_geometry", label: "Sin geometría" },
];

export default function ExplorerView({ cases, selectedCountry }: Props) {
  const [stateFilters, setStateFilters] = useState<Set<StateFilter>>(
    () => new Set<StateFilter>(["verified", "review"]),
  );

  const countryCases = useMemo(
    () => cases.filter((caseFile) => caseFile.countryCode === selectedCountry),
    [cases, selectedCountry],
  );

  const yearBounds = useMemo(() => {
    const years = countryCases
      .map((caseFile) => caseFile.year)
      .filter((value): value is number => value !== null);
    if (years.length === 0) {
      const now = new Date().getFullYear();
      return { min: now, max: now };
    }
    return { min: Math.min(...years), max: Math.max(...years) };
  }, [countryCases]);

  const [yearFrom, setYearFrom] = useState<number>(yearBounds.min);
  const [yearTo, setYearTo] = useState<number>(yearBounds.max);

  const stateCounts = useMemo(() => {
    let verified = 0;
    let review = 0;
    let noGeometry = 0;
    for (const caseFile of countryCases) {
      const severity = getCaseAlertSeverity(caseFile as SignalCaseFile);
      if (caseFile.coordinates === null) noGeometry += 1;
      else if (severity === "high" || severity === "medium") review += 1;
      else verified += 1;
    }
    return { verified, review, no_geometry: noGeometry };
  }, [countryCases]);

  const toggleState = (id: StateFilter) => {
    setStateFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className={styles.shell} aria-label="Explorer">
      <aside className={styles.sidebar} aria-label="Filtros y guardados">
        <header className={styles.sidebarBrand}>
          <FaroMark compact />
          <button type="button" className={styles.sidebarCollapse} aria-label="Colapsar">
            <PanelLeftClose size={16} aria-hidden />
          </button>
        </header>
        <section className={styles.sidebarSection} aria-labelledby="explorer-filters-heading">
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow} id="explorer-filters-heading">
              Filtros
            </p>
            <button
              type="button"
              className={styles.sectionLink}
              onClick={() => setStateFilters(new Set(["verified", "review"]))}
            >
              Limpiar
            </button>
          </div>
          <div className={styles.filterGroup}>
            <p className={styles.filterGroupLabel}>Estado</p>
            {STATE_OPTIONS.map((option) => {
              const isChecked = stateFilters.has(option.id);
              return (
                <label key={option.id} className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleState(option.id)}
                  />
                  <span className={`${styles.checkDot} ${styles[`dot_${option.id}`]}`} aria-hidden />
                  <span className={styles.checkLabel}>{option.label}</span>
                  <span className={styles.checkCount}>{stateCounts[option.id]}</span>
                </label>
              );
            })}
          </div>
          <div className={styles.filterGroup}>
            <p className={styles.filterGroupLabel}>Período</p>
            <div className={styles.yearRow}>
              <input
                type="number"
                className={styles.yearInput}
                value={yearFrom}
                min={yearBounds.min}
                max={yearTo}
                onChange={(event) => setYearFrom(Number(event.target.value))}
                aria-label="Año desde"
              />
              <input
                type="number"
                className={styles.yearInput}
                value={yearTo}
                min={yearFrom}
                max={yearBounds.max}
                onChange={(event) => setYearTo(Number(event.target.value))}
                aria-label="Año hasta"
              />
            </div>
          </div>
        </section>
        <hr className={styles.sidebarDivider} />
        <section className={styles.sidebarSection} aria-labelledby="explorer-saved-heading">
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow} id="explorer-saved-heading">
              Guardadas
            </p>
            <button type="button" className={styles.iconButton} aria-label="Agregar búsqueda guardada">
              <Plus size={14} aria-hidden />
            </button>
          </div>
          <p className={styles.savedEmpty}>
            Aún no tenés búsquedas guardadas. Aplicá filtros y guardalos para volver más tarde.
          </p>
        </section>
        <button type="button" className={styles.exportRow}>
          <Download size={14} aria-hidden />
          <span>Exportar resultados</span>
        </button>
        <div className={styles.sidebarSpacer} />
        <div className={styles.sidebarFooter}>
          <SyncFooter label="Datos hasta mayo 2026" />
        </div>
      </aside>
      <main className={styles.main}>
        <header className={styles.mainHeader}>
          <h1 className={styles.mainTitle}>Explorer</h1>
        </header>
      </main>
    </section>
  );
}
