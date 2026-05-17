"use client";

import { ShieldCheck, X } from "lucide-react";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CaseSignalContext } from "@/lib/data/caseSignals";
import { CaseSignalChips } from "@/components/CaseSignals";
import styles from "../casePanel.module.css";

interface Props {
  caseFile: ExplorerCase;
  signalContext?: CaseSignalContext;
  onClose: () => void;
}

export default function PanelHero({ caseFile, signalContext, onClose }: Props) {
  return (
    <header className={styles.hero}>
      <button
        type="button"
        className={styles.close}
        onClick={onClose}
        aria-label="Cerrar panel"
        title="Cerrar"
      >
        <X size={14} aria-hidden />
      </button>
      <p className={styles.kicker}>
        <ShieldCheck size={12} aria-hidden /> Expediente verificable
      </p>
      <h1 className={styles.title}>{caseFile.title}</h1>
      <div className={styles.chips}>
        <CaseSignalChips caseFile={caseFile} limit={3} signalContext={signalContext} />
      </div>
    </header>
  );
}
