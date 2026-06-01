"use client";

import { ArrowRight } from "lucide-react";
import styles from "./RegionalMap.module.css";

interface Props {
  dismissed: boolean;
  onCTA: () => void;
}

export default function WelcomeOverlay({ dismissed, onCTA }: Props) {
  if (dismissed) return null;
  return (
    <div className={styles.welcomeOverlay} aria-hidden="false">
      <p className={styles.welcomeKicker}>Faro</p>
      <h1 className={styles.welcomeHeadline}>
        Evidencia pública para investigar obra pública en Argentina.
      </h1>
      <button type="button" className={styles.welcomeCTA} onClick={onCTA}>
        <span className={styles.welcomeCTASource} aria-hidden>
          <img src="/brand/faro-mark-transparent.svg" alt="" width={56} height={56} decoding="async" />
        </span>
        <span className={styles.welcomeCTALabel}>Ver el mapa</span>
        <span className={styles.welcomeCTAArrow} aria-hidden>
          <ArrowRight size={18} strokeWidth={1.9} />
        </span>
      </button>
    </div>
  );
}
