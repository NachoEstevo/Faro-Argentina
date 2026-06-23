import { AlertTriangle, CheckCircle2, CircleHelp, Info } from "lucide-react";

import {
  buildCaseSignals,
  type CaseSignal,
  type CaseSignalContext,
  type SignalCaseFile,
} from "@/lib/data/caseSignals";

interface CaseSignalProps {
  caseFile: SignalCaseFile;
  limit?: number;
  signalContext?: CaseSignalContext;
  signals?: CaseSignal[];
}

export function CaseSignalPanel({
  caseFile,
  signalContext,
  signals: providedSignals,
}: CaseSignalProps) {
  const signals = (providedSignals ?? buildCaseSignals(caseFile, signalContext)).slice(0, 5);
  if (signals.length === 0) return null;

  return (
    <section className="signalsBox">
      <h2>Pistas para mirar</h2>
      <div className="signalList">
        {signals.map((signal) => (
          <article key={signal.code} className={`signalItem ${signal.kind}`}>
            <SignalIcon signal={signal} />
            <div>
              <div className="signalTitle">
                <strong>{signal.label}</strong>
                <div className="signalTitleMeta">
                  <span>{labelKind(signal.kind)}</span>
                  <SignalHelpDisclosure signal={signal} />
                </div>
              </div>
              <p>{signal.summary}</p>
              <dl className="signalProof">
                <div>
                  <dt>Evidencia</dt>
                  <dd>{signal.evidence}</dd>
                </div>
                <div>
                  <dt>Caveat</dt>
                  <dd>{signal.caveat}</dd>
                </div>
                <div>
                  <dt>Siguiente paso</dt>
                  <dd>{signal.action}</dd>
                </div>
              </dl>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CaseSignalChips({
  caseFile,
  limit = 3,
  signalContext,
  signals: providedSignals,
}: CaseSignalProps) {
  const signals = (providedSignals ?? buildCaseSignals(caseFile, signalContext)).slice(0, limit);
  if (signals.length === 0) return null;

  return (
    <div className="signalChips" aria-label="Pistas de revisión">
      {signals.map((signal) => (
        <details key={signal.code} className={`signalChipDisclosure ${signal.kind}`}>
          <summary className={`signalChip ${signal.kind}`} aria-label={`${signal.label}. Ver qué significa`}>
            <span>{signal.label}</span>
            <span className="signalChipHint" aria-hidden>?</span>
          </summary>
          <div className="signalChipPopover" role="note">
            <strong>{signal.label}</strong>
            <p>{signal.summary}</p>
            <dl>
              <div>
                <dt>Cómo leerlo</dt>
                <dd>{signal.caveat}</dd>
              </div>
              <div>
                <dt>Próximo paso</dt>
                <dd>{signal.action}</dd>
              </div>
            </dl>
          </div>
        </details>
      ))}
    </div>
  );
}

function SignalHelpDisclosure({ signal }: { signal: CaseSignal }) {
  return (
    <details className="signalHelpDisclosure">
      <summary className="signalHelpButton" aria-label={`${signal.label}. Ver qué significa`}>
        <CircleHelp size={14} aria-hidden />
      </summary>
      <div className="signalHelpPopover" role="note">
        <strong>{signal.label}</strong>
        <p>{signal.summary}</p>
        <dl>
          <div>
            <dt>Evidencia</dt>
            <dd>{signal.evidence}</dd>
          </div>
          <div>
            <dt>Cómo leerlo</dt>
            <dd>{signal.caveat}</dd>
          </div>
          <div>
            <dt>Próximo paso</dt>
            <dd>{signal.action}</dd>
          </div>
        </dl>
      </div>
    </details>
  );
}

function SignalIcon({ signal }: { signal: CaseSignal }) {
  if (signal.kind === "watch") return <AlertTriangle size={15} aria-hidden />;
  if (signal.kind === "ready") return <CheckCircle2 size={15} aria-hidden />;
  if (signal.kind === "gap") return <CircleHelp size={15} aria-hidden />;
  return <Info size={15} aria-hidden />;
}

function labelKind(kind: CaseSignal["kind"]): string {
  if (kind === "watch") return "revisar";
  if (kind === "ready") return "listo";
  if (kind === "gap") return "falta";
  return "contexto";
}
