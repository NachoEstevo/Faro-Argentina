"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import styles from "./RegionalMap.module.css";

interface Props {
  dismissed: boolean;
  ctaHref: string;
  onCTA: () => void;
}

export default function WelcomeOverlay({ dismissed, ctaHref, onCTA }: Props) {
  if (dismissed) return null;
  return (
    <div className={styles.welcomeOverlay} aria-hidden="false">
      <p className={styles.welcomeKicker}>Faro</p>
      <h1 className={styles.welcomeHeadline}>
        Evidencia pública para investigar obra pública en Argentina.
      </h1>
      <Link className={styles.welcomeCTA} href={ctaHref} onClick={onCTA}>
        <span className={styles.welcomeCTALabel}>Ver el mapa</span>
        <span className={styles.welcomeCTAArrow} aria-hidden>
          <ArrowRight size={18} strokeWidth={1.9} />
        </span>
      </Link>
    </div>
  );
}
