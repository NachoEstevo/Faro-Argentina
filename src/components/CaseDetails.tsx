import type { ReactNode } from "react";
import { Download, ExternalLink, FileSearch, Route, ShieldCheck } from "lucide-react";

import type { CaseDataset } from "@/lib/caseRepository";
import type { ArgentinaWorkCase } from "@/lib/data/argentinaWorks";
import type { CaseSignalContext } from "@/lib/data/caseSignals";
import type { CrossCountryCaseFile } from "@/lib/data/crossCountryCases";
import { buildExpediente, type ExpedienteCaseFile } from "@/lib/data/expediente";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import { formatAmountWithUsd, type AmountInput } from "@/lib/format/money";
import { CaseSignalChips, CaseSignalPanel } from "./CaseSignals";

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
  const isContract = isCrossCountryCase(caseFile) && caseFile.caseType === "procurement_contract";
  const relatedReceipts = isCrossCountryCase(caseFile) ? caseFile.relatedReceipts ?? [] : [];
  const expediente = buildExpediente(caseFile as ExpedienteCaseFile, signalContext);
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
        <Metric label={isContract ? "Contrato" : "Obra"} value={caseFile.workNumber} />
        <Metric label="Procedimiento" value={caseFile.procedureNumber || "Sin dato"} />
        <Metric label="Organismo" value={caseFile.agencyName || "Sin dato"} />
        <Metric
          label={isContract ? "Proveedor" : "Plazo"}
          value={isContract ? formatSupplier(caseFile) : formatExecutionTerm(caseFile)}
        />
        {isContract && (
          <>
            <Metric label="Monto" value={renderAmount(caseFile.amount as AmountInput | null)} />
            <Metric label="Oferentes" value={formatBidderCount(caseFile)} />
            <Metric label="Estado" value={caseFile.procedureState ?? "Sin dato"} />
            <Metric label="Ubicacion" value={formatWorkLocation(caseFile)} />
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
              <a key={receipt.receiptId} href={receipt.sourceUrl} target="_blank" rel="noreferrer">
                {shortSource(receipt.sourceId)}
              </a>
            ))}
          </div>
        ) : null}
        <div className="actionRow">
          <a href={caseFile.receipt.sourceUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={16} aria-hidden />
            Fuente oficial
          </a>
          <a href={`/api/export/${encodedCaseId}`} download>
            <Download size={16} aria-hidden />
            Descargar JSON
          </a>
        </div>
      </section>

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

export function EmptyCountry({ selectedCountry }: { selectedCountry: "AR" | "PE" | "CL" }) {
  return (
    <div className="emptyState">
      <FileSearch size={28} aria-hidden />
      <h1>{selectedCountry === "PE" ? "Peru" : "Chile"} esta en cola de ingesta</h1>
      <p>
        La demo abre con Argentina porque ya hay obras geolocalizadas. Peru y Chile se cargan
        como fuentes oficiales comparables, no como datos de relleno.
      </p>
    </div>
  );
}

export function CountryExplorer({
  selectedCountry,
  cases,
  signalContext,
}: {
  selectedCountry: "PE" | "CL" | "AR";
  cases: CrossCountryCaseFile[];
  signalContext?: CaseSignalContext;
}) {
  if (selectedCountry === "AR") return null;
  const countryLabel = selectedCountry === "PE" ? "Peru" : "Chile";
  return (
    <div className="countryExplorer">
      <div className="panelKicker">
        <FileSearch size={16} aria-hidden />
        Explorer verificable
      </div>
      <h1>{countryLabel}</h1>
      <p className="explorerIntro">
        Casos con fuente oficial, hash local y descarga. No se dibujan en mapa hasta tener
        geometria oficial suficiente.
      </p>
      <div className="collectionDownloads">
        <a href={`/api/export?country=${selectedCountry}`} download>
          <Download size={16} aria-hidden />
          Descargar pais
        </a>
        {Array.from(new Set(cases.map((caseFile) => caseFile.receipt.sourceId))).map((sourceId) => (
          <a key={sourceId} href={`/api/export?country=${selectedCountry}&sourceId=${sourceId}`} download>
            <Download size={16} aria-hidden />
            {shortSource(sourceId)}
          </a>
        ))}
      </div>
      <div className="caseRows">
        {cases.slice(0, 14).map((caseFile) => (
          <article key={caseFile.id} className="caseRow">
            <div>
              <span>{labelCaseType(caseFile.caseType)}</span>
              <h2>{caseFile.title}</h2>
              <CaseSignalChips caseFile={caseFile} signalContext={signalContext} />
            </div>
            <dl>
              <ReceiptRow label="Organismo" value={caseFile.agencyName || "Sin dato"} />
              <ReceiptRow label="Proveedor" value={formatSupplier(caseFile)} />
              <ReceiptRow label="Monto" value={renderAmount(caseFile.amount as AmountInput | null)} />
              <ReceiptRow label="Fecha" value={formatCaseDate(caseFile)} />
              <ReceiptRow label="Competencia" value={formatBidderCount(caseFile)} />
            </dl>
            <div className="actionRow">
              <a href={caseFile.receipt.sourceUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={16} aria-hidden />
                Fuente oficial
              </a>
              <a href={`/api/export/${encodeURIComponent(caseFile.id)}`} download>
                <Download size={16} aria-hidden />
                Descargar JSON
              </a>
            </div>
          </article>
        ))}
      </div>
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

function labelCaseType(caseType: CrossCountryCaseFile["caseType"]): string {
  if (caseType === "procurement_contract") return "Contrato";
  if (caseType === "procurement_process") return "Adjudicacion";
  return "Ejecucion presupuestaria";
}

function formatSupplier(caseFile: CrossCountryCaseFile): string {
  return caseFile.supplierName ?? caseFile.supplierDocument ?? "Sin dato";
}

function isCrossCountryCase(caseFile: ExplorerCase): caseFile is CrossCountryCaseFile {
  return "caseType" in caseFile;
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
  caseFile: Pick<CrossCountryCaseFile, "bidderCount" | "offerCount">,
): string {
  if (caseFile.bidderCount === null || caseFile.bidderCount === undefined) return "Sin dato";
  const bidderLabel = caseFile.bidderCount === 1 ? "oferente" : "oferentes";
  if (!caseFile.offerCount || caseFile.offerCount === caseFile.bidderCount) {
    return `${caseFile.bidderCount} ${bidderLabel}`;
  }
  return `${caseFile.bidderCount} ${bidderLabel}, ${caseFile.offerCount} ofertas`;
}

function formatWorkLocation(
  caseFile: Pick<CrossCountryCaseFile, "workLocality" | "workDepartment" | "workProvince" | "locationName">,
): string {
  const parts = [caseFile.workLocality, caseFile.workDepartment, caseFile.workProvince]
    .filter((value): value is string => Boolean(value));
  return parts.length > 0 ? parts.join(", ") : caseFile.locationName ?? "Sin dato";
}

function formatCaseDate(
  caseFile: Pick<CrossCountryCaseFile, "awardedAt" | "publishedAt" | "year">,
): string {
  return caseFile.awardedAt ?? caseFile.publishedAt ?? String(caseFile.year ?? "Sin dato");
}

function shortSource(sourceId: string): string {
  if (sourceId.includes("ACTAS")) return "Actas";
  if (sourceId.includes("CONTRATOS")) return "Contratos";
  if (sourceId.includes("OFERTAS")) return "Ofertas";
  if (sourceId.includes("PROCEDIMIENTOS")) return "Procedimiento";
  if (sourceId.includes("UBICACION")) return "Ubicacion";
  if (sourceId.includes("SIPRO")) return "SIPRO";
  if (sourceId.includes("OCDS")) return "OCDS";
  if (sourceId.includes("GASTO")) return "Presupuesto";
  if (sourceId.includes("MERCADO")) return "Adjudicaciones";
  return "Fuente";
}
