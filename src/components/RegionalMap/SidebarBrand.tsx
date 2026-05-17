import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import styles from "./RegionalMap.module.css";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  toggleVariant?: "collapse" | "close";
}

export default function SidebarBrand({ collapsed, onToggle, toggleVariant = "collapse" }: Props) {
  const isClose = toggleVariant === "close";
  return (
    <div className={styles.brand}>
      <Link href="/" className={styles.brandLink} aria-label="Volver a la home de Faro">
        <span className={styles.brandIcon} aria-hidden>
          <img src="/brand/faro-mark.png" alt="" width={44} height={44} decoding="async" />
        </span>
        <span className={styles.brandText}>
          <span className={styles.brandWordmark}>Faro</span>
          <span className={styles.brandTagline}>No acusa. Ilumina.</span>
        </span>
      </Link>
      <button
        type="button"
        className={styles.collapseToggle}
        onClick={onToggle}
        aria-label={
          isClose
            ? "Cerrar menú"
            : collapsed
              ? "Expandir panel lateral"
              : "Contraer panel lateral"
        }
        aria-pressed={!isClose ? collapsed : undefined}
      >
        {isClose ? (
          <X size={18} aria-hidden />
        ) : collapsed ? (
          <PanelLeftOpen size={16} aria-hidden />
        ) : (
          <PanelLeftClose size={16} aria-hidden />
        )}
      </button>
    </div>
  );
}
