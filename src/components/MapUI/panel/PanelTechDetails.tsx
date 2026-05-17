"use client";

import { ChevronRight, ExternalLink } from "lucide-react";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CaseSignalContext } from "@/lib/data/caseSignals";
import type { CrossCountryCaseFile } from "@/lib/data/crossCountryCases";
import { buildExpediente, type ExpedienteCaseFile } from "@/lib/data/expediente";
import { CaseSignalPanel } from "@/components/CaseSignals";
import styles from "../casePanel.module.css";

interface Props {
  caseFile: ExplorerCase;
  signalContext?: CaseSignalContext;
}

function isCrossCountryCase(caseFile: ExplorerCase): caseFile is CrossCountryCaseFile {
  return "caseType" in caseFile;
}

function shortSource(sourceId: string): string {
  if (sourceId.includes("ACTAS")) return "Actas";
  if (sourceId.includes("CONTRATOS")) return "Contratos";
  if (sourceId.includes("OFERTAS")) return "Ofertas";
  if (sourceId.includes("PROCEDIMIENTOS")) return "Procedimiento";
  if (sourceId.includes("UBICACION")) return "Ubicacion";
  if (sourceId.includes("SIPRO")) return "SIPRO";
  if (sourceId.includes("OCDS")) return "OCDS";
  if (sourceId.includes("GASTO")) return "Presupuesto";
  if (sourceId.includes("MERCADO")) return "Adjudicaciones";
  return "Fuente";
}

export default function PanelTechDetails({ caseFile, signalContext }: Props) {
  const expediente = buildExpediente(caseFile as ExpedienteCaseFile, signalContext);
  const relatedReceipts = isCrossCountryCase(caseFile) ? caseFile.relatedReceipts ?? [] : [];
  return (
    <details className={styles.accordion}>
      <summary className={styles.accordionSummary}>
        <ChevronRight size={14} aria-hidden className={styles.accordionChevron} />
        Detalles técnicos
      </summary>
      <div className={styles.accordionBody}>
        <CaseSignalPanel caseFile={caseFile} signalContext={signalContext} />
        <dl className={styles.receiptList}>
          <ReceiptRow label="Fuente" value={caseFile.receipt.sourceName} />
          <ReceiptRow label="Locator" value={expediente.officialTrail.primary.locator.label} />
          <ReceiptRow label="Nota" value={expediente.officialTrail.primary.locator.note} />
          <ReceiptRow label="Hash" value={`${caseFile.receipt.fileHash.slice(0, 24)}...`} />
          <ReceiptRow label="Raw path" value={caseFile.receipt.rawPath} />
          <ReceiptRow
            label="Extraido"
            value={new Date(caseFile.receipt.extractedAt).toLocaleString("es-AR")}
          />
        </dl>
        {relatedReceipts.length > 0 && (
          <div className={styles.relatedReceipts}>
            <span className={styles.sectionKicker}>Evidencia cruzada</span>
            <div className={styles.relatedReceiptLinks}>
              {relatedReceipts.slice(0, 6).map((receipt) => (
                <a
                  key={receipt.receiptId}
                  href={receipt.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.relatedReceiptLink}
                >
                  <ExternalLink size={11} aria-hidden /> {shortSource(receipt.sourceId)}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.receiptRow}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
