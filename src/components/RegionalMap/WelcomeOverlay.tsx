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
      <p className={styles.welcomeKicker}>Evidencia oficial de obra pública</p>
      <h1 className={styles.welcomeHeadline}>Faro</h1>
      <p className={styles.welcomeCopy}>
        Mapa, contratos y expedientes públicos para ver qué existe, dónde mirar y qué falta verificar.
      </p>
      <Link className={styles.welcomeCTA} href={ctaHref} onClick={onCTA}>
        <span className={styles.welcomeCTALabel}>Entrar al mapa</span>
        <span className={styles.welcomeCTAArrow} aria-hidden>
          <ArrowRight size={18} strokeWidth={1.9} />
        </span>
      </Link>
    </div>
  );
}
