import { BadgeCheck, ExternalLink, Globe2, Newspaper, RadioTower } from "lucide-react";

import type { ArticleCitation, ArticleCitationIconName } from "@/lib/data/articleCitations";

export function ContextualCitationsPanel({
  citations,
  compact = false,
}: {
  citations: ArticleCitation[];
  compact?: boolean;
}) {
  if (citations.length === 0) return null;

  return (
    <section className={compact ? "contextCitations compact" : "contextCitations"}>
      <div className="contextCitationsHead">
        <div>
          <span>Fuente externa</span>
          <h2>Contexto periodístico verificado</h2>
        </div>
        <Newspaper size={17} aria-hidden />
      </div>
      <p className="contextCitationsCaveat">
        Referencia externa; no reemplaza la fuente oficial ni prueba pagos, avance físico o responsabilidad.
      </p>
      <div className="contextCitationList">
        {citations.map((citation) => (
          <article key={citation.citationId} className="contextCitationItem">
            <span className="contextCitationBadge" aria-hidden>
              {renderCitationIcon(citation.ui.iconName)}
            </span>
            <div className="contextCitationBody">
              <div className="contextCitationMeta">
                <strong>{citation.publisherShortName ?? citation.publisher}</strong>
                <span className="contextCitationSourceCode">{citation.ui.publisherBadge}</span>
                <span className="contextCitationScope">{citation.ui.scopeLabel}</span>
                <span>{formatDate(citation.publishedAt)}</span>
              </div>
              <p>
                <span>Resumen de cobertura:</span> {citation.claimSummaries[0]?.summary ?? citation.title}
              </p>
              {!compact && citation.matchBasis[0] && (
                <p className="contextCitationMatch">
                  Relación revisada: {labelMatchField(citation.matchBasis[0].field)}
                </p>
              )}
              <a href={citation.url} target="_blank" rel="noreferrer">
                <ExternalLink size={14} aria-hidden />
                Abrir artículo
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function renderCitationIcon(iconName: ArticleCitationIconName) {
  if (iconName === "badge-check") return <BadgeCheck size={15} />;
  if (iconName === "globe") return <Globe2 size={15} />;
  if (iconName === "radio-tower") return <RadioTower size={15} />;
  return <Newspaper size={15} />;
}

function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function labelMatchField(field: ArticleCitation["matchBasis"][number]["field"]): string {
  if (field === "procedureNumber") return "causa o procedimiento";
  if (field === "courtCaseNumber") return "causa judicial";
  if (field === "supplierDocument") return "documento fiscal";
  if (field === "workNumber") return "obra o contrato";
  if (field === "caseId") return "expediente Faro";
  if (field === "supplierName") return "proveedor";
  return "organismo";
}
