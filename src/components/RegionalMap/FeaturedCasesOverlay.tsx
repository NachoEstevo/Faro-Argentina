"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useMap } from "react-leaflet";
import { ArrowRight, MapPin, Scale } from "lucide-react";

import {
  FEATURED_CASES,
  type FeaturedCase,
} from "@/data/featuredCases";
import styles from "./FeaturedCasesOverlay.module.css";

interface Projection {
  dotX: number;
  dotY: number;
  cardX: number;
  cardY: number;
  /** End of the leader line, snapped to the card corner closest to the dot. */
  lineEndX: number;
  lineEndY: number;
  visible: boolean;
}

const CARD_WIDTH = 220;
const CARD_HEIGHT = 130;
const MARGIN = 12;

export default function FeaturedCasesOverlay() {
  const router = useRouter();
  const map = useMap();
  const [projections, setProjections] = useState<Record<string, Projection>>({});
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Resolve the portal host on mount. Rendering through a portal puts the
  // dots/cards into a sibling host (z-index above the vignette overlay) so
  // they aren't dimmed by the dark gradients the landing draws on top of
  // the leaflet container.
  useEffect(() => {
    setPortalEl(document.getElementById("faro-featured-host"));
  }, []);

  useEffect(() => {
    const recompute = () => {
      rafRef.current = null;
      const size = map.getSize();
      setContainerSize({ width: size.x, height: size.y });
      const next: Record<string, Projection> = {};
      for (const fc of FEATURED_CASES) {
        const dot = map.latLngToContainerPoint([fc.marker.lat, fc.marker.lon]);
        const card = map.latLngToContainerPoint([fc.callout.lat, fc.callout.lon]);
        // Card translate places its top-left at (card.x, card.y). The
        // leader line ends at the card's geometric center so the line
        // reads as pointing TO the card as a whole, not biting a corner.
        const lineEndX = card.x + CARD_WIDTH / 2;
        const lineEndY = card.y + CARD_HEIGHT / 2;
        const visible =
          dot.x > -MARGIN &&
          dot.y > -MARGIN &&
          dot.x < size.x + MARGIN &&
          dot.y < size.y + MARGIN &&
          card.x > -CARD_WIDTH &&
          card.y > -CARD_HEIGHT &&
          card.x < size.x + CARD_WIDTH &&
          card.y < size.y + CARD_HEIGHT;
        next[fc.caseId] = {
          dotX: dot.x,
          dotY: dot.y,
          cardX: card.x,
          cardY: card.y,
          lineEndX,
          lineEndY,
          visible,
        };
      }
      setProjections(next);
    };

    const schedule = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(recompute);
    };

    recompute();

    map.on("move", schedule);
    map.on("zoom", schedule);
    map.on("viewreset", schedule);
    map.on("resize", schedule);

    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      map.off("move", schedule);
      map.off("zoom", schedule);
      map.off("viewreset", schedule);
      map.off("resize", schedule);
    };
  }, [map]);

  const sortedCases = useMemo(
    () =>
      FEATURED_CASES.map((fc, index) => ({ fc, index })),
    [],
  );

  const handleOpen = (fc: FeaturedCase) => {
    const params = new URLSearchParams({ case: fc.caseId });
    if (fc.variant === "documentary") params.set("mode", "explorer");
    router.push(`/pais/${fc.countryCode}?${params.toString()}`);
  };

  if (!portalEl) return null;

  return createPortal(
    <div className={styles.host} aria-hidden={containerSize.width === 0}>
      <svg
        className={styles.lines}
        width={containerSize.width}
        height={containerSize.height}
        aria-hidden
      >
        {sortedCases.map(({ fc }) => {
          const p = projections[fc.caseId];
          if (!p || !p.visible) return null;
          return (
            <line
              key={`line-${fc.caseId}`}
              x1={p.dotX}
              y1={p.dotY}
              x2={p.lineEndX}
              y2={p.lineEndY}
              className={`${styles.line} ${styles[`line_${fc.variant}`]}`}
            />
          );
        })}
      </svg>

      {sortedCases.map(({ fc, index }) => {
        const p = projections[fc.caseId];
        if (!p) return null;
        const delay = 200 + index * 80;
        // The dot is split in two: the positioner uses `transform: translate`
        // to place it at the projected pixel; the inner glyph runs the pulse
        // animation (which also uses `transform: scale`). Without the split,
        // the keyframes would overwrite the positioning transform and the
        // dot would collapse to the parent's top-left corner.
        return (
          <span
            key={`dot-${fc.caseId}`}
            className={`${styles.dotPositioner} ${p.visible ? "" : styles.hidden}`}
            style={{ transform: `translate(${p.dotX}px, ${p.dotY}px)` }}
            aria-hidden
          >
            <span
              className={`${styles.dot} ${styles[`dot_${fc.variant}`]}`}
              style={{ animationDelay: `${delay}ms` }}
            />
          </span>
        );
      })}

      {sortedCases.map(({ fc, index }) => {
        const p = projections[fc.caseId];
        if (!p) return null;
        const delay = 200 + index * 80;
        const Icon = fc.variant === "geo" ? MapPin : Scale;
        const actionLabel =
          fc.variant === "geo" ? "Ver en el mapa" : "Leer expediente";
        const ariaLabel = `Abrir ${fc.title} en ${
          fc.variant === "geo" ? "el mapa" : "el expediente"
        } de ${fc.countryCode}`;
        return (
          <button
            key={`card-${fc.caseId}`}
            type="button"
            className={`${styles.card} ${p.visible ? "" : styles.hidden}`}
            style={{
              transform: `translate(${p.cardX}px, ${p.cardY}px)`,
              animationDelay: `${delay}ms`,
            }}
            onClick={() => handleOpen(fc)}
            aria-label={ariaLabel}
          >
            <span className={styles.kicker}>
              <Icon size={11} aria-hidden /> {fc.kicker}
            </span>
            <strong className={styles.title}>{fc.title}</strong>
            {fc.tags.length > 0 && (
              <span className={styles.tagRow}>
                {fc.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </span>
            )}
            <span className={styles.blurb}>{fc.blurb}</span>
            <span className={styles.action}>
              {actionLabel} <ArrowRight size={12} aria-hidden />
            </span>
          </button>
        );
      })}
    </div>,
    portalEl,
  );
}
