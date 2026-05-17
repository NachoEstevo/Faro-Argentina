"use client";

import { Download, ExternalLink, Route } from "lucide-react";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CaseSignalContext } from "@/lib/data/caseSignals";
import { buildExpediente, type ExpedienteCaseFile } from "@/lib/data/expediente";
import styles from "../casePanel.module.css";

interface Props {
  caseFile: ExplorerCase;
  signalContext?: CaseSignalContext;
  traceMode: boolean;
  onTraceModeChange: (next: boolean) => void;
}

export default function PanelActions({ caseFile, signalContext, traceMode, onTraceModeChange }: Props) {
  const expediente = buildExpediente(caseFile as ExpedienteCaseFile, signalContext);
  const { hasOfficialGeometry } = expediente.investigationContext;
  const encodedId = encodeURIComponent(caseFile.id);
  return (
    <div className={styles.actions}>
      <div className={styles.actionRow}>
        <a
          href={caseFile.receipt.sourceUrl}
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
      <button
        type="button"
        className={`${styles.actionButton} ${styles.actionWide} ${traceMode && hasOfficialGeometry ? styles.actionWideActive : ""}`}
        disabled={!hasOfficialGeometry}
        onClick={() => {
          if (hasOfficialGeometry) onTraceModeChange(!traceMode);
        }}
      >
        <Route size={14} aria-hidden /> Rastro visual
      </button>
    </div>
  );
}
