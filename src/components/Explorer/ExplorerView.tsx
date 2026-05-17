"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileSearch,
  Map as MapIcon,
  PanelLeftClose,
  Search,
} from "lucide-react";

import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CountryCode } from "@/lib/data/countries";
import {
  buildCaseSignals,
  type SignalCaseFile,
} from "@/lib/data/caseSignals";
import {
  buildInvestigatorExplorer,
  type InvestigatorEntityFilter,
  type InvestigatorFacet,
  type InvestigatorGeometryFilter,
} from "@/lib/data/investigatorExplorer";
import { describeReceiptLocator } from "@/lib/data/evidenceReceipts";
import { shouldExposeCaseOnMap } from "@/lib/data/uiGates";
import { ContextualCitationsPanel } from "../ContextualCitations";
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

type CountryScope = CountryCode | "ALL";

const COUNTRY_OPTIONS: Array<{ code: CountryScope; short: string; label: string }> = [
  { code: "ALL", short: "Todos", label: "Todos" },
  { code: "AR", short: "AR", label: "Argentina" },
  { code: "CL", short: "CL", label: "Chile" },
  { code: "PE", short: "PE", label: "Perú" },
];

const GEOMETRY_OPTIONS: Array<{ id: InvestigatorGeometryFilter; label: string }> = [
  { id: "any", label: "Todas" },
  { id: "with", label: "Con geometría oficial" },
  { id: "without", label: "Sin geometría de mapa" },
];

