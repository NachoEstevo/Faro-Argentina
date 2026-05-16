"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Info,
  type LucideIcon,
} from "lucide-react";

import type { CaseLead } from "@/lib/data/caseLeads";

interface Props {
  leads: CaseLead[];
  selectedCaseId: string | null;
  onSelectCase: (caseId: string) => void;
}

const leadIcons: Record<CaseLead["primarySignal"]["kind"], LucideIcon> = {
  watch: AlertTriangle,
  ready: CheckCircle2,
  gap: CircleHelp,
  context: Info,
};

export default function LeadFeed({ leads, selectedCaseId, onSelectCase }: Props) {
  if (leads.length === 0) {
    return (
      <section className="leadFeed" aria-label="Pistas verificables">
        <div className="leadFeedHeader">
          <span>Pistas verificables</span>
          <strong>0</strong>
        </div>
        <p className="leadEmpty">No hay pistas para estos filtros.</p>
      </section>
    );
  }

  return (
    <section className="leadFeed" aria-label="Pistas verificables">
      <div className="leadFeedHeader">
        <span>Pistas verificables</span>
        <strong>{leads.length}</strong>
      </div>
      <div className="leadList">
        {leads.map((lead) => {
          const SignalIcon = leadIcons[lead.primarySignal.kind];
          const isSelected = lead.caseId === selectedCaseId;

          return (
            <button
              key={lead.leadId}
              type="button"
              className={isSelected ? "leadCard active" : "leadCard"}
              onClick={() => onSelectCase(lead.caseId)}
              aria-pressed={isSelected}
            >
              <span className="leadIcon">
                <SignalIcon size={15} aria-hidden />
              </span>
              <span className="leadBody">
                <span className="leadMeta">
                  {lead.countryCode} / {lead.sourceName}
                </span>
                <strong>{lead.caseTitle}</strong>
                <span>{lead.why}</span>
              </span>
              <ArrowRight size={15} aria-hidden />
            </button>
          );
        })}
      </div>
    </section>
  );
}
