"use client";

import { ArrowRight, Download, ExternalLink, FileText, MessageSquarePlus } from "lucide-react";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CaseSignalContext } from "@/lib/data/caseSignals";
import { buildExpediente, type ExpedienteCaseFile } from "@/lib/data/expediente";
import styles from "../casePanel.module.css";

interface Props {
  caseFile: ExplorerCase;
  signalContext?: CaseSignalContext;
  onReportCase?: () => void;
}

export default function PanelActions({ caseFile, signalContext, onReportCase }: Props) {
  const expediente = buildExpediente(caseFile as ExpedienteCaseFile, signalContext);
  const encodedId = encodeURIComponent(caseFile.id);
  const explorerCaseHref = `/pais/${caseFile.countryCode}?mode=explorer&case=${encodedId}`;

  return (
    <div className={styles.actions}>
      <div className={styles.actionRow}>
        <a
          href={explorerCaseHref}
          className={`${styles.actionButton} ${styles.actionButtonReport}`}
        >
          <ArrowRight size={14} aria-hidden /> Informe completo
        </a>
        <a href={expediente.actions.reportHref} className={styles.actionButton}>
          <FileText size={14} aria-hidden /> Informe PDF
        </a>
        {onReportCase && (
          <button type="button" className={`${styles.actionButton} ${styles.actionButtonPrimary}`} onClick={onReportCase}>
            <MessageSquarePlus size={14} aria-hidden /> Reportar dato
          </button>
        )}
        <a
          href={expediente.actions.officialSourceHref}
          target="_blank"
          rel="noreferrer"
          className={styles.actionButton}
        >
          <ExternalLink size={14} aria-hidden /> Ver fuente
        </a>
        <a href={`/api/export/${encodedId}`} download className={styles.actionButton}>
          <Download size={14} aria-hidden /> Exportar
        </a>
      </div>
    </div>
  );
}
