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
      <h1 className={styles.welcomeHeadline}>
        Un observatorio de obras públicas en Argentina, Chile y Perú.
      </h1>
      <button type="button" className={styles.welcomeCTA} onClick={onCTA}>
        Ver el mapa
        <ArrowRight size={17} aria-hidden />
      </button>
    </div>
  );
}
