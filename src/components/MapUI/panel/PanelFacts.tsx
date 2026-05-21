"use client";

import type { ReactNode } from "react";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { ArgentinaContractCaseFile } from "@/lib/data/argentinaContractCases";
import { resolveCaseYear } from "@/lib/data/caseYear";
import { formatAmountUsdFirst, type AmountInput } from "@/lib/format/money";
import styles from "../casePanel.module.css";

interface Props {
  caseFile: ExplorerCase;
}

function isArgentinaContractCase(caseFile: ExplorerCase): caseFile is ArgentinaContractCaseFile {
  return "caseType" in caseFile && caseFile.caseType === "procurement_contract";
}

function formatSupplier(caseFile: ExplorerCase): string {
  if (isArgentinaContractCase(caseFile)) {
    return caseFile.supplierName ?? caseFile.supplierDocument ?? "Sin dato";
  }
  return "Sin dato";
}

function renderAmount(amount: AmountInput | null): ReactNode {
  if (!amount) return "Sin dato";
  const formatted = formatAmountUsdFirst(amount);
  return (
    <>
      <span>{formatted.primary}</span>
      {formatted.usdSegment && <span className={styles.factSub}>{formatted.usdSegment}</span>}
    </>
  );
}

export default function PanelFacts({ caseFile }: Props) {
  const amount = isArgentinaContractCase(caseFile) ? (caseFile.amount as AmountInput | null) : null;
  return (
    <div className={styles.facts}>
      <Fact label="Monto">{renderAmount(amount)}</Fact>
      <Fact label="Año">{resolveCaseYear(caseFile) ?? "Sin dato"}</Fact>
      <Fact label="Organismo">{caseFile.agencyName ?? "Sin dato"}</Fact>
      <Fact label="Proveedor">{formatSupplier(caseFile)}</Fact>
      <Fact label="Territorio">{renderTerritory(caseFile)}</Fact>
    </div>
  );
}

function renderTerritory(caseFile: ExplorerCase): ReactNode {
  if (!isArgentinaContractCase(caseFile)) return "Sin dato";

  const mapEvidence = caseFile.geoEvidence?.find((evidence) =>
    evidence.exposeOnMap && evidence.coordinates,
  );
  if (mapEvidence?.precision === "official_admin_centroid") {
    return (
      <>
        <span>{caseFile.locationName ?? mapEvidence.label}</span>
        <span className={styles.factSub}>
          {mapEvidence.granularity === "commune"
            ? "Referencia comunal, no sitio exacto"
            : "Referencia administrativa, no sitio exacto"}
        </span>
      </>
    );
  }

  return caseFile.locationName ?? (caseFile.coordinates ? "Coordenada oficial" : "Sin dato");
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.fact}>
      <span className={styles.factLabel}>{label}</span>
      <strong className={styles.factValue}>{children}</strong>
    </div>
  );
}
