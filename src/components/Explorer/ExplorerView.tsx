"use client";

import { PanelLeftClose } from "lucide-react";

import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CountryCode } from "@/lib/data/countries";
import FaroMark from "../FaroMark";
import styles from "./Explorer.module.css";

interface Props {
  cases: ExplorerCase[];
  selectedCountry: CountryCode;
  onSelectCountry: (code: CountryCode) => void;
  selectedCaseId: string | null;
  onSelectCase: (caseId: string, countryCode: CountryCode) => void;
}

export default function ExplorerView(_props: Props) {
  return (
    <section className={styles.shell} aria-label="Explorer">
      <aside className={styles.sidebar} aria-label="Filtros y guardados">
        <header className={styles.sidebarBrand}>
          <FaroMark compact />
          <button type="button" className={styles.sidebarCollapse} aria-label="Colapsar">
            <PanelLeftClose size={16} aria-hidden />
          </button>
        </header>
      </aside>
      <main className={styles.main}>
        <div className={styles.placeholder}>Explorer</div>
      </main>
    </section>
  );
}
