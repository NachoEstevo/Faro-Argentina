"use client";

import { RefreshCw } from "lucide-react";

import { formatReleaseYear, type WaybackRelease } from "@/lib/data/wayback";
import type { WaybackState } from "@/components/WaybackControl";
import styles from "../casePanel.module.css";

interface Props {
  state: WaybackState;
  onActiveReleaseChange: (releaseId: number) => void;
  onRetry: () => void;
}

export default function PanelImagery({ state, onActiveReleaseChange, onRetry }: Props) {
  if (state.status === "off") return null;
  return (
    <section className={styles.section}>
      <p className={styles.sectionKicker}>Imagen satelital</p>
      <Body
        state={state}
        onActiveReleaseChange={onActiveReleaseChange}
        onRetry={onRetry}
      />
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
      <div className={styles.imagerySummary}>
        <span className={styles.imagerySummaryLabel}>Año visible</span>
        <span className={styles.imageryReadout} aria-hidden>
          {formatReleaseYear(activeRelease)}
        </span>
      </div>
      <div
        className={styles.imageryStage}
        style={{ ["--cp-scrub" as string]: `${percent}%` }}
      >
        <div className={styles.imageryTicks} aria-hidden>
          {releases.map((release, index) => {
            const tickPercent = last === 0 ? 0 : (index / last) * 100;
            const isActive = release.releaseId === activeReleaseId;
            const showLabel =
              releases.length <= 7 ||
              index === 0 ||
              index === last ||
              isActive ||
              release.year % 2 === 0;
            const edge = index === 0 ? "start" : index === last ? "end" : undefined;
            return (
              <span
                key={release.releaseId}
                className={`${styles.imageryYearTick} ${isActive ? styles.imageryYearTickActive : ""}`}
                data-edge={edge}
                style={{ ["--cp-tick" as string]: `${tickPercent}%` }}
              >
                <span className={styles.imageryTickLine} />
                {showLabel && (
                  <span className={styles.imageryTickYear}>{release.year}</span>
                )}
              </span>
            );
          })}
        </div>
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
          aria-valuemin={firstRelease.year}
          aria-valuemax={lastRelease.year}
          aria-valuetext={formatReleaseYear(activeRelease)}
          className={styles.imagerySlider}
        />
      </div>
    </div>
  );
}
