import { AlertTriangle, CheckCircle2, CircleHelp, Info } from "lucide-react";

import {
  buildCaseSignals,
  type CaseSignal,
  type SignalCaseFile,
} from "@/lib/data/caseSignals";

export function CaseSignalPanel({ caseFile }: { caseFile: SignalCaseFile }) {
  const signals = buildCaseSignals(caseFile).slice(0, 5);
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
                <span>{labelKind(signal.kind)}</span>
              </div>
              <p>{signal.summary}</p>
              <small>{signal.caveat}</small>
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
}: {
  caseFile: SignalCaseFile;
  limit?: number;
}) {
  const signals = buildCaseSignals(caseFile).slice(0, limit);
  if (signals.length === 0) return null;

  return (
    <div className="signalChips">
      {signals.map((signal) => (
        <span key={signal.code} className={`signalChip ${signal.kind}`}>
          {signal.label}
        </span>
      ))}
    </div>
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
