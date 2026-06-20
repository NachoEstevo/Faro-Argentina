"use client";

import { FileText, Map as MapIcon, X } from "lucide-react";
import type { CaseSignalContext } from "@/lib/data/caseSignals";
import type { ExplorerCase } from "@/lib/data/explorerCases";
import type { WaybackState } from "@/components/WaybackControl";
import PanelHero from "./panel/PanelHero";
import PanelFacts from "./panel/PanelFacts";
import PanelImagery from "./panel/PanelImagery";
import PanelTechDetails from "./panel/PanelTechDetails";
import PanelNextSteps from "./panel/PanelNextSteps";
import PanelActions from "./panel/PanelActions";
import styles from "./casePanel.module.css";

interface Props {
  caseFile: ExplorerCase;
  signalContext?: CaseSignalContext;
  onClose: () => void;
  waybackState: WaybackState;
  onWaybackReleaseChange: (releaseId: number) => void;
  onWaybackRetry: () => void;
  onReportCase?: () => void;
  mobileMapOpen?: boolean;
  onMobileMapOpenChange?: (open: boolean) => void;
}

export default function CasePanel({
  caseFile,
  signalContext,
  onClose,
  waybackState,
  onWaybackReleaseChange,
  onWaybackRetry,
  onReportCase,
  mobileMapOpen = false,
  onMobileMapOpenChange,
}: Props) {
  const mapModeLabel = waybackState.status === "off" ? "Mapa" : "Mapa satelital";
  const panelClassName = [
    styles.module,
    styles.panel,
    mobileMapOpen ? styles.panelMobileMapOpen : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={panelClassName}>
      <div className={styles.mobileModeBar} aria-label="Vista del expediente en mobile">
        <button
          type="button"
          className={`${styles.mobileModeButton} ${mobileMapOpen ? styles.mobileModeButtonActive : ""}`}
          onClick={() => onMobileMapOpenChange?.(true)}
          aria-pressed={mobileMapOpen}
        >
          <MapIcon size={15} aria-hidden />
          <span>{mapModeLabel}</span>
        </button>
        <button
          type="button"
          className={`${styles.mobileModeButton} ${!mobileMapOpen ? styles.mobileModeButtonActive : ""}`}
          onClick={() => onMobileMapOpenChange?.(false)}
          aria-pressed={!mobileMapOpen}
        >
          <FileText size={15} aria-hidden />
          <span>Expediente</span>
        </button>
      </div>
      <div className={styles.mobileMapSummary}>
        <div className={styles.mobileMapSummaryText}>
          <span>{mapModeLabel}</span>
          <strong>{caseFile.title}</strong>
        </div>
        <button
          type="button"
          className={styles.mobileSummaryClose}
          onClick={onClose}
          aria-label="Cerrar expediente"
          title="Cerrar"
        >
          <X size={15} aria-hidden />
        </button>
      </div>
      <div className={styles.scroll}>
        <PanelHero caseFile={caseFile} signalContext={signalContext} onClose={onClose} />
        <div className={styles.divider} aria-hidden />
        <PanelFacts caseFile={caseFile} />
        {caseFile.coordinates && waybackState.status !== "off" && (
          <div className={styles.mobileInlineImagery}>
            <div className={styles.divider} aria-hidden />
            <PanelImagery
              state={waybackState}
              onActiveReleaseChange={onWaybackReleaseChange}
              onRetry={onWaybackRetry}
            />
          </div>
        )}
        <PanelTechDetails caseFile={caseFile} signalContext={signalContext} />
        <PanelNextSteps caseFile={caseFile} signalContext={signalContext} />
        <PanelActions caseFile={caseFile} signalContext={signalContext} onReportCase={onReportCase} />
      </div>
    </div>
  );
}
