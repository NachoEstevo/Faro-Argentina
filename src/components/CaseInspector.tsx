import { Download, ExternalLink, FileText, ShieldCheck } from "lucide-react";

import { buildCaseInspector } from "@/lib/data/caseInspector";
import type { ExpedienteCaseFile } from "@/lib/data/expediente";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import { CaseSignalChips } from "./CaseSignals";

interface Props {
  caseFile: ExplorerCase;
  onOpenFull: () => void;
}

export default function CaseInspector({ caseFile, onOpenFull }: Props) {
  const inspector = buildCaseInspector(caseFile as ExpedienteCaseFile);

  return (
    <div className="caseInspector">
      <div className="panelKicker">
        <ShieldCheck size={16} aria-hidden />
        Inspector
      </div>

      <header className="inspectorHeader">
        <span>{inspector.kicker}</span>
        <h1>{inspector.title}</h1>
        <CaseSignalChips caseFile={caseFile} limit={3} />
      </header>

      <section className="inspectorSummary">
        <p>{inspector.summary}</p>
      </section>

      <dl className="inspectorFactGrid">
        {inspector.facts.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>

      {inspector.primarySignal && (
        <section className="inspectorSignal">
          <span>{inspector.primarySignal.kind}</span>
          <h2>{inspector.primarySignal.label}</h2>
          <p>{inspector.primarySignal.summary}</p>
          <dl>
            <div>
              <dt>Evidencia</dt>
              <dd>{inspector.primarySignal.evidence}</dd>
            </div>
            <div>
              <dt>Caveat</dt>
              <dd>{inspector.caveat}</dd>
            </div>
            <div>
              <dt>Siguiente paso</dt>
              <dd>{inspector.nextAction}</dd>
            </div>
          </dl>
        </section>
      )}

      <section className="inspectorTrail">
        <h2>Rastro oficial</h2>
        <dl>
          <div>
            <dt>Fuente</dt>
            <dd>{inspector.officialTrail.sourceName}</dd>
          </div>
          <div>
            <dt>Locator</dt>
            <dd>{inspector.officialTrail.locatorLabel}</dd>
          </div>
          <div>
            <dt>Nota</dt>
            <dd>{inspector.officialTrail.locatorNote}</dd>
          </div>
        </dl>
        <p>
          {inspector.officialTrail.relatedCount} receipts relacionados · {inspector.officialTrail.sourceCount} fuentes
        </p>
      </section>

      <div className="inspectorActions">
        <a href={inspector.actions.officialSourceHref} target="_blank" rel="noreferrer">
          <ExternalLink size={16} aria-hidden />
          Fuente
        </a>
        <a href={inspector.actions.downloadEvidenceHref} download>
          <Download size={16} aria-hidden />
          Exportar
        </a>
        <button type="button" onClick={onOpenFull}>
          <FileText size={16} aria-hidden />
          Expediente
        </button>
      </div>
    </div>
  );
}
