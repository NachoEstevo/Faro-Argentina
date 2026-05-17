"use client";

import { useMemo, useState } from "react";
import {
  Download,
  FileSearch,
  Map as MapIcon,
  PanelLeftClose,
  Plus,
  Search,
} from "lucide-react";

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
  onSwitchToMap: () => void;
}

type StateFilter = "verified" | "review" | "no_geometry";

const STATE_OPTIONS: Array<{ id: StateFilter; label: string }> = [
  { id: "verified", label: "Verificadas" },
  { id: "review", label: "A revisar" },
  { id: "no_geometry", label: "Sin geometría" },
];

const COUNTRY_OPTIONS: Array<{ code: CountryCode; short: string; label: string }> = [
  { code: "AR", short: "AR", label: "Argentina" },
  { code: "CL", short: "CL", label: "Chile" },
  { code: "PE", short: "PE", label: "Perú" },
];

export default function ExplorerView({
  cases,
  selectedCountry,
  onSelectCountry,
  onSwitchToMap,
}: Props) {
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
  const [query, setQuery] = useState("");

  const supplierCount = useMemo(() => {
    const set = new Set<string>();
    for (const caseFile of countryCases) {
      const name = "supplierName" in caseFile ? caseFile.supplierName : null;
      if (name) set.add(name.trim().toLowerCase());
    }
    return set.size;
  }, [countryCases]);

  const totalAmount = useMemo(() => {
    let totalArs = 0;
    let totalUsd = 0;
    for (const caseFile of countryCases) {
      const amount = "amount" in caseFile ? caseFile.amount : null;
      if (!amount) continue;
      const value = amount.value;
      if (amount.currency === "ARS") totalArs += value;
      else if (amount.currency === "USD") totalUsd += value;
    }
    return { ars: totalArs, usd: totalUsd };
  }, [countryCases]);

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
          <div className={styles.modeToggle} role="group" aria-label="Modo de exploración">
            <button type="button" className={styles.modeToggleButton} onClick={onSwitchToMap}>
              <MapIcon size={13} aria-hidden />
              Mapa
            </button>
            <button
              type="button"
              className={`${styles.modeToggleButton} ${styles.modeToggleActive}`}
              aria-pressed
            >
              <FileSearch size={13} aria-hidden />
              Explorer
            </button>
          </div>
          <div className={styles.countrySelector} role="group" aria-label="País">
            {COUNTRY_OPTIONS.map((country) => {
              const isActive = country.code === selectedCountry;
              return (
                <button
                  key={country.code}
                  type="button"
                  className={`${styles.countryChip} ${isActive ? styles.countryChipActive : ""}`}
                  onClick={() => onSelectCountry(country.code)}
                  aria-pressed={isActive}
                >
                  <span className={styles.countryShort}>{country.short}</span>
                  <span className={styles.countryName}>{country.label}</span>
                </button>
              );
            })}
          </div>
        </header>
        <div className={styles.searchWrap}>
          <label className={styles.searchBox}>
            <Search size={15} aria-hidden />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por #ID, organismo o proveedor…"
              aria-label="Buscar"
            />
          </label>
        </div>
        <div className={styles.statsGrid} aria-label="Resumen">
          <StatCard label="Obras" value={countryCases.length.toLocaleString("es-AR")} />
          <StatCard label="Monto" value={formatAmount(totalAmount.ars, totalAmount.usd)} />
          <StatCard label="A revisar" value={stateCounts.review.toLocaleString("es-AR")} />
          <StatCard label="Proveedores" value={supplierCount.toLocaleString("es-AR")} />
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Tipo</th>
                <th>Organismo</th>
                <th>Proveedor</th>
                <th className={styles.tableNumeric}>Monto</th>
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </main>
    </section>
  );
}

function formatAmount(ars: number, usd: number): string {
  if (ars === 0 && usd === 0) return "—";
  const primary = ars >= usd ? { value: ars, currency: "ARS" } : { value: usd, currency: "USD" };
  const abs = primary.value;
  let formatted: string;
  if (abs >= 1_000_000_000) formatted = `${(abs / 1_000_000_000).toFixed(1).replace(".", ",")} B`;
  else if (abs >= 1_000_000) formatted = `${(abs / 1_000_000).toFixed(1).replace(".", ",")} M`;
  else if (abs >= 1_000) formatted = `${(abs / 1_000).toFixed(1).replace(".", ",")} K`;
  else formatted = abs.toLocaleString("es-AR");
  return `${primary.currency} ${formatted}`;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
    </div>
  );
}
