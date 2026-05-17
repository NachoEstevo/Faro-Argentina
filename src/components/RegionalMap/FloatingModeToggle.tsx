import Link from "next/link";
import { Map as MapIcon, Table2 } from "lucide-react";
import styles from "./RegionalMap.module.css";

export default function FloatingModeToggle() {
  return (
    <div className={styles.floatingToggle} role="group" aria-label="Modo de exploración">
      <button
        type="button"
        className={`${styles.floatingToggleButton} ${styles.active}`}
        aria-pressed="true"
      >
        <MapIcon size={13} aria-hidden className={styles.floatingToggleIcon} />
        Mapa
      </button>
      <Link
        href="/pais/AR?mode=explorer"
        className={styles.floatingToggleButton}
        aria-label="Abrir modo Explorer"
      >
        <Table2 size={13} aria-hidden className={styles.floatingToggleIcon} />
        Explorer
      </Link>
    </div>
  );
}
