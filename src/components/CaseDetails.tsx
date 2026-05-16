import { Download, ExternalLink, FileSearch, Route, Satellite, ShieldCheck } from "lucide-react";

import type { CaseDataset } from "@/lib/caseRepository";
import type { ArgentinaWorkCase } from "@/lib/data/argentinaWorks";

export function CaseDetails({
  caseFile,
  dataset,
  traceMode,
  onTraceModeChange,
}: {
  caseFile: ArgentinaWorkCase;
  dataset: CaseDataset;
  traceMode: boolean;
  onTraceModeChange: (next: boolean) => void;
}) {
  return (
    <div className="caseDetails">
      <div className="panelKicker">
        <ShieldCheck size={16} aria-hidden />
        Expediente verificable
      </div>
      <h1>{caseFile.title}</h1>
      <div className="caseMetaGrid">
        <Metric label="Obra" value={caseFile.workNumber} />
        <Metric label="Procedimiento" value={caseFile.procedureNumber || "Sin dato"} />
        <Metric label="Organismo" value={caseFile.agencyName || "Sin dato"} />
        <Metric label="Plazo" value={formatExecutionTerm(caseFile)} />
      </div>

      <section className="whyBox">
        <h2>Por que mirar</h2>
        <p>
          Es una obra publica declarada con coordenadas oficiales. Faro la convierte en un
          punto investigable: ubicacion, expediente, organismo, fuente y descarga del caso.
        </p>
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
          <ReceiptRow label="Hash" value={`${dataset.source.fileHash.slice(0, 24)}...`} />
          <ReceiptRow
            label="Extraido"
            value={new Date(caseFile.receipt.extractedAt).toLocaleString("es-AR")}
          />
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
          En esta capa el rastro financiero no se dibuja hasta tener origen y destino
          geograficos verificados. Por ahora se ilumina el punto oficial de la obra.
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

function formatExecutionTerm(caseFile: ArgentinaWorkCase): string {
  if (!caseFile.executionTerm) return "Sin dato";
  return `${caseFile.executionTerm} ${caseFile.executionTermType ?? ""}`.trim();
}
