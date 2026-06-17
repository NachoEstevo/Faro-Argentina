import styles from "./RegionalMap.module.css";

interface Props {
  highCount: number;
  mediumCount: number;
  totalCount: number;
}

export default function MapLegend({ highCount, mediumCount, totalCount }: Props) {
  const normalCount = Math.max(0, totalCount - highCount - mediumCount);
  return (
    <aside className={styles.mapLegend} aria-label="Leyenda del mapa" data-tour="legend">
      <p className={styles.mapLegendTitle}>Referencias</p>
      <ul className={styles.mapLegendList}>
        <li>
          <span
            className={`${styles.mapLegendDot} ${styles.mapLegendDotHigh}`}
            aria-hidden
          />
          <span>
            <strong>Prioridad de revisión</strong>
            <em>{highCount}</em>
          </span>
        </li>
        <li>
          <span
            className={`${styles.mapLegendDot} ${styles.mapLegendDotMedium}`}
            aria-hidden
          />
          <span>
            <strong>Con señal</strong>
            <em>{mediumCount}</em>
          </span>
        </li>
        <li>
          <span
            className={`${styles.mapLegendDot} ${styles.mapLegendDotNormal}`}
            aria-hidden
          />
          <span>
            <strong>Sin señal</strong>
            <em>{normalCount}</em>
          </span>
        </li>
      </ul>
    </aside>
  );
}
