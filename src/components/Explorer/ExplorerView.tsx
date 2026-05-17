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

  const contractByWorkNumber = useMemo(() => {
    const map = new Map<string, ExplorerCase>();
    for (const candidate of countryAll) {
      const publicWork = (candidate as AnyCase).publicWorkNumber;
      if (typeof publicWork === "string" && publicWork.length > 0) {
        if (!map.has(publicWork)) map.set(publicWork, candidate);
      }
    }
    return map;
  }, [countryAll]);

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

  useEffect(() => {
    if (!selectedCase) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClearSelection();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedCase, onClearSelection]);

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
    let totalUsd = 0;
    let convertedCount = 0;
    let totalAmounts = 0;
    for (const caseFile of countryAll) {
      const amount = "amount" in caseFile ? caseFile.amount : null;
      if (!amount) continue;
      totalAmounts += 1;
      if (amount.currency === "USD") {
        totalUsd += amount.value;
        convertedCount += 1;
      } else if (amount.usdEquivalent) {
        totalUsd += amount.usdEquivalent.usd;
        convertedCount += 1;
      }
    }
    return { usd: totalUsd, convertedCount, totalAmounts };
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
              onFromChange={setYearFrom}
              onToChange={setYearTo}
            />
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
          <StatCard
            label="Monto total (USD)"
            value={formatUsdCompact(totalAmount.usd)}
            sublabel={
              totalAmount.convertedCount < totalAmount.totalAmounts
                ? `${totalAmount.convertedCount} de ${totalAmount.totalAmounts} convertidos`
                : undefined
            }
          />
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
                const related = contractByWorkNumber.get(caseFile.workNumber);
                const supplierFromCase =
                  "supplierName" in caseFile ? caseFile.supplierName : null;
                const supplierFromRelated =
                  related && "supplierName" in related ? related.supplierName : null;
                const supplierName = supplierFromCase ?? supplierFromRelated ?? "—";
                const amountFromCase = "amount" in caseFile ? caseFile.amount : null;
                const amountFromRelated =
                  related && "amount" in related ? related.amount : null;
                const amount = amountFromCase ?? amountFromRelated;
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
                    <td className={styles.tableNumeric}>
                      {(() => {
                        const formatted = formatRowAmount(amount);
                        return (
                          <span className={styles.rowAmount}>
                            <span>{formatted.primary}</span>
                            {formatted.usd && (
                              <span className={styles.rowAmountUsd}>{formatted.usd}</span>
                            )}
                          </span>
                        );
                      })()}
                    </td>
                    <td className={styles.cellMono}>{formatTableDate(caseFile)}</td>
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
  const relatedContract =
    pool.find(
      (entry) =>
        entry.id !== caseFile.id &&
        typeof (entry as AnyCase).publicWorkNumber === "string" &&
        (entry as AnyCase).publicWorkNumber === caseFile.workNumber,
    ) ?? null;
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
  const sourceUrl = caseFile.receipt?.sourceUrl ?? null;
  return (
    <section className={styles.detail} aria-label="Detalle de expediente">
      <div className={styles.detailTopBar}>
        <button type="button" className={styles.detailBack} onClick={onBack}>
          <ChevronLeft size={14} aria-hidden />
          <span>Volver al listado</span>
        </button>
        {sourceUrl && (
          <a
            className={styles.detailPrimaryAction}
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Abrir fuente oficial
          </a>
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
        <MontoCard caseFile={caseFile} fallback={relatedContract} />
        <CronologiaCard caseFile={caseFile} />
        <CompetenciaCard caseFile={caseFile} />
        <UbicacionObraCard caseFile={caseFile} />
        <ProveedorCard caseFile={caseFile} fallback={relatedContract} />
        <ProcedimientoCard caseFile={caseFile} />
        <EjecucionCard caseFile={caseFile} />
        <OrganismoCard caseFile={caseFile} />
        <PuntoGeoCard caseFile={caseFile} />
      </div>
      {caseFile.caveats && caseFile.caveats.length > 0 && (
        <article className={styles.caveatCard}>
          <p className={styles.detailCardHead}>Aclaraciones de la fuente</p>
          <ul className={styles.caveatList}>
            {caseFile.caveats.map((caveat, idx) => (
              <li key={idx}>{caveat}</li>
            ))}
          </ul>
        </article>
      )}
      {caseFile.receipt && (
        <article className={styles.receiptCard}>
          <p className={styles.detailCardHead}>Recibo</p>
          <DetailRow
            label="Fuente"
            value={caseFile.receipt.sourceName || caseFile.receipt.sourceId}
          />
          {caseFile.receipt.sourceUrl && (
            <DetailRow
              label="URL"
              value="Abrir fuente ↗"
              href={caseFile.receipt.sourceUrl}
            />
          )}
          <DetailRow
            label="Snapshot"
            value={caseFile.receipt.snapshotHash?.slice(0, 16) ?? "—"}
          />
          <DetailRow
            label="Extraído"
            value={caseFile.receipt.extractedAt?.slice(0, 10) ?? "—"}
          />
        </article>
      )}
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
type Amount = { value: number; currency: string; usdEquivalent?: { usd: number } | null } | null | undefined;

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

function MontoCard({
  caseFile,
  fallback,
}: {
  caseFile: ExplorerCase;
  fallback?: ExplorerCase | null;
}) {
  const amount = getField<Amount>(caseFile, "amount") ?? (fallback ? getField<Amount>(fallback, "amount") : null);
  const budget = getField<Amount>(caseFile, "officialBudget") ?? (fallback ? getField<Amount>(fallback, "officialBudget") : null);
  if (!amount && !budget) return null;
  let overrun: string | null = null;
  if (amount && budget && budget.value > 0) {
    const delta = ((amount.value - budget.value) / budget.value) * 100;
    if (Math.abs(delta) >= 0.5) {
      overrun = `${delta > 0 ? "+" : ""}${delta.toFixed(1).replace(".", ",")} %`;
    }
  }
  return (
    <div className={styles.detailCard}>
      <p className={styles.detailCardHead}>Monto</p>
      {amount && <DetailRow label="Adjudicado" value={formatAmountInline(amount)} />}
      {budget && <DetailRow label="Presupuesto oficial" value={formatAmountInline(budget)} />}
      {overrun && <DetailRow label="Variación" value={overrun} />}
    </div>
  );
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
  fallback?: ExplorerCase | null;
}) {
  const name =
    getField<string>(caseFile, "supplierName") ??
    (fallback ? getField<string>(fallback, "supplierName") : null);
  const document =
    getField<string>(caseFile, "supplierDocument") ??
    (fallback ? getField<string>(fallback, "supplierDocument") : null);
  const locality =
    getField<string>(caseFile, "supplierLocality") ??
    (fallback ? getField<string>(fallback, "supplierLocality") : null);
  const province =
    getField<string>(caseFile, "supplierProvince") ??
    (fallback ? getField<string>(fallback, "supplierProvince") : null);
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
  if (!term && !termType) return null;
  return (
    <div className={styles.detailCard}>
      <p className={styles.detailCardHead}>Ejecución</p>
      {term && <DetailRow label="Plazo declarado" value={term} />}
      {termType && <DetailRow label="Unidad de plazo" value={termType} />}
    </div>
  );
}

function OrganismoCard({ caseFile }: { caseFile: ExplorerCase }) {
  const agency = caseFile.agencyName;
  const code = getField<string>(caseFile, "agencyCode");
  const unit = getField<string>(caseFile, "contractingUnit");
  if (!agency && !code && !unit) return null;
  return (
    <div className={styles.detailCard}>
      <p className={styles.detailCardHead}>Organismo contratante</p>
      {agency && <DetailRow label="Nombre" value={agency} />}
      {code && <DetailRow label="Código SAF" value={code} />}
      {unit && <DetailRow label="Unidad operativa" value={unit} />}
    </div>
  );
}

function PuntoGeoCard({ caseFile }: { caseFile: ExplorerCase }) {
  const coords = caseFile.coordinates;
  if (!coords) return null;
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

function formatTableDate(caseFile: ExplorerCase): string {
  const awarded = formatDate(getField<string>(caseFile, "awardedAt"));
  if (awarded) return awarded;
  const published = formatDate(getField<string>(caseFile, "publishedAt"));
  if (published) return published;
  return caseFile.year ? String(caseFile.year) : "—";
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

const CASE_TYPE_LABELS: Record<string, string> = {
  argentina_contract: "Contrato AR",
  argentina_work: "Obra AR",
  peru_contract: "Contrato PE",
  peru_budget: "Presupuesto PE",
  chile_award: "Adjudicación CL",
  chile_tender: "Licitación CL",
  judicial_context: "Contexto judicial",
  historical_public_work: "Obra histórica",
  supplier_judicial_context: "Proveedor con causa judicial",
};

function describeCaseType(caseFile: ExplorerCase): string {
  if ("caseType" in caseFile && caseFile.caseType) {
    const key = caseFile.caseType;
    return CASE_TYPE_LABELS[key] ?? key.replace(/_/g, " ");
  }
  return "Obra";
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

function formatUsdCompact(value: number): string {
  if (value === 0) return "—";
  return `US$ ${compactNumber(value)}`;
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