const FACET_TYPE_OPTIONS: Array<{ type: InvestigatorFacet["type"]; label: string; limit: number }> = [
  { type: "source", label: "Fuente", limit: 4 },
  { type: "agency", label: "Organismo", limit: 4 },
  { type: "supplier", label: "Proveedor", limit: 4 },
  { type: "signal", label: "Señal", limit: 5 },
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
  const [countryScope, setCountryScope] = useState<CountryScope>(selectedCountry);
  const [geometryFilter, setGeometryFilter] = useState<InvestigatorGeometryFilter>("any");
  const [activeFacets, setActiveFacets] = useState<InvestigatorFacet[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const countries = useMemo(
    () => (countryScope === "ALL" ? undefined : [countryScope]),
    [countryScope],
  );

  const countryAll = useMemo(
    () => (countryScope === "ALL"
      ? cases
      : cases.filter((caseFile) => caseFile.countryCode === countryScope)),
    [cases, countryScope],
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

  const yearScopedCases = useMemo(
    () => cases.filter((caseFile) =>
      caseFile.year === null || (caseFile.year >= yearFrom && caseFile.year <= yearTo),
    ),
    [cases, yearFrom, yearTo],
  );

  const explorer = useMemo(
    () => buildInvestigatorExplorer(yearScopedCases, {
      countries,
      entities: activeEntities,
      geometry: geometryFilter,
      limit: 500,
      query,
    }),
    [activeEntities, countries, geometryFilter, query, yearScopedCases],
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

  const rowStats = useMemo(() => {
    let signaledRows = 0;
    let withoutMapGeometry = 0;
    for (const row of explorer.rows) {
      if (row.primarySignal) signaledRows += 1;
      if (!row.hasOfficialGeometry) withoutMapGeometry += 1;
    }
    return { signaledRows, withoutMapGeometry };
  }, [explorer.rows]);

  const resetFilters = () => {
    setActiveFacets([]);
    setGeometryFilter("any");
    setQuery("");
    setYearFrom(yearBounds.min);
    setYearTo(yearBounds.max);
  };

  const selectCountryScope = (code: CountryScope) => {
    setCountryScope(code);
    setActiveFacets([]);
    if (code !== "ALL") onSelectCountry(code);
  };

  const toggleFacet = (facet: InvestigatorFacet) => {
    setActiveFacets((prev) => {
      const exists = prev.some((active) => isSameFacet(active, facet));
      if (exists) return prev.filter((active) => !isSameFacet(active, facet));
      return [...prev, facet];
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
              onClick={resetFilters}
            >
              Limpiar
            </button>
          </div>
          <div className={styles.filterGroup}>
            <p className={styles.filterGroupLabel}>Geometría</p>
            {GEOMETRY_OPTIONS.map((option) => {
              const isChecked = geometryFilter === option.id;
              return (
                <label key={option.id} className={styles.checkRow}>
                  <input
                    type="radio"
                    name="explorer-geometry"
                    checked={isChecked}
                    onChange={() => setGeometryFilter(option.id)}
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
              onFromChange={setYearFrom}
              onToChange={setYearTo}
            />
          </div>
        </section>
        <hr className={styles.sidebarDivider} />
        <section className={styles.sidebarSection} aria-labelledby="explorer-pivots-heading">
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow} id="explorer-pivots-heading">
              Pivots
            </p>
            {activeFacets.length > 0 && (
              <button type="button" className={styles.sectionLink} onClick={() => setActiveFacets([])}>
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
                  <span className={styles.activePivotLabel}>{facet.label}</span>
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
                        <span className={styles.facetLabel}>{facet.label}</span>
                        <span className={styles.facetCount}>{facet.count}</span>
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
              const isActive = country.code === countryScope;
              return (
                <button
                  key={country.code}
                  type="button"
                  className={`${styles.countryChip} ${isActive ? styles.countryChipActive : ""}`}
                  onClick={() => selectCountryScope(country.code)}
                  aria-pressed={isActive}
                >
                  {country.code === "ALL" ? (
                    <span className={styles.countryShort}>{country.short}</span>
                  ) : (
                    <CountryFlag code={country.code} />
                  )}
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
              placeholder="Buscar proveedor, organismo, fuente, receipt, señal o expediente…"
              aria-label="Buscar"
            />
          </label>
        </div>
        <div className={styles.statsGrid} aria-label="Resumen">
          <StatCard label="Expedientes" value={explorer.stats.filteredCases.toLocaleString("es-AR")} />
          <StatCard label="Con señal" value={rowStats.signaledRows.toLocaleString("es-AR")} />
          <StatCard label="Sin geometría de mapa" value={rowStats.withoutMapGeometry.toLocaleString("es-AR")} />
          <StatCard label="Pivots" value={explorer.stats.facets.toLocaleString("es-AR")} />
        </div>
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
                const state = computeRowState(caseFile);
                return (
                  <tr
                    key={caseFile.caseId}
                    className={styles.tableRow}
                    onClick={() => onSelectCase(caseFile.caseId, caseFile.countryCode)}
                  >
                    <td className={styles.cellId}>
                      <span>{caseFile.countryCode}</span>
                      <span>#{caseFile.workNumber || caseFile.caseId}</span>
                    </td>
                    <td>{caseTypeLabel(caseFile.caseType)}</td>
                    <td className={styles.cellEllipsis}>{caseFile.agencyName}</td>
                    <td className={styles.cellEllipsis}>{caseFile.supplierLabel}</td>
                    <td className={styles.tableNumeric}>
                      <span className={styles.rowAmount}>{caseFile.amountLabel}</span>
                    </td>
                    <td className={styles.cellEllipsis}>
                      <span className={styles.sourceStack}>
                        <span>{caseFile.sourceName}</span>
                        <span>{caseFile.locatorLabel}</span>
                      </span>
                    </td>
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
  const receiptLocator = caseFile.receipt
    ? describeReceiptLocator(caseFile.receipt.locatorType)
    : null;
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
            {receiptLocator?.actionLabel ?? "Abrir fuente"}
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
      {caseFile.workNumber.includes("OBR") &&
        !relatedContract &&
        !("amount" in caseFile && (caseFile as AnyCase).amount) && (
          <p className={styles.detailNote}>
            Esta obra aparece declarada en el catálogo oficial pero todavía no
            tiene contrato adjudicatario emparejado en los datasets cruzados, por
            eso no se ven proveedor ni monto.
          </p>
        )}
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
              label="URL"
              value={`${receiptLocator?.actionLabel ?? "Abrir fuente"} ↗`}
              href={caseFile.receipt.sourceUrl}
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
      )}
      <ContextualCitationsPanel citations={caseFile.contextualCitations ?? []} compact />
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

function CountryFlag({ code }: { code: CountryCode }) {
  const props = {
    width: 22,
    height: 14,
    viewBox: "0 0 22 14",
    role: "img",
    "aria-label": code,
    className: styles.countryFlag,
  } as const;
  if (code === "AR") {
    return (
      <svg {...props}>
        <rect width="22" height="14" fill="#74acdf" />
        <rect y="4.66" width="22" height="4.68" fill="#ffffff" />
        <circle cx="11" cy="7" r="1.6" fill="#f6b40e" />
      </svg>
    );
  }
  if (code === "CL") {
    return (
      <svg {...props}>
        <rect width="22" height="7" fill="#ffffff" />
        <rect y="7" width="22" height="7" fill="#d52b1e" />
        <rect width="9" height="7" fill="#0039a6" />
        <polygon
          points="4.5,2.3 5.05,3.9 6.7,3.9 5.35,4.85 5.85,6.45 4.5,5.5 3.15,6.45 3.65,4.85 2.3,3.9 3.95,3.9"
          fill="#ffffff"
        />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <rect width="22" height="14" fill="#d91023" />
      <rect x="7.33" width="7.33" height="14" fill="#ffffff" />
    </svg>
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

function isSameFacet(
  left: Pick<InvestigatorFacet, "type" | "key">,
  right: Pick<InvestigatorFacet, "type" | "key">,
): boolean {
  return left.type === right.type && left.key === right.key;
}

function buildExportHref(countryScope: CountryScope, query: string): string {
  const params = new URLSearchParams();
  if (countryScope !== "ALL") params.set("country", countryScope);
  if (query.trim()) params.set("q", query.trim());
  const suffix = params.toString();
  return suffix ? `/api/export?${suffix}` : "/api/export";
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

function StatCard({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
      {sublabel && <p className={styles.statSublabel}>{sublabel}</p>}
    </div>
  );
}
