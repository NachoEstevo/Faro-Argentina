"use client";

import type { ReactNode } from "react";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { CrossCountryCaseFile } from "@/lib/data/crossCountryCases";
import { formatAmountWithUsd, type AmountInput } from "@/lib/format/money";
import styles from "../casePanel.module.css";

interface Props {
  caseFile: ExplorerCase;
}

function isCrossCountryCase(caseFile: ExplorerCase): caseFile is CrossCountryCaseFile {
  return "caseType" in caseFile;
}

function formatSupplier(caseFile: ExplorerCase): string {
  if (isCrossCountryCase(caseFile)) {
    return caseFile.supplierName ?? caseFile.supplierDocument ?? "Sin dato";
  }
  return "Sin dato";
}

function resolveYear(caseFile: ExplorerCase): string {
  if (caseFile.year) return String(caseFile.year);
  if (isCrossCountryCase(caseFile)) {
    const awarded = caseFile.awardedAt?.slice(0, 4);
    if (awarded && /^\d{4}$/.test(awarded)) return awarded;
    const published = caseFile.publishedAt?.slice(0, 4);
    if (published && /^\d{4}$/.test(published)) return published;
  }
  return "Sin dato";
}

function renderAmount(amount: AmountInput | null): ReactNode {
  if (!amount) return "Sin dato";
  const formatted = formatAmountWithUsd(amount);
  return (
    <>
      <span>{formatted.primary}</span>
      {formatted.usdSegment && <span className={styles.factSub}>{formatted.usdSegment}</span>}
    </>
  );
}

export default function PanelFacts({ caseFile }: Props) {
  const amount = isCrossCountryCase(caseFile) ? (caseFile.amount as AmountInput | null) : null;
  return (
    <div className={styles.facts}>
      <Fact label="Monto">{renderAmount(amount)}</Fact>
      <Fact label="Año">{resolveYear(caseFile)}</Fact>
      <Fact label="Organismo">{caseFile.agencyName ?? "Sin dato"}</Fact>
      <Fact label="Proveedor">{formatSupplier(caseFile)}</Fact>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.fact}>
      <span className={styles.factLabel}>{label}</span>
      <strong className={styles.factValue}>{children}</strong>
    </div>
  );
}
