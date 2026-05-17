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
      <p className={styles.mapLegendTitle}>Qué significa cada punto</p>
      <ul className={styles.mapLegendList}>
        <li>
          <span
            className={`${styles.mapLegendDot} ${styles.mapLegendDotHigh}`}
            aria-hidden
          />
          <span>
            <strong>Alerta alta</strong>
            <em>Single bidder, reclamos masivos o concentración fuerte · {highCount}</em>
          </span>
        </li>
        <li>
          <span
            className={`${styles.mapLegendDot} ${styles.mapLegendDotMedium}`}
            aria-hidden
          />
          <span>
            <strong>Alerta media</strong>
            <em>Competencia limitada, sobreprecio o reclamos · {mediumCount}</em>
          </span>
        </li>
        <li>
          <span
            className={`${styles.mapLegendDot} ${styles.mapLegendDotNormal}`}
            aria-hidden
          />
          <span>
            <strong>Obra pública</strong>
            <em>Sin alertas detectadas · {normalCount}</em>
          </span>
        </li>
      </ul>
    </aside>
  );
}
