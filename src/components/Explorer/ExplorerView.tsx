"use client";

import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CountryCode } from "@/lib/data/countries";
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
      <div className={styles.placeholder}>Explorer</div>
    </section>
  );
}
