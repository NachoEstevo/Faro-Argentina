import Link from "next/link";
import { FileSearch, FolderOpen, Map as MapIcon, MessageSquarePlus } from "lucide-react";
import styles from "./RegionalMap.module.css";

export default function FloatingModeToggle() {
  return (
    <>
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
          aria-label="Abrir carpetas"
        >
          <FolderOpen size={13} aria-hidden />
          Carpetas
        </Link>
      </div>
      <Link
        href="/pais/AR?mode=aportes"
        className={styles.floatingActionButton}
        aria-label="Enviar aporte a revisión"
      >
        <MessageSquarePlus size={13} aria-hidden />
        Aportar
      </Link>
    </>
  );
}
