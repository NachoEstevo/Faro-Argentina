"use client";

import WaybackControl, { type WaybackState } from "@/components/WaybackControl";
import styles from "../casePanel.module.css";

interface Props {
  state: WaybackState;
  onActiveReleaseChange: (releaseId: number) => void;
  onClose: () => void;
  onRetry: () => void;
}

export default function PanelImagery({ state, onActiveReleaseChange, onClose, onRetry }: Props) {
  if (state.status === "off") return null;
  return (
    <section className={styles.section}>
      <p className={styles.sectionKicker}>Imagen satelital</p>
      <div className={styles.imageryWrap}>
        <WaybackControl
          state={state}
          onActiveReleaseChange={onActiveReleaseChange}
          onClose={onClose}
          onRetry={onRetry}
        />
      </div>
    </section>
  );
}
