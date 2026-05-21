import Link from "next/link";
import { FileSearch, FolderOpen, Map as MapIcon } from "lucide-react";
import styles from "./RegionalMap.module.css";

export default function FloatingModeToggle() {
  return (
    <div className={styles.floatingToggle} role="group" aria-label="Modo de exploración">
      <button
        type="button"
        className={`${styles.floatingToggleButton} ${styles.active}`}
        aria-pressed="true"
      >
        <MapIcon size={13} aria-hidden />
        Mapa
      </button>
      <Link
        href="/pais/AR?mode=explorer"
        className={styles.floatingToggleButton}
        aria-label="Abrir explorador de expedientes"
      >
        <FileSearch size={13} aria-hidden />
        Explorar
      </Link>
      <Link
        href="/pais/AR?mode=investigations"
        className={styles.floatingToggleButton}
        aria-label="Abrir mis carpetas"
      >
        <FolderOpen size={13} aria-hidden />
        Mis carpetas
      </Link>
    </div>
  );
}
