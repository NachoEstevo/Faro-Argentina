"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Building2,
  Database,
  FileSearch,
  MapPin,
  Search,
  SlidersHorizontal,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  buildInvestigatorExplorer,
  type InvestigatorEntityFilter,
  type InvestigatorEntityType,
  type InvestigatorExplorerCase,
  type InvestigatorFacet,
  type InvestigatorGeometryFilter,
} from "@/lib/data/investigatorExplorer";
import type { CountryCode } from "@/lib/data/sourceCatalog";

interface Props {
  cases: InvestigatorExplorerCase[];
  selectedCaseId: string | null;
  onSelectCase: (caseId: string, countryCode: CountryCode) => void;
}

type CountryFilter = "ALL" | CountryCode;

const countryOptions: Array<{ value: CountryFilter; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "AR", label: "AR" },
  { value: "PE", label: "PE" },
  { value: "CL", label: "CL" },
];

const geometryOptions: Array<{ value: InvestigatorGeometryFilter; label: string }> = [
  { value: "any", label: "Toda evidencia" },
  { value: "with", label: "Con mapa" },
  { value: "without", label: "Sin mapa" },
];

const entityIcons: Record<InvestigatorEntityType, LucideIcon> = {
  supplier: UserRound,
  agency: Building2,
  source: Database,
  signal: Activity,
};

export default function InvestigatorExplorer({ cases, selectedCaseId, onSelectCase }: Props) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState<CountryFilter>("ALL");
  const [geometry, setGeometry] = useState<InvestigatorGeometryFilter>("any");
  const [signalCode, setSignalCode] = useState("all");
  const [entity, setEntity] = useState<InvestigatorEntityFilter | null>(null);

  const countries = country === "ALL" ? undefined : [country];
  const explorer = useMemo(
    () => buildInvestigatorExplorer(cases, {
      query,
      countries,
      geometry,
      signalCode: signalCode === "all" ? undefined : signalCode,
      entity: entity ?? undefined,
      limit: 160,
    }),
    [cases, countries, entity, geometry, query, signalCode],
  );
  const signalOptions = useMemo(
    () => buildInvestigatorExplorer(cases, {
      query,
      countries,
      geometry,
      entity: entity ?? undefined,
      limit: 500,
    }).facets.filter((facet) => facet.type === "signal"),
    [cases, countries, entity, geometry, query],
  );

  const pivotFacets = explorer.facets
    .filter((facet) => facet.type !== "signal" || facet.count >= 2)
    .slice(0, 14);

  return (
    <section className="investigatorExplorer" aria-label="Explorer investigador">
      <div className="investigatorHeader">
        <div>
          <div className="panelKicker">
            <FileSearch size={16} aria-hidden />
            Modo investigador
          </div>
          <h1>Scanner de expedientes</h1>
        </div>
        <div className="scannerStats" aria-label="Resultados">
          <span>{explorer.stats.shownRows} visibles</span>
          <strong>{explorer.stats.filteredCases}</strong>
          <span>filtrados</span>
        </div>
      </div>

      <div className="investigatorControls">
        <label className="scannerSearch">
          <Search size={17} aria-hidden />
          <input
            aria-label="Buscar proveedor, organismo, fuente o receipt"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Proveedor, organismo, fuente, receipt o senal"
          />
        </label>

        <div className="scannerSegment" aria-label="Pais">
          {countryOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={country === option.value ? "active" : ""}
              onClick={() => setCountry(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="scannerSegment wide" aria-label="Geometria">
          {geometryOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={geometry === option.value ? "active" : ""}
              onClick={() => setGeometry(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="signalSelect">
          <SlidersHorizontal size={15} aria-hidden />
          <select
            aria-label="Filtrar por senal"
            value={signalCode}
            onChange={(event) => setSignalCode(event.target.value)}
          >
            <option value="all">Todas las senales</option>
            {signalOptions.map((facet) => (
              <option key={facet.key} value={facet.key}>
                {facet.label} ({facet.count})
              </option>
            ))}
          </select>
        </label>
      </div>

      {explorer.activeEntity && (
        <div className="activePivot">
          <span>{labelEntityType(explorer.activeEntity.type)}</span>
          <strong>{explorer.activeEntity.label}</strong>
          <button type="button" onClick={() => setEntity(null)} aria-label="Limpiar pivot">
            <X size={15} aria-hidden />
          </button>
        </div>
      )}

      <div className="pivotRail" aria-label="Pivots de investigacion">
        {pivotFacets.map((facet) => (
          <PivotButton
            key={`${facet.type}:${facet.key}`}
            facet={facet}
            active={entity?.type === facet.type && entity.key === facet.key}
            onClick={() => setEntity({ type: facet.type, key: facet.key })}
          />
        ))}
      </div>

      <div className="scannerRows" role="list" aria-label="Expedientes">
        {explorer.rows.map((row) => (
          <button
            key={row.caseId}
            type="button"
            role="listitem"
            className={selectedCaseId === row.caseId ? "scannerRow active" : "scannerRow"}
            onClick={() => onSelectCase(row.caseId, row.countryCode)}
          >
            <span className="scannerCountry">{row.countryCode}</span>
            <span className="scannerMain">
              <strong>{row.title}</strong>
              <span>{row.agencyName}</span>
            </span>
            <span className="scannerEntity">{row.supplierLabel}</span>
            <span className="scannerSignal">{row.primarySignal?.label ?? "Contexto"}</span>
            <span className="scannerAmount">{row.amountLabel}</span>
            <span className="scannerReceipt">
              {row.hasOfficialGeometry ? <MapPin size={13} aria-hidden /> : null}
              {row.locatorLabel}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function PivotButton({
  facet,
  active,
  onClick,
}: {
  facet: InvestigatorFacet;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = entityIcons[facet.type];
  return (
    <button
      type="button"
      className={active ? "pivotChip active" : "pivotChip"}
      onClick={onClick}
    >
      <Icon size={14} aria-hidden />
      <span>{labelEntityType(facet.type)}</span>
      <strong>{facet.label}</strong>
      <em>{facet.count}</em>
    </button>
  );
}

function labelEntityType(type: InvestigatorEntityType): string {
  if (type === "supplier") return "Proveedor";
  if (type === "agency") return "Organismo";
  if (type === "source") return "Fuente";
  return "Senal";
}
