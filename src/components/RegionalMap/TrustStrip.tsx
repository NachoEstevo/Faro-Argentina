import Link from "next/link";
import { Database, FileSearch, ShieldCheck } from "lucide-react";

import { CURATED_CASES } from "@/data/curatedCases";
import styles from "./RegionalMap.module.css";

interface Props {
  totalCases: number;
}

export default function TrustStrip({ totalCases }: Props) {
  return (
    <div className={styles.trustStrip} aria-label="Resumen de la fuente">
      <span className={styles.trustItem}>
        <ShieldCheck size={13} aria-hidden className={styles.trustVerified} />
        <strong>Fuentes oficiales</strong>
      </span>
      <span className={`${styles.trustDivider} ${styles.trustExtras}`} aria-hidden />
      <span className={`${styles.trustItem} ${styles.trustExtras}`}>
        <Database size={12} aria-hidden className={styles.trustMuted} />
        {totalCases.toLocaleString("es-AR")} expedientes de Argentina
      </span>
      <span className={styles.trustDivider} aria-hidden />
      <Link
        href="/pais/AR?mode=explorer&preset=selected"
        className={styles.trustSelectedLink}
        aria-label={`Abrir ${CURATED_CASES.length.toLocaleString("es-AR")} expedientes seleccionados`}
      >
        <FileSearch size={12} aria-hidden />
        <span className={styles.trustSelectedFull}>Ver seleccionados</span>
        <span className={styles.trustSelectedShort}>Seleccionados</span>
      </Link>
    </div>
  );
}
