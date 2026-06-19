"use client";

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
}

export default function CasePanel({
  caseFile,
  signalContext,
  onClose,
  waybackState,
  onWaybackReleaseChange,
  onWaybackRetry,
  onReportCase,
}: Props) {
  return (
    <div className={`${styles.module} ${styles.panel}`}>
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
