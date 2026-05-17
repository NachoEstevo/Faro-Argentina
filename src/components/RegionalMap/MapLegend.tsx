import styles from "./RegionalMap.module.css";

interface Props {
  highCount: number;
  mediumCount: number;
  totalCount: number;
}

export default function MapLegend({ highCount, mediumCount, totalCount }: Props) {
  const normalCount = Math.max(0, totalCount - highCount - mediumCount);
  return (
    <aside className={styles.mapLegend} aria-label="Leyenda del mapa">
      <p className={styles.mapLegendTitle}>Referencias</p>
      <ul className={styles.mapLegendList}>
        <li>
          <span
            className={`${styles.mapLegendDot} ${styles.mapLegendDotHigh}`}
            aria-hidden
          />
          <span>
            <strong>Revisar con prioridad</strong>
            <em>{highCount}</em>
          </span>
        </li>
        <li>
          <span
            className={`${styles.mapLegendDot} ${styles.mapLegendDotMedium}`}
            aria-hidden
          />
          <span>
            <strong>Posibles señales</strong>
            <em>{mediumCount}</em>
          </span>
        </li>
        <li>
          <span
            className={`${styles.mapLegendDot} ${styles.mapLegendDotNormal}`}
            aria-hidden
          />
          <span>
            <strong>Sin alertas</strong>
            <em>{normalCount}</em>
          </span>
        </li>
      </ul>
    </aside>
  );
}
