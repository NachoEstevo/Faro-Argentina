import type { ReactNode } from "react";
import { Download, ExternalLink, FileText, Route, ShieldCheck } from "lucide-react";

import type { CaseDataset } from "@/lib/caseRepository";
import type { ArgentinaWorkCase } from "@/lib/data/argentinaWorks";
import type { CaseSignalContext } from "@/lib/data/caseSignals";
import type { ArgentinaContractCaseFile } from "@/lib/data/argentinaContractCases";
import type { ArgentinaInvestmentMapCaseFile } from "@/lib/data/argentinaInvestmentMap";
import { buildExpediente, type ExpedienteCaseFile } from "@/lib/data/expediente";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import { getPublicOfficialSourceHref } from "@/lib/data/receiptOfficialSource";
import { formatAmountWithUsd, type AmountInput } from "@/lib/format/money";
import { CaseSignalChips, CaseSignalPanel } from "./CaseSignals";
import { ContextualCitationsPanel } from "./ContextualCitations";

export function CaseDetails({
  caseFile,
  dataset,
  signalContext,
  traceMode,
  onTraceModeChange,
}: {
  caseFile: ExplorerCase;
  dataset: CaseDataset;
  signalContext?: CaseSignalContext;
  traceMode: boolean;
  onTraceModeChange: (next: boolean) => void;
}) {
  const isContract = isArgentinaContractCase(caseFile) && caseFile.caseType === "procurement_contract";
  const isInvestmentMap = isArgentinaInvestmentMapCase(caseFile);
  const relatedReceipts = "relatedReceipts" in caseFile ? caseFile.relatedReceipts ?? [] : [];
  const contextualCitations = caseFile.contextualCitations ?? [];
  const expediente = buildExpediente(caseFile as ExpedienteCaseFile, signalContext, contextualCitations);
  const { hasOfficialGeometry } = expediente.investigationContext;
  const encodedCaseId = encodeURIComponent(caseFile.id);
  return (
    <div className="caseDetails">
      <div className="panelKicker">
        <ShieldCheck size={16} aria-hidden />
        Expediente verificable
      </div>
      <h1>{caseFile.title}</h1>
      <CaseSignalChips caseFile={caseFile} limit={4} signalContext={signalContext} />
      <div className="caseMetaGrid">
        <Metric label={caseNumberLabel({ isContract, isInvestmentMap })} value={caseFile.workNumber} />
        <Metric label={isInvestmentMap ? "BAPIN" : "Procedimiento"} value={caseFile.procedureNumber || "Sin dato"} />
        <Metric label="Organismo" value={caseFile.agencyName || "Sin dato"} />
        <Metric
          label={isContract ? "Proveedor" : isInvestmentMap ? "Etapa" : "Plazo"}
          value={isContract ? formatSupplier(caseFile) : isInvestmentMap ? caseFile.projectStage ?? "Sin dato" : formatExecutionTerm(caseFile)}
        />
        {isContract && (
          <>
            <Metric label="Monto" value={renderAmount(caseFile.amount as AmountInput | null)} />
            <Metric label="Oferentes" value={formatBidderCount(caseFile)} />
            <Metric label="Estado" value={caseFile.procedureState ?? "Sin dato"} />
            <Metric label="Ubicacion" value={formatWorkLocation(caseFile)} />
          </>
        )}
        {isInvestmentMap && (
          <>
            <Metric label="Monto" value={renderAmount(caseFile.amount as AmountInput | null)} />
            <Metric label="Avance fisico" value={formatProgress(caseFile.physicalProgress)} />
            <Metric label="Avance financiero" value={formatProgress(caseFile.financialProgress)} />
            <Metric label="Ubicacion" value={formatInvestmentLocation(caseFile)} />
          </>
        )}
      </div>

      <section className="whyBox">
        <h2>Por que aparecio</h2>
        <p>{expediente.summary.plainSummary}</p>
      </section>

      <CaseSignalPanel caseFile={caseFile} signalContext={signalContext} />

      <section className="receiptBox">
        <h2>Rastro oficial</h2>
        <dl>
          <ReceiptRow label="Fuente" value={caseFile.receipt.sourceName} />
          <ReceiptRow label="Locator" value={expediente.officialTrail.primary.locator.label} />
          <ReceiptRow label="Nota" value={expediente.officialTrail.primary.locator.note} />
          <ReceiptRow label="Hash" value={`${caseFile.receipt.fileHash.slice(0, 24)}...`} />
          <ReceiptRow label="Raw path" value={caseFile.receipt.rawPath} />
          <ReceiptRow
            label="Extraido"
            value={new Date(caseFile.receipt.extractedAt).toLocaleString("es-AR")}
          />
        </dl>
        {relatedReceipts.length ? (
          <div className="relatedReceiptList">
            <span>Evidencia cruzada</span>
            {relatedReceipts.slice(0, 6).map((receipt) => (
              <a key={receipt.receiptId} href={getPublicOfficialSourceHref(receipt)} target="_blank" rel="noreferrer">
                {shortSource(receipt.sourceId)}
              </a>
            ))}
          </div>
        ) : null}
        <div className="actionRow">
          <a href={expediente.actions.reportHref}>
            <FileText size={16} aria-hidden />
            Informe PDF
          </a>
          <a href={expediente.actions.officialSourceHref} target="_blank" rel="noreferrer">
            <ExternalLink size={16} aria-hidden />
            Fuente oficial
          </a>
          <a href={`/api/export/${encodedCaseId}`} download>
            <Download size={16} aria-hidden />
            JSON técnico
          </a>
        </div>
      </section>

      <ContextualCitationsPanel citations={expediente.investigationContext.contextualCitations} />

      <section className="traceBox">
        <button
          type="button"
          className={hasOfficialGeometry && traceMode ? "active" : ""}
          disabled={!hasOfficialGeometry}
          onClick={() => {
            if (hasOfficialGeometry) onTraceModeChange(!traceMode);
          }}
        >
          <Route size={17} aria-hidden />
          Rastro visual
        </button>
        <p>{describeTraceContext({ hasOfficialGeometry, isContract })}</p>
      </section>

      <section className="nextStepsBox">
        <h2>Que verificar despues</h2>
        <ol>
          {expediente.nextVerification.slice(0, 5).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ReceiptRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function renderAmount(amount: AmountInput | null): ReactNode {
  if (!amount) return "Sin dato";
  const formatted = formatAmountWithUsd(amount);
  return (
    <span className="amountStack">
      <span className="amountPrimary">{formatted.primary}</span>
      {formatted.usdSegment && (
        <span className="amountUsd">{formatted.usdSegment}</span>
      )}
      {formatted.showMissingChip && (
        <span className="amountMissingChip" title={`Sin cotizacion oficial (${formatted.note ?? "sin dato"})`}>
          sin cotizacion oficial para esta fecha
        </span>
      )}
    </span>
  );
}

function formatExecutionTerm(caseFile: Pick<ExplorerCase, "executionTerm" | "executionTermType">): string {
  if (!caseFile.executionTerm) return "Sin dato";
  return `${caseFile.executionTerm} ${caseFile.executionTermType ?? ""}`.trim();
}

function formatSupplier(caseFile: ArgentinaContractCaseFile): string {
  return caseFile.supplierName ?? caseFile.supplierDocument ?? "Sin dato";
}

function isArgentinaContractCase(caseFile: ExplorerCase): caseFile is ArgentinaContractCaseFile {
  return "caseType" in caseFile && caseFile.caseType === "procurement_contract";
}

function isArgentinaInvestmentMapCase(caseFile: ExplorerCase): caseFile is ArgentinaInvestmentMapCaseFile {
  return "caseType" in caseFile && caseFile.caseType === "public_works_progress";
}

function caseNumberLabel({
  isContract,
  isInvestmentMap,
}: {
  isContract: boolean;
  isInvestmentMap: boolean;
}): string {
  if (isContract) return "Contrato";
  if (isInvestmentMap) return "Proyecto";
  return "Obra";
}

function formatProgress(value: number | null): string {
  if (value === null) return "Sin dato";
  return `${Math.round(value)}%`;
}

function formatInvestmentLocation(
  caseFile: Pick<ArgentinaInvestmentMapCaseFile, "workDepartment" | "workProvince" | "locationName">,
): string {
  const parts = [caseFile.workDepartment, caseFile.workProvince]
    .filter((value): value is string => Boolean(value));
  return parts.length > 0 ? parts.join(", ") : caseFile.locationName ?? "Sin dato";
}

function describeTraceContext({
  hasOfficialGeometry,
  isContract,
}: {
  hasOfficialGeometry: boolean;
  isContract: boolean;
}): string {
  if (!hasOfficialGeometry) {
    return "Faro no dibuja este caso en el mapa hasta tener geometria oficial confiable. La fuente es verificable, pero no hay punto ni rastro visual habilitado.";
  }
  if (isContract) {
    return "El punto se dibuja porque el contrato cruza contra una obra con coordenada oficial. El domicilio del proveedor no se usa como ubicacion de ejecucion.";
  }
  return "En esta capa el rastro financiero no se dibuja hasta tener origen y destino geograficos verificados. Por ahora se ilumina el punto oficial de la obra.";
}


function formatBidderCount(
  caseFile: Pick<ArgentinaContractCaseFile, "bidderCount" | "offerCount">,
): string {
  if (caseFile.bidderCount === null || caseFile.bidderCount === undefined) return "Sin dato";
  const bidderLabel = caseFile.bidderCount === 1 ? "oferente" : "oferentes";
  if (!caseFile.offerCount || caseFile.offerCount === caseFile.bidderCount) {
    return `${caseFile.bidderCount} ${bidderLabel}`;
  }
  return `${caseFile.bidderCount} ${bidderLabel}, ${caseFile.offerCount} ofertas`;
}

function formatWorkLocation(
  caseFile: Pick<ArgentinaContractCaseFile, "workLocality" | "workDepartment" | "workProvince" | "locationName">,
): string {
  const parts = [caseFile.workLocality, caseFile.workDepartment, caseFile.workProvince]
    .filter((value): value is string => Boolean(value));
  return parts.length > 0 ? parts.join(", ") : caseFile.locationName ?? "Sin dato";
}

function shortSource(sourceId: string): string {
  if (sourceId.includes("ACTAS")) return "Actas";
  if (sourceId.includes("CONTRATOS")) return "Contratos";
  if (sourceId.includes("OFERTAS")) return "Ofertas";
  if (sourceId.includes("PROCEDIMIENTOS")) return "Procedimiento";
  if (sourceId.includes("UBICACION")) return "Ubicacion";
  if (sourceId.includes("SIPRO")) return "SIPRO";
  return "Fuente";
}
