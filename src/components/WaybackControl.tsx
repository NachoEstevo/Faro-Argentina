"use client";

import { ChevronLeft, ChevronRight, RefreshCw, X } from "lucide-react";

import {
  formatReleaseYear,
  type WaybackRelease,
} from "@/lib/data/wayback";

export type WaybackState =
  | { status: "off" }
  | { status: "loading"; caseId: string }
  | { status: "active"; caseId: string; releases: WaybackRelease[]; activeReleaseId: number }
  | { status: "error"; caseId: string; message: string };

interface Props {
  state: WaybackState;
  onActiveReleaseChange: (releaseId: number) => void;
  onClose: () => void;
  onRetry?: () => void;
}

const ATTRIBUTION =
  "Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";

export default function WaybackControl({ state, onActiveReleaseChange, onClose, onRetry }: Props) {
  if (state.status === "off") return null;

  return (
    <aside className="waybackControl" role="region" aria-label="Esri Wayback releases">
      <header>
        <h3>Imagery Esri Wayback</h3>
        <button type="button" onClick={onClose} aria-label="Cerrar Wayback">
          <X size={14} aria-hidden />
        </button>
      </header>
      <Body state={state} onActiveReleaseChange={onActiveReleaseChange} onRetry={onRetry} />
      <footer className="waybackAttribution">{ATTRIBUTION}</footer>
    </aside>
  );
}

function Body({
  state,
  onActiveReleaseChange,
  onRetry,
}: {
  state: Exclude<WaybackState, { status: "off" }>;
  onActiveReleaseChange: (releaseId: number) => void;
  onRetry?: () => void;
}) {
  if (state.status === "loading") {
    return <p className="waybackEmpty">Cargando releases...</p>;
  }
  if (state.status === "error") {
    return (
      <div className="waybackError">
        <p>{state.message}</p>
        {onRetry ? (
          <button type="button" onClick={onRetry}>
            <RefreshCw size={12} aria-hidden /> Reintentar
          </button>
        ) : null}
      </div>
    );
  }
  if (state.status === "active" && state.releases.length === 0) {
    return <p className="waybackEmpty">No hay releases disponibles.</p>;
  }
  const { releases, activeReleaseId } = state;
  const activeIndex = releases.findIndex((release) => release.releaseId === activeReleaseId);
  const safeIndex = activeIndex >= 0 ? activeIndex : releases.length - 1;
  const activeRelease = releases[safeIndex];
  const canGoBack = safeIndex > 0;
  const canGoForward = safeIndex < releases.length - 1;

  return (
    <div>
      <div className="waybackDate">{formatReleaseYear(activeRelease)}</div>
      <div className="waybackSlider">
        <button
          type="button"
          onClick={() => onActiveReleaseChange(releases[safeIndex - 1].releaseId)}
          disabled={!canGoBack}
          aria-label="Release anterior"
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
          aria-label="Wayback release"
        />
        <button
          type="button"
          onClick={() => onActiveReleaseChange(releases[safeIndex + 1].releaseId)}
          disabled={!canGoForward}
          aria-label="Release siguiente"
        >
          <ChevronRight size={14} aria-hidden />
        </button>
      </div>
      <p className="waybackMeta">
        Maxar / Airbus {"·"} {releases.length} {releases.length === 1 ? "release" : "releases"} disponibles
      </p>
    </div>
  );
}
