"use client";

import { RefreshCw } from "lucide-react";

import { formatReleaseYear, type WaybackRelease } from "@/lib/data/wayback";
import type { WaybackState } from "@/components/WaybackControl";
import styles from "../casePanel.module.css";

interface Props {
  state: WaybackState;
  onActiveReleaseChange: (releaseId: number) => void;
  onClose: () => void;
  onRetry: () => void;
}

export default function PanelImagery({ state, onActiveReleaseChange, onRetry }: Props) {
  if (state.status === "off") return null;
  return (
    <section className={styles.section}>
      <p className={styles.sectionKicker}>Imagen satelital</p>
      <Body state={state} onActiveReleaseChange={onActiveReleaseChange} onRetry={onRetry} />
    </section>
  );
}

function Body({
  state,
  onActiveReleaseChange,
  onRetry,
}: {
  state: Exclude<WaybackState, { status: "off" }>;
  onActiveReleaseChange: (releaseId: number) => void;
  onRetry: () => void;
}) {
  if (state.status === "loading") {
    return (
      <div className={styles.imageryCard}>
        <div className={styles.imageryLoadingBar} aria-label="Cargando años disponibles" />
        <p className={styles.imageryAttribution}>Esri Wayback</p>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className={styles.imageryCard}>
        <p className={styles.imageryErrorMessage}>{state.message}</p>
        <button type="button" onClick={onRetry} className={styles.imageryRetry}>
          <RefreshCw size={12} aria-hidden /> Reintentar
        </button>
      </div>
    );
  }
  const { releases, activeReleaseId } = state;
  if (releases.length === 0) {
    return (
      <div className={styles.imageryCard}>
        <p className={styles.imageryAttribution}>No hay imágenes históricas para esta ubicación.</p>
      </div>
    );
  }
  return (
    <Scrubber
      releases={releases}
      activeReleaseId={activeReleaseId}
      onChange={onActiveReleaseChange}
    />
  );
}

function Scrubber({
  releases,
  activeReleaseId,
  onChange,
}: {
  releases: WaybackRelease[];
  activeReleaseId: number;
  onChange: (releaseId: number) => void;
}) {
  const activeIndex = Math.max(
    0,
    releases.findIndex((release) => release.releaseId === activeReleaseId),
  );
  const last = releases.length - 1;
  const percent = last === 0 ? 0 : (activeIndex / last) * 100;
  const activeRelease = releases[activeIndex];
  const firstRelease = releases[0];
  const lastRelease = releases[last];

  return (
    <div className={styles.imageryCard}>
      <div
        className={styles.imageryStage}
        style={{ ["--cp-scrub" as string]: `${percent}%` }}
      >
        <span className={styles.imageryReadout} aria-hidden>
          {formatReleaseYear(activeRelease)}
        </span>
        <span className={styles.imageryTick} aria-hidden />
        <input
          type="range"
          min={0}
          max={last}
          step={1}
          value={activeIndex}
          onChange={(event) => {
            const next = releases[Number.parseInt(event.target.value, 10)];
            if (next) onChange(next.releaseId);
          }}
          disabled={releases.length <= 1}
          aria-label="Año de la imagen satelital"
          aria-valuetext={formatReleaseYear(activeRelease)}
          className={styles.imagerySlider}
        />
        <div className={styles.imageryEnds} aria-hidden>
          <span>{firstRelease.year}</span>
          <span>{lastRelease.year}</span>
        </div>
      </div>
      <p className={styles.imageryAttribution}>Esri Wayback · {releases.length} años</p>
    </div>
  );
}
