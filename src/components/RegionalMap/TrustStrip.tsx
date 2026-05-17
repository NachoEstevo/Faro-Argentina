import { Database, History, ShieldCheck } from "lucide-react";
import styles from "./RegionalMap.module.css";

interface Props {
  totalCases: number;
  lastUpdated: string;
}

export default function TrustStrip({ totalCases, lastUpdated }: Props) {
  return (
    <div className={styles.trustStrip} aria-label="Resumen de la fuente">
      <span className={styles.trustItem}>
        <ShieldCheck size={13} aria-hidden className={styles.trustVerified} />
        <strong>Fuentes oficiales · AR · CL · PE</strong>
      </span>
      <span className={`${styles.trustDivider} ${styles.trustExtras}`} aria-hidden />
      <span className={`${styles.trustItem} ${styles.trustExtras}`}>
        <Database size={12} aria-hidden className={styles.trustMuted} />
        {totalCases.toLocaleString("es-AR")} expedientes
      </span>
      <span className={`${styles.trustDivider} ${styles.trustExtras}`} aria-hidden />
      <span className={`${styles.trustItem} ${styles.trustExtras}`}>
        <History size={12} aria-hidden className={styles.trustMuted} />
        Última actualización: {lastUpdated}
      </span>
    </div>
  );
}
