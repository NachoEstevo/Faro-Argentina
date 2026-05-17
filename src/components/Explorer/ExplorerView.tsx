"use client";

import { useMemo, useState } from "react";
import { PanelLeftClose } from "lucide-react";

import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CountryCode } from "@/lib/data/countries";
import {
  getCaseAlertSeverity,
  type SignalCaseFile,
} from "@/lib/data/caseSignals";
import FaroMark from "../FaroMark";
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
        </section>
      </aside>
      <main className={styles.main}>
        <div className={styles.placeholder}>Explorer</div>
      </main>
    </section>
  );
}
