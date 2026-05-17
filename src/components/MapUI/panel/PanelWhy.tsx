"use client";

import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CaseSignalContext } from "@/lib/data/caseSignals";
import { buildExpediente, type ExpedienteCaseFile } from "@/lib/data/expediente";
import styles from "../casePanel.module.css";

interface Props {
  caseFile: ExplorerCase;
  signalContext?: CaseSignalContext;
}

export default function PanelWhy({ caseFile, signalContext }: Props) {
  const expediente = buildExpediente(caseFile as ExpedienteCaseFile, signalContext);
  return (
    <section className={styles.section}>
      <p className={styles.sectionKicker}>Por qué apareció</p>
      <p className={styles.body}>{expediente.summary.plainSummary}</p>
    </section>
  );
}
