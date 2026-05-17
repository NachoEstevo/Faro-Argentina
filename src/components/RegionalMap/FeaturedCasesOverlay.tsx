"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  visible: boolean;
}

const CARD_WIDTH = 220;
const CARD_HEIGHT = 96;
const MARGIN = 12;

export default function FeaturedCasesOverlay() {
  const router = useRouter();
  const map = useMap();
  const [projections, setProjections] = useState<Record<string, Projection>>({});
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const recompute = () => {
      rafRef.current = null;
      const size = map.getSize();
      setContainerSize({ width: size.x, height: size.y });
      const next: Record<string, Projection> = {};
      for (const fc of FEATURED_CASES) {
        const dot = map.latLngToContainerPoint([fc.marker.lat, fc.marker.lon]);
        const card = map.latLngToContainerPoint([fc.callout.lat, fc.callout.lon]);
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

  return (
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
              x2={p.cardX}
              y2={p.cardY}
              className={`${styles.line} ${styles[`line_${fc.variant}`]}`}
            />
          );
        })}
      </svg>

      {sortedCases.map(({ fc, index }) => {
        const p = projections[fc.caseId];
        if (!p) return null;
        const delay = 200 + index * 80;
        return (
          <span
            key={`dot-${fc.caseId}`}
            className={`${styles.dot} ${styles[`dot_${fc.variant}`]} ${
              p.visible ? "" : styles.hidden
            }`}
            style={{
              transform: `translate(${p.dotX}px, ${p.dotY}px)`,
              animationDelay: `${delay}ms`,
            }}
            aria-hidden
          />
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
            className={`${styles.card} ${styles[`card_${fc.variant}`]} ${
              p.visible ? "" : styles.hidden
            }`}
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
            <span className={styles.blurb}>{fc.blurb}</span>
            <span className={styles.action}>
              {actionLabel} <ArrowRight size={12} aria-hidden />
            </span>
          </button>
        );
      })}
    </div>
  );
}
