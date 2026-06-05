import { ExternalLink } from "lucide-react";

import type { CaseReportView } from "@/lib/data/caseReport";
import type { EvidenceClaim, EvidenceClaimCode, EvidenceClaimStatus } from "@/lib/data/evidenceClaimMatrix";
import ReportPrintButton from "./ReportPrintButton";
import styles from "./PrintableCaseReport.module.css";

export default function PrintableCaseReport({ report }: { report: CaseReportView }) {
  return (
    <main className={styles.page}>
      <div className={styles.toolbar}>
        <a href="/" className={styles.brand}>Faro</a>
        <div className={styles.toolbarActions}>
          <a href={report.actions.evidenceJsonHref} className={styles.secondaryAction}>
            JSON técnico
          </a>
          <ReportPrintButton className={styles.primaryAction} />
        </div>
      </div>

      <article className={styles.sheet}>
        <header className={styles.header}>
          <p className={styles.kicker}>Informe de expediente</p>
          <h1>{report.summary.title}</h1>
          <p className={styles.subtitle}>
            {report.summary.countryLabel} · {report.summary.caseTypeLabel} · {report.summary.caseId}
          </p>
          <p className={styles.disclaimer}>
            Faro no acusa. Este informe muestra dónde mirar, qué fuente oficial existe y qué falta verificar.
          </p>
        </header>

        <section className={styles.section}>
          <h2>Qué estás mirando</h2>
          <p>{report.summary.plainLanguage}</p>
          <div className={styles.factGrid}>
            {report.keyFacts.map((fact) => (
              <div key={fact.label} className={styles.fact}>
                <span>{fact.label}</span>
                <strong>{fact.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <ReportClaimMatrix claims={report.claimMatrix.claims} />

        <section className={styles.section}>
          <h2>Por qué aparece en Faro</h2>
          {report.whyItAppeared.length > 0 ? (
            <div className={styles.signalList}>
              {report.whyItAppeared.map((signal) => (
                <article key={signal.label} className={styles.signal}>
                  <h3>{signal.label}</h3>
                  <p>{signal.summary}</p>
                  <dl>
                    <div>
                      <dt>Evidencia</dt>
                      <dd>{signal.evidence}</dd>
                    </div>
                    <div>
                      <dt>Límite</dt>
                      <dd>{signal.caveat}</dd>
                    </div>
                    <div>
                      <dt>Siguiente paso</dt>
                      <dd>{signal.action}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <p>El caso no tiene una señal prioritaria. Se mantiene visible por su rastro oficial.</p>
          )}
        </section>

        <section className={styles.section}>
          <h2>Rastro oficial</h2>
          <p>{report.officialTrail.description}</p>
          <div className={styles.officialBox}>
            <strong>{report.officialTrail.primary.sourceName}</strong>
            <span>{report.officialTrail.primary.locatorLabel}: {report.officialTrail.primary.locatorNote}</span>
            <span>Registro: {report.officialTrail.primary.recordId}</span>
            <a href={report.officialTrail.primary.sourceUrl} target="_blank" rel="noreferrer">
              Abrir fuente oficial <ExternalLink size={13} aria-hidden />
            </a>
          </div>
          {report.officialTrail.relatedReceipts.length > 0 && (
            <ul className={styles.receiptList}>
              {report.officialTrail.relatedReceipts.slice(0, 8).map((receipt) => (
                <li key={receipt.receiptId}>
                  {receipt.sourceName} · {receipt.recordId}
                </li>
              ))}
            </ul>
          )}
        </section>

        {report.journalismContext.length > 0 && (
          <section className={styles.section}>
            <h2>Contexto periodístico</h2>
            <p className={styles.sectionNote}>
              Estas notas ayudan a entender el contexto. No reemplazan la fuente oficial.
            </p>
            <div className={styles.citationList}>
              {report.journalismContext.slice(0, 4).map((citation) => (
                <article key={citation.url} className={styles.citation}>
                  <span>{citation.roleLabel}</span>
                  <h3>{citation.title}</h3>
                  <p>{citation.summary}</p>
                  <small>{citation.sourceLabel} · {citation.dateLabel}</small>
                  <em>{citation.caveat}</em>
                </article>
              ))}
            </div>
          </section>
        )}

        {report.curatedEvidence.length > 0 && (
          <section className={styles.section}>
            <h2>Aportes curados</h2>
            <p className={styles.sectionNote}>
              Material aportado y revisado por el equipo. No reemplaza la fuente oficial ni confirma por sí solo la relación investigada.
            </p>
            <div className={styles.curatedList}>
              {report.curatedEvidence.map((evidence) => (
                <article key={evidence.id} className={styles.curatedItem}>
                  <span>{evidence.sourceLabel} · {evidence.promotedAt.slice(0, 10)}</span>
                  <h3>{evidence.title}</h3>
                  <p>{evidence.caption}</p>
                  <dl>
                    <div>
                      <dt>Límite</dt>
                      <dd>{evidence.caveat}</dd>
                    </div>
                    <div>
                      <dt>Permiso o fuente</dt>
                      <dd>{evidence.permissionNote}</dd>
                    </div>
                    <div>
                      <dt>Revisión</dt>
                      <dd>{evidence.reviewedByName}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className={styles.section}>
          <h2>Qué verificar después</h2>
          <ol className={styles.nextList}>
            {report.nextVerification.slice(0, 5).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        {report.caveats.length > 0 && (
          <section className={styles.section}>
            <h2>Aclaraciones</h2>
            <ul className={styles.caveatList}>
              {report.caveats.slice(0, 8).map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ul>
          </section>
        )}

        <section className={`${styles.section} ${styles.appendix}`}>
          <h2>Anexo técnico</h2>
          <p>
            Esta parte sirve para reproducir la evidencia. Si solo querés entender el caso,
            podés compartir las secciones anteriores.
          </p>
          {report.technicalAppendix.receipts.map((receipt) => (
            <dl key={receipt.receiptId} className={styles.techGrid}>
              <div>
                <dt>Receipt</dt>
                <dd>{receipt.receiptId}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{receipt.sourceId}</dd>
              </div>
              <div>
                <dt>Raw path</dt>
                <dd>{receipt.rawPath}</dd>
              </div>
              <div>
                <dt>Snapshot</dt>
                <dd>{receipt.snapshotHash}</dd>
              </div>
              <div>
                <dt>Row hash</dt>
                <dd>{receipt.rowHash}</dd>
              </div>
              <div>
                <dt>Parser</dt>
                <dd>{receipt.parserVersion}</dd>
              </div>
            </dl>
          ))}
        </section>
      </article>
    </main>
  );
}

const REPORT_CLAIM_LIMIT = 4;
const REPORT_CLAIM_PRIORITY: EvidenceClaimCode[] = [
  "provider_payment",
  "official_record",
  "declared_amount",
  "official_budget",
  "supplier_identity",
  "competition",
  "official_location",
  "declared_progress",
  "budget_execution",
  "judicial_context",
];

function ReportClaimMatrix({ claims }: { claims: EvidenceClaim[] }) {
  return (
    <section className={styles.section}>
      <h2>Qué prueba / qué falta</h2>
      <p className={styles.sectionNote}>
        Separación operativa entre evidencia directa, datos parciales y afirmaciones que este informe no sostiene todavía.
      </p>
      <div className={styles.claimMatrix}>
        <ReportClaimColumn
          title="Puede sostener"
          status="supported"
          claims={selectReportClaims(claims, "supported")}
          emptyText="Sin afirmaciones fuertes con soporte directo."
        />
        <ReportClaimColumn
          title="Parcial / revisar"
          status="partial"
          claims={selectReportClaims(claims, "partial")}
          emptyText="Sin pistas parciales relevantes."
        />
        <ReportClaimColumn
          title="No afirmar todavía"
          status="not_supported"
          claims={selectReportClaims(claims, "not_supported")}
          emptyText="Sin faltantes críticos detectados."
        />
      </div>
    </section>
  );
}

function ReportClaimColumn({
  title,
  status,
  claims,
  emptyText,
}: {
  title: string;
  status: EvidenceClaimStatus;
  claims: EvidenceClaim[];
  emptyText: string;
}) {
  const toneClass =
    status === "supported"
      ? styles.claimToneSupported
      : status === "partial"
        ? styles.claimTonePartial
        : styles.claimToneMissing;
  return (
    <article className={`${styles.claimColumn} ${toneClass}`}>
      <h3>{title}</h3>
      {claims.length > 0 ? (
        <ul>
          {claims.map((claim) => (
            <li key={claim.code}>
              <strong>{formatReportClaimTitle(claim)}</strong>
              <span>{claim.status === "not_supported" ? claim.caveat : claim.evidence}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p>{emptyText}</p>
      )}
    </article>
  );
}

function selectReportClaims(
  claims: EvidenceClaim[],
  status: EvidenceClaimStatus,
): EvidenceClaim[] {
  return claims
    .filter((claim) => claim.status === status)
    .sort((left, right) => reportClaimPriority(left.code) - reportClaimPriority(right.code))
    .slice(0, REPORT_CLAIM_LIMIT);
}

function reportClaimPriority(code: EvidenceClaimCode): number {
  const index = REPORT_CLAIM_PRIORITY.indexOf(code);
  return index === -1 ? REPORT_CLAIM_PRIORITY.length : index;
}

function formatReportClaimTitle(claim: EvidenceClaim): string {
  if (claim.code === "provider_payment" && claim.status === "not_supported") {
    return "No hay pago a proveedor soportado";
  }
  return claim.label;
}
