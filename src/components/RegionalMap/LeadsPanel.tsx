"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CircleHelp,
  FileCheck,
  Info,
  MapPin,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import type { CaseLead } from "@/lib/data/caseLeads";
import type { CaseSignalFamily } from "@/lib/data/caseSignals";
import styles from "./LeadsPanel.module.css";

const FAMILY_ICONS: Record<CaseSignalFamily, LucideIcon> = {
  competition: Users,
  money: CircleDollarSign,
  supplier: Building2,
  traceability: FileCheck,
  geo_visual: MapPin,
  data_gap: CircleHelp,
  context: Info,
};

const SEVERITY_CLASS: Record<"high" | "medium" | "low", string> = {
  high: styles.leadIconHigh,
  medium: styles.leadIconMedium,
  low: styles.leadIconLow,
};

const PAGE_SIZE = 4;

interface Props {
  open: boolean;
  leads: CaseLead[];
  selectedCaseId: string | null;
  onSelectCase: (caseId: string) => void;
  onClose: () => void;
}

export default function LeadsPanel({
  open,
  leads,
  selectedCaseId,
  onSelectCase,
  onClose,
}: Props) {
  const [page, setPage] = useState(0);

  // Reset to first page whenever the lead set changes shape.
  useEffect(() => {
    setPage(0);
  }, [leads.length, leads[0]?.leadId]);

  // Esc closes the panel while it's open.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const totalPages = Math.max(1, Math.ceil(leads.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * PAGE_SIZE;
  const pagedLeads = useMemo(
    () => leads.slice(pageStart, pageStart + PAGE_SIZE),
    [leads, pageStart],
  );

  return (
    <aside
      id="leads-panel"
      className={styles.panel}
      role="dialog"
      aria-modal="false"
      aria-labelledby="leads-panel-title"
      aria-hidden={!open}
    >
      <header className={styles.header}>
        <h2 id="leads-panel-title" className={styles.title}>
          Casos a revisar
          <span className={styles.titleCount}> · {leads.length.toLocaleString("es-AR")}</span>
        </h2>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Cerrar casos a revisar"
        >
          <X size={16} aria-hidden />
        </button>
      </header>

      <div className={styles.list}>
        {pagedLeads.map((lead) => {
          const isSelected = lead.caseId === selectedCaseId;
          const family = lead.primarySignal.family;
          const SignalIcon = family ? FAMILY_ICONS[family] : AlertTriangle;
          const severity = lead.primarySignal.severity;
          const severityClass = severity ? SEVERITY_CLASS[severity] : "";
          return (
            <button
              key={lead.leadId}
              type="button"
              className={`${styles.leadCard} ${isSelected ? styles.leadCardActive : ""}`}
              onClick={() => onSelectCase(lead.caseId)}
              aria-pressed={isSelected}
            >
              <span className={`${styles.leadIcon} ${severityClass}`}>
                <SignalIcon size={14} aria-hidden />
              </span>
              <span className={styles.leadBody}>
                <span className={styles.leadMeta}>{lead.sourceName}</span>
                <strong className={styles.leadTitle}>{lead.caseTitle}</strong>
                <span className={styles.leadWhy}>{lead.why}</span>
              </span>
              <ArrowRight size={14} aria-hidden className={styles.leadArrow} />
            </button>
          );
        })}
      </div>

      {totalPages > 1 && (
        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.pageButton}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            aria-label="Página anterior"
          >
            <ChevronLeft size={14} aria-hidden />
          </button>
          <span className={styles.pageStatus}>
            {safePage + 1} / {totalPages}
          </span>
          <button
            type="button"
            className={styles.pageButton}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            aria-label="Página siguiente"
          >
            <ChevronRight size={14} aria-hidden />
          </button>
        </footer>
      )}
    </aside>
  );
}
