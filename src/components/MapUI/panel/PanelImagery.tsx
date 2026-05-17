"use client";

import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

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
      <div className={styles.imageryCard}>
        <Body state={state} onActiveReleaseChange={onActiveReleaseChange} onRetry={onRetry} />
      </div>
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
    return <p className={styles.imageryHint}>Cargando años disponibles…</p>;
  }
  if (state.status === "error") {
    return (
      <div className={styles.imageryError}>
        <p>{state.message}</p>
        <button type="button" onClick={onRetry} className={styles.imageryRetry}>
          <RefreshCw size={12} aria-hidden /> Reintentar
        </button>
      </div>
    );
  }
  const { releases, activeReleaseId } = state;
  if (releases.length === 0) {
    return <p className={styles.imageryHint}>No hay imágenes históricas para esta ubicación.</p>;
  }
  const activeIndex = releases.findIndex((release) => release.releaseId === activeReleaseId);
  const safeIndex = activeIndex >= 0 ? activeIndex : releases.length - 1;
  const activeRelease = releases[safeIndex];
  const firstRelease = releases[0];
  const lastRelease = releases[releases.length - 1];
  const canGoBack = safeIndex > 0;
  const canGoForward = safeIndex < releases.length - 1;
  const step = (release: WaybackRelease) => onActiveReleaseChange(release.releaseId);

  return (
    <>
      <div className={styles.imageryYear}>{formatReleaseYear(activeRelease)}</div>
      <div className={styles.imagerySliderRow}>
        <button
          type="button"
          onClick={() => step(releases[safeIndex - 1])}
          disabled={!canGoBack}
          aria-label="Año anterior"
          className={styles.imageryStep}
        >
          <ChevronLeft size={14} aria-hidden />
        </button>
        <input
          type="range"
          min={0}
          max={releases.length - 1}
          step={1}
          value={safeIndex}
          onChange={(event) => {
            const next = releases[Number.parseInt(event.target.value, 10)];
            if (next) onActiveReleaseChange(next.releaseId);
          }}
          disabled={releases.length <= 1}
          aria-label="Año de la imagen satelital"
          aria-valuetext={formatReleaseYear(activeRelease)}
          className={styles.imagerySlider}
        />
        <button
          type="button"
          onClick={() => step(releases[safeIndex + 1])}
          disabled={!canGoForward}
          aria-label="Año siguiente"
          className={styles.imageryStep}
        >
          <ChevronRight size={14} aria-hidden />
        </button>
      </div>
      <div className={styles.imageryRange}>
        <span>{firstRelease.year}</span>
        <span>{lastRelease.year}</span>
      </div>
      <p className={styles.imageryHint}>Mové el slider para ver cómo cambió en el tiempo.</p>
    </>
  );
}
