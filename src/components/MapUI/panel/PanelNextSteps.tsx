"use client";

import { ChevronRight } from "lucide-react";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CaseSignalContext } from "@/lib/data/caseSignals";
import { buildExpediente, type ExpedienteCaseFile } from "@/lib/data/expediente";
import styles from "../casePanel.module.css";

interface Props {
  caseFile: ExplorerCase;
  signalContext?: CaseSignalContext;
}

export default function PanelNextSteps({ caseFile, signalContext }: Props) {
  const expediente = buildExpediente(caseFile as ExpedienteCaseFile, signalContext);
  if (expediente.nextVerification.length === 0) return null;
  return (
    <details className={styles.accordion}>
      <summary className={styles.accordionSummary}>
        <ChevronRight size={14} aria-hidden className={styles.accordionChevron} />
        Qué verificar después
      </summary>
      <div className={styles.accordionBody}>
        <ol className={styles.nextStepsList}>
          {expediente.nextVerification.slice(0, 5).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </details>
  );
}
