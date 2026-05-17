"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import styles from "./RegionalMap.module.css";

interface Props {
  onOpenMenu: () => void;
}

export default function MobileHeader({ onOpenMenu }: Props) {
  return (
    <header className={styles.mobileHeader}>
      <Link href="/" className={styles.mobileBrand} aria-label="Volver a la home de Faro">
        <span className={styles.mobileBrandIcon} aria-hidden>
          <img src="/brand/faro-mark.png" alt="" width={32} height={32} decoding="async" />
        </span>
        <span className={styles.mobileBrandText}>Faro</span>
      </Link>
      <button
        type="button"
        className={styles.mobileMenuButton}
        onClick={onOpenMenu}
        aria-label="Abrir menú"
      >
        <Menu size={20} aria-hidden />
      </button>
    </header>
  );
}
