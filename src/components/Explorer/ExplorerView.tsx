"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
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
  buildCaseSignals,
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
  selectedCase: ExplorerCase | null;
  onSelectCase: (caseId: string, countryCode: CountryCode) => void;
  onClearSelection: () => void;
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
  selectedCase,
  onSelectCase,
  onClearSelection,
  onSwitchToMap,
}: Props) {
  const [stateFilters, setStateFilters] = useState<Set<StateFilter>>(
    () => new Set<StateFilter>(["verified", "review"]),
  );

  const countryAll = useMemo(
    () => cases.filter((caseFile) => caseFile.countryCode === selectedCountry),
    [cases, selectedCountry],
  );

  const yearBounds = useMemo(() => {
    const years = countryAll
      .map((caseFile) => caseFile.year)
      .filter((value): value is number => value !== null);
    if (years.length === 0) {
      const now = new Date().getFullYear();
      return { min: now, max: now };
    }
    return { min: Math.min(...years), max: Math.max(...years) };
  }, [countryAll]);

  const [yearFrom, setYearFrom] = useState<number>(yearBounds.min);
  const [yearTo, setYearTo] = useState<number>(yearBounds.max);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [query, stateFilters, yearFrom, yearTo, selectedCountry]);

  useEffect(() => {
    setYearFrom(yearBounds.min);
    setYearTo(yearBounds.max);
  }, [yearBounds.min, yearBounds.max]);

  const countryCases = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return countryAll.filter((caseFile) => {
      const severity = getCaseAlertSeverity(caseFile as SignalCaseFile);
      const isReview = severity === "high" || severity === "medium";
      const isNoGeometry = caseFile.coordinates === null;
      const isVerified = !isReview && !isNoGeometry;
      const matchState =
        (stateFilters.has("verified") && isVerified) ||
        (stateFilters.has("review") && isReview) ||
        (stateFilters.has("no_geometry") && isNoGeometry);
      if (!matchState && stateFilters.size > 0) return false;

      if (caseFile.year !== null && (caseFile.year < yearFrom || caseFile.year > yearTo)) {
        return false;
      }

      if (normalizedQuery.length === 0) return true;
      const supplier = "supplierName" in caseFile ? caseFile.supplierName ?? "" : "";
      const haystack = [
        caseFile.workNumber,
        caseFile.title,
        caseFile.agencyName,
        supplier,
        caseFile.id,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [countryAll, query, stateFilters, yearFrom, yearTo]);

  const PAGE_SIZE = 8;
  const pagedRows = useMemo(
    () => countryCases.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [countryCases, page],
  );

  const supplierCount = useMemo(() => {
    const set = new Set<string>();
    for (const caseFile of countryAll) {
      const name = "supplierName" in caseFile ? caseFile.supplierName : null;
      if (name) set.add(name.trim().toLowerCase());
    }
    return set.size;
  }, [countryAll]);

  const totalAmount = useMemo(() => {
    let totalArs = 0;
    let totalUsd = 0;
    for (const caseFile of countryAll) {
      const amount = "amount" in caseFile ? caseFile.amount : null;
      if (!amount) continue;
      const value = amount.value;
      if (amount.currency === "ARS") totalArs += value;
      else if (amount.currency === "USD") totalUsd += value;
    }
    return { ars: totalArs, usd: totalUsd };
  }, [countryAll]);

  const stateCounts = useMemo(() => {
    let verified = 0;
    let review = 0;
    let noGeometry = 0;
    for (const caseFile of countryAll) {
      const severity = getCaseAlertSeverity(caseFile as SignalCaseFile);
      if (caseFile.coordinates === null) noGeometry += 1;
      else if (severity === "high" || severity === "medium") review += 1;
      else verified += 1;
    }
    return { verified, review, no_geometry: noGeometry };
  }, [countryAll]);

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
        {selectedCase ? (
          <ExplorerDetail
            caseFile={selectedCase}
            pool={countryAll}
            onBack={onClearSelection}
            onSelectCase={onSelectCase}
          />
        ) : (
        <>
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
          {(() => {
            const totalPages = Math.max(1, Math.ceil(countryCases.length / PAGE_SIZE));
            const safePage = Math.min(page, totalPages - 1);
            const from = countryCases.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
            const to = Math.min(countryCases.length, (safePage + 1) * PAGE_SIZE);
            return (
              <div className={styles.tableFoot}>
                <span className={styles.tableFootLabel}>
                  Mostrando {from}-{to} de {countryCases.length.toLocaleString("es-AR")}
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
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 && (
                <tr className={styles.tableEmptyRow}>
                  <td colSpan={7} className={styles.tableEmpty}>
                    No hay expedientes que coincidan con los filtros actuales.
                  </td>
                </tr>
              )}
              {pagedRows.map((caseFile) => {
                const supplierName =
                  "supplierName" in caseFile ? caseFile.supplierName ?? "—" : "—";
                const amount = "amount" in caseFile ? caseFile.amount : null;
                const state = computeRowState(caseFile);
                return (
                  <tr
                    key={caseFile.id}
                    className={styles.tableRow}
                    onClick={() => onSelectCase(caseFile.id, caseFile.countryCode)}
                  >
                    <td className={styles.cellId}>#{caseFile.workNumber}</td>
                    <td>{describeCaseType(caseFile)}</td>
                    <td className={styles.cellEllipsis}>{caseFile.agencyName}</td>
                    <td className={styles.cellEllipsis}>{supplierName}</td>
                    <td className={styles.tableNumeric}>{formatRowAmount(amount)}</td>
                    <td className={styles.cellMono}>{caseFile.year ?? "—"}</td>
                    <td>
                      <span className={`${styles.stateBadge} ${styles[`state_${state.tone}`]}`}>
                        <span className={styles.stateBadgeDot} aria-hidden />
                        {state.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
        )}
      </main>
    </section>
  );
}

function ExplorerDetail({
  caseFile,
  pool,
  onBack,
  onSelectCase,
}: {
  caseFile: ExplorerCase;
  pool: ExplorerCase[];
  onBack: () => void;
  onSelectCase: (caseId: string, countryCode: CountryCode) => void;
}) {
  const signals = buildCaseSignals(caseFile as SignalCaseFile);
  const supplierKey =
    "supplierName" in caseFile && caseFile.supplierName
      ? caseFile.supplierName.trim().toLowerCase()
      : null;
  const similar = pool
    .filter((entry) => entry.id !== caseFile.id)
    .filter((entry) => {
      if (entry.agencyName === caseFile.agencyName) return true;
      if (supplierKey && "supplierName" in entry && entry.supplierName) {
        return entry.supplierName.trim().toLowerCase() === supplierKey;
      }
      return false;
    })
    .slice(0, 4);
  return (
    <section className={styles.detail} aria-label="Detalle de expediente">
      <button type="button" className={styles.detailBack} onClick={onBack}>
        ← Volver al listado
      </button>
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
      {(() => {
        const primary = signals.find((signal) => signal.kind === "watch");
        if (!primary) return null;
        return (
          <article className={styles.detailReason}>
            <p className={styles.detailReasonEyebrow}>Por qué esta señal</p>
            <p className={styles.detailReasonBody}>{primary.summary}</p>
            {primary.caveat && (
              <p className={styles.detailReasonCaveat}>{primary.caveat}</p>
            )}
          </article>
        );
      })()}
      <div className={styles.detailGrid}>
        <div className={styles.detailCard}>
          <p className={styles.detailCardHead}>Datos</p>
          <DetailRow label="Monto adjudicado" value={formatRowAmount("amount" in caseFile ? caseFile.amount : null)} />
          <DetailRow label="Año" value={caseFile.year ? String(caseFile.year) : "—"} />
          <DetailRow label="Procedimiento" value={caseFile.procedureNumber || "—"} />
          <DetailRow label="Tipo" value={describeCaseType(caseFile)} />
        </div>
        <div className={styles.detailCard}>
          <p className={styles.detailCardHead}>Proveedor</p>
          <DetailRow
            label="Razón social"
            value={"supplierName" in caseFile && caseFile.supplierName ? caseFile.supplierName : "—"}
          />
          <DetailRow
            label="CUIT / Documento"
            value={
              "supplierDocument" in caseFile && caseFile.supplierDocument
                ? caseFile.supplierDocument
                : "—"
            }
          />
          <DetailRow label="Organismo" value={caseFile.agencyName || "—"} />
        </div>
      </div>
      {similar.length > 0 && (
        <section className={styles.similarSection} aria-label="Casos similares">
          <p className={styles.similarHead}>Casos similares</p>
          <div className={styles.similarGrid}>
            {similar.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={styles.similarCard}
                onClick={() => onSelectCase(entry.id, entry.countryCode)}
              >
                <span className={styles.similarCardId}>#{entry.workNumber}</span>
                <strong className={styles.similarCardTitle}>{entry.title}</strong>
                <span className={styles.similarCardMeta}>{entry.agencyName}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailRowLabel}>{label}</span>
      <span className={styles.detailRowValue}>{value}</span>
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

function computeRowState(caseFile: ExplorerCase): { tone: "verified" | "review" | "flag" | "unknown"; label: string } {
  const severity = getCaseAlertSeverity(caseFile as SignalCaseFile);
  if (severity === "high") return { tone: "flag", label: "Marcado" };
  if (severity === "medium") return { tone: "review", label: "Revisar" };
  if (caseFile.coordinates === null) return { tone: "unknown", label: "Sin datos" };
  return { tone: "verified", label: "Verificado" };
}

function describeCaseType(caseFile: ExplorerCase): string {
  if ("caseType" in caseFile && caseFile.caseType) {
    return caseFile.caseType.replace(/_/g, " ");
  }
  return "Obra";
}

function formatRowAmount(amount: { value: number; currency: string } | null | undefined): string {
  if (!amount) return "—";
  const abs = amount.value;
  let formatted: string;
  if (abs >= 1_000_000_000) formatted = `${(abs / 1_000_000_000).toFixed(1).replace(".", ",")} B`;
  else if (abs >= 1_000_000) formatted = `${(abs / 1_000_000).toFixed(1).replace(".", ",")} M`;
  else if (abs >= 1_000) formatted = `${(abs / 1_000).toFixed(1).replace(".", ",")} K`;
  else formatted = abs.toLocaleString("es-AR");
  return `${amount.currency} ${formatted}`;
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
