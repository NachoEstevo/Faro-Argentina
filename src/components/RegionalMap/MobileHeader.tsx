"use client";

import Link from "next/link";
import { ArrowLeft, Menu } from "lucide-react";
import styles from "./RegionalMap.module.css";

interface Props {
  onOpenMenu: () => void;
  backToMap?: boolean;
  onBackToMap?: () => void;
}

export default function MobileHeader({ onOpenMenu, backToMap = false, onBackToMap }: Props) {
  const handlePrimaryAction = backToMap && onBackToMap ? onBackToMap : onOpenMenu;

  return (
    <header className={styles.mobileHeader}>
      <button
        type="button"
        className={styles.mobileMenuButton}
        onClick={handlePrimaryAction}
        aria-label={backToMap ? "Volver al mapa" : "Abrir menú"}
        title={backToMap ? "Volver al mapa" : "Abrir menú"}
      >
        {backToMap ? <ArrowLeft size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
      </button>
      {!backToMap && (
        <Link href="/" className={styles.mobileBrand} aria-label="Volver a la home de Faro">
          <span className={styles.mobileBrandIcon} aria-hidden>
            <img src="/brand/faro-mark.png" alt="" width={32} height={32} decoding="async" />
          </span>
          <span className={styles.mobileBrandText}>Faro</span>
        </Link>
      )}
    </header>
  );
}
