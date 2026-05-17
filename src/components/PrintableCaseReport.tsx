import { ExternalLink } from "lucide-react";

import type { CaseReportView } from "@/lib/data/caseReport";
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
