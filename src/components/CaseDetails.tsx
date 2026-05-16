import { Download, ExternalLink, FileSearch, Route, Satellite, ShieldCheck } from "lucide-react";

import type { CaseDataset } from "@/lib/caseRepository";
import type { ArgentinaWorkCase } from "@/lib/data/argentinaWorks";
import type { CrossCountryCaseFile } from "@/lib/data/crossCountryCases";
import type { ExplorerCase } from "@/lib/data/explorerCases";

export function CaseDetails({
  caseFile,
  dataset,
  traceMode,
  onTraceModeChange,
}: {
  caseFile: ExplorerCase;
  dataset: CaseDataset;
  traceMode: boolean;
  onTraceModeChange: (next: boolean) => void;
}) {
  const isContract = isCrossCountryCase(caseFile) && caseFile.caseType === "procurement_contract";
  const relatedReceipts = isCrossCountryCase(caseFile) ? caseFile.relatedReceipts ?? [] : [];
  return (
    <div className="caseDetails">
      <div className="panelKicker">
        <ShieldCheck size={16} aria-hidden />
        Expediente verificable
      </div>
      <h1>{caseFile.title}</h1>
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
            <Metric label="Monto" value={formatAmount(caseFile)} />
            <Metric label="Oferentes" value={formatBidderCount(caseFile)} />
            <Metric label="Estado" value={caseFile.procedureState ?? "Sin dato"} />
            <Metric label="Ubicacion" value={formatWorkLocation(caseFile)} />
          </>
        )}
      </div>

      <section className="whyBox">
        <h2>Por que mirar</h2>
        <p>{formatWhy(caseFile)}</p>
      </section>

      <section className="satelliteBox">
        <div>
          <Satellite size={18} aria-hidden />
          <h2>Sentinel-2</h2>
        </div>
        <div className="satelliteGrid">
          <div>
            <span>Antes del contrato</span>
            <strong>{caseFile.year ? caseFile.year - 1 : "pendiente"}</strong>
          </div>
          <div>
            <span>Ultima escena</span>
            <strong>consulta lista</strong>
          </div>
        </div>
        <p>
          La capa satelital sirve para contexto visual. No prueba pagos ni avance sin controles
          de nubes, fecha y resolucion.
        </p>
      </section>

      <section className="receiptBox">
        <h2>Evidence receipt</h2>
        <dl>
          <ReceiptRow label="Fuente" value={caseFile.receipt.sourceName} />
          <ReceiptRow label="Hash" value={`${caseFile.receipt.fileHash.slice(0, 24)}...`} />
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
          <a href={`/api/export/${caseFile.id}`} download>
            <Download size={16} aria-hidden />
            Descargar JSON
          </a>
        </div>
      </section>

      <section className="traceBox">
        <button
          type="button"
          className={traceMode ? "active" : ""}
          onClick={() => onTraceModeChange(!traceMode)}
        >
          <Route size={17} aria-hidden />
          Rastro visual
        </button>
        <p>
          {isContract
            ? "El punto se dibuja porque el contrato cruza contra una obra con coordenada oficial. El domicilio del proveedor no se usa como ubicacion de ejecucion."
            : "En esta capa el rastro financiero no se dibuja hasta tener origen y destino geograficos verificados. Por ahora se ilumina el punto oficial de la obra."}
        </p>
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
}: {
  selectedCountry: "PE" | "CL" | "AR";
  cases: CrossCountryCaseFile[];
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
            </div>
            <dl>
              <ReceiptRow label="Organismo" value={caseFile.agencyName || "Sin dato"} />
              <ReceiptRow label="Proveedor" value={formatSupplier(caseFile)} />
              <ReceiptRow label="Monto" value={formatAmount(caseFile)} />
              <ReceiptRow label="Fecha" value={formatCaseDate(caseFile)} />
              <ReceiptRow label="Competencia" value={formatBidderCount(caseFile)} />
            </dl>
            <div className="actionRow">
              <a href={caseFile.receipt.sourceUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={16} aria-hidden />
                Fuente oficial
              </a>
              <a href={`/api/export/${caseFile.id}`} download>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
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

function formatWhy(caseFile: ExplorerCase): string {
  if (isCrossCountryCase(caseFile) && caseFile.caseType === "procurement_contract") {
    const competition = formatBidderCount(caseFile);
    const suffix = competition === "Sin dato"
      ? "Falta medir competencia con ofertas o actas."
      : `El cruce oficial muestra ${competition.toLowerCase()}.`;
    return `Es un contrato oficial enlazado a una obra con coordenada verificada. ${suffix} Faro muestra evidencia relacionada sin inferir pagos.`;
  }
  return "Es una obra publica declarada con coordenadas oficiales. Faro la convierte en un punto investigable: ubicacion, expediente, organismo, fuente y descarga del caso.";
}

function isCrossCountryCase(caseFile: ExplorerCase): caseFile is CrossCountryCaseFile {
  return "caseType" in caseFile;
}

function formatAmount(caseFile: CrossCountryCaseFile): string {
  if (!caseFile.amount) return "Sin dato";
  return `${caseFile.amount.currency} ${Math.round(caseFile.amount.value).toLocaleString("es-AR")}`;
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
