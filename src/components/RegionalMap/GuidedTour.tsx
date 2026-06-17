"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, HelpCircle, X } from "lucide-react";

import styles from "./RegionalMap.module.css";

export type GuidedTourStepId =
  | "modes"
  | "search"
  | "filters"
  | "map"
  | "legend"
  | "review-button"
  | "review-list"
  | "case-detail";

type Placement = "top" | "right" | "bottom" | "left" | "center";

interface GuidedTourStep {
  id: GuidedTourStepId;
  target?: string;
  placement: Placement;
  kicker: string;
  title: string;
  body: string;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Point {
  top: number;
  left: number;
}

const TOUR_STEPS: GuidedTourStep[] = [
  {
    id: "modes",
    target: '[data-tour="mode-nav-items"]',
    placement: "bottom",
    kicker: "Orientación",
    title: "Mapa y Explorer son dos ritmos de revisión.",
    body:
      "Mapa sirve para revisar expedientes con geometría oficial validada. Explorer sirve para buscar, comparar y abrir más expedientes sin depender del punto en el mapa.",
  },
  {
    id: "search",
    target: '[data-tour="search"]',
    placement: "right",
    kicker: "Buscar",
    title: "Buscá por dato oficial, no por sospecha.",
    body:
      "Podés escribir proveedor, organismo, número de expediente, fuente o señal. Las sugerencias ayudan a saltar directo a un caso o a un grupo de resultados.",
  },
  {
    id: "filters",
    target: '[data-tour="filters"]',
    placement: "right",
    kicker: "Filtrar",
    title: "Reducí el mapa sin perder trazabilidad.",
    body:
      "El rango de años, las señales y la prioridad solo ordenan dónde mirar primero. No cambian la evidencia ni convierten una pista en conclusión.",
  },
  {
    id: "map",
    target: '[data-tour="map-canvas"]',
    placement: "center",
    kicker: "Mapa",
    title: "Cada punto dibujado pasó por una compuerta de geometría.",
    body:
      "Faro muestra en el mapa únicamente casos con coordenadas oficiales validadas. Si un expediente no tiene geometría confiable, sigue disponible en Explorer y en exportaciones como brecha de datos.",
  },
  {
    id: "legend",
    target: '[data-tour="legend"]',
    placement: "left",
    kicker: "Referencias",
    title: "Los colores indican una prioridad de revisión.",
    body:
      "Rojo marca expedientes para revisar primero, naranja indica que existe alguna señal y celeste queda sin señal prioritaria en este recorte.",
  },
  {
    id: "review-button",
    target: '[data-tour="review-leads"]',
    placement: "right",
    kicker: "Pistas",
    title: "La lista de revisión reúne casos accionables.",
    body:
      "Este botón abre una bandeja corta con expedientes que merecen una segunda mirada según los filtros actuales.",
  },
  {
    id: "review-list",
    target: "#leads-panel",
    placement: "right",
    kicker: "Lista guiada",
    title: "Entrá desde una pista y conservá el contexto.",
    body:
      "Cada tarjeta explica por qué mirar ese expediente y abre su ficha. La explicación es una guía de trabajo, no una acusación.",
  },
  {
    id: "case-detail",
    placement: "center",
    kicker: "Expediente",
    title: "El paso final siempre es abrir la ficha.",
    body:
      "Al tocar un punto o una pista, el panel del expediente muestra fuente, montos, caveats, informe PDF y enlaces de evidencia para verificar antes de afirmar algo.",
  },
];

const CARD_WIDTH = 360;
const EDGE = 16;
const GAP = 14;

interface ButtonProps {
  onClick: () => void;
}

export function GuidedTourButton({ onClick }: ButtonProps) {
  return (
    <button
      type="button"
      className={styles.tourButton}
      onClick={onClick}
      aria-label="Abrir tutorial guiado"
      title="Tutorial"
      data-tour="tutorial-button"
    >
      <HelpCircle size={14} aria-hidden />
      <span>Tutorial</span>
    </button>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  onStepChange?: (stepId: GuidedTourStepId) => void;
}

export default function GuidedTour({ open, onClose, onStepChange }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetBox, setTargetBox] = useState<Box | null>(null);
  const [cardPoint, setCardPoint] = useState<Point | null>(null);
  const step = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  const updateGeometry = useCallback(() => {
    if (!open || !step) return;
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    const maxCardWidth = Math.min(CARD_WIDTH, viewport.width - EDGE * 2);

    if (!step.target) {
      setTargetBox(null);
      setCardPoint(centerCard(viewport, maxCardWidth));
      return;
    }

    const target = document.querySelector<HTMLElement>(step.target);
    if (!target || !isVisibleTarget(target)) {
      setTargetBox(null);
      setCardPoint(centerCard(viewport, maxCardWidth));
      return;
    }

    const rect = target.getBoundingClientRect();
    const paddedBox = padBox(
      {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
      viewport,
      step.id === "map" ? 0 : 8,
    );
    setTargetBox(paddedBox);
    setCardPoint(positionCard(paddedBox, step.placement, viewport, maxCardWidth));
  }, [open, step]);

  useEffect(() => {
    if (!open) {
      setStepIndex(0);
      setTargetBox(null);
      setCardPoint(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    onStepChange?.(step.id);
    updateGeometry();
    const frame = window.requestAnimationFrame(updateGeometry);
    const timeout = window.setTimeout(updateGeometry, 180);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [onStepChange, open, step.id, updateGeometry]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", updateGeometry);
    window.addEventListener("scroll", updateGeometry, true);
    return () => {
      window.removeEventListener("resize", updateGeometry);
      window.removeEventListener("scroll", updateGeometry, true);
    };
  }, [open, updateGeometry]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setStepIndex((current) => Math.min(TOUR_STEPS.length - 1, current + 1));
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setStepIndex((current) => Math.max(0, current - 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const progressLabel = useMemo(
    () => `${stepIndex + 1} de ${TOUR_STEPS.length}`,
    [stepIndex],
  );

  if (!open) return null;

  return (
    <div className={styles.tourLayer} role="dialog" aria-modal="true" aria-labelledby="guided-tour-title">
      {!targetBox && <div className={styles.tourScrim} aria-hidden />}
      {targetBox && (
        <div
          className={styles.tourSpotlight}
          style={{
            top: targetBox.top,
            left: targetBox.left,
            width: targetBox.width,
            height: targetBox.height,
          }}
          aria-hidden
        />
      )}
      <section
        className={styles.tourCard}
        style={{
          top: cardPoint?.top ?? "50%",
          left: cardPoint?.left ?? "50%",
        }}
      >
        <header className={styles.tourHeader}>
          <span className={styles.tourKicker}>{step.kicker}</span>
          <button type="button" className={styles.tourClose} onClick={onClose} aria-label="Cerrar tutorial">
            <X size={15} aria-hidden />
          </button>
        </header>
        <h2 id="guided-tour-title" className={styles.tourTitle}>
          {step.title}
        </h2>
        <p className={styles.tourBody}>{step.body}</p>
        <div className={styles.tourProgress} aria-label={`Paso ${progressLabel}`}>
          {TOUR_STEPS.map((item, index) => (
            <span
              key={item.id}
              className={`${styles.tourDot} ${index === stepIndex ? styles.tourDotActive : ""}`}
              aria-hidden
            />
          ))}
          <span className={styles.tourCount}>{progressLabel}</span>
        </div>
        <footer className={styles.tourActions}>
          <button
            type="button"
            className={styles.tourSecondary}
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            disabled={stepIndex === 0}
          >
            <ArrowLeft size={14} aria-hidden />
            Anterior
          </button>
          {isLast ? (
            <button type="button" className={styles.tourPrimary} onClick={onClose}>
              <CheckCircle2 size={14} aria-hidden />
              Terminar
            </button>
          ) : (
            <button
              type="button"
              className={styles.tourPrimary}
              onClick={() => setStepIndex((current) => Math.min(TOUR_STEPS.length - 1, current + 1))}
            >
              Siguiente
              <ArrowRight size={14} aria-hidden />
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

function isVisibleTarget(target: HTMLElement): boolean {
  const rect = target.getBoundingClientRect();
  const style = window.getComputedStyle(target);
  return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
}

function centerCard(viewport: { width: number; height: number }, width: number): Point {
  return {
    top: Math.max(EDGE, viewport.height / 2 - 160),
    left: Math.max(EDGE, viewport.width / 2 - width / 2),
  };
}

function padBox(
  box: Box,
  viewport: { width: number; height: number },
  padding: number,
): Box {
  const left = Math.max(EDGE, box.left - padding);
  const top = Math.max(EDGE, box.top - padding);
  const right = Math.min(viewport.width - EDGE, box.left + box.width + padding);
  const bottom = Math.min(viewport.height - EDGE, box.top + box.height + padding);
  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function positionCard(
  box: Box,
  placement: Placement,
  viewport: { width: number; height: number },
  width: number,
): Point {
  if (placement === "center") return centerCard(viewport, width);

  let top = box.top;
  let left = box.left;

  if (placement === "right") {
    left = box.left + box.width + GAP;
    top = box.top;
  }
  if (placement === "left") {
    left = box.left - width - GAP;
    top = box.top;
  }
  if (placement === "bottom") {
    left = box.left + box.width / 2 - width / 2;
    top = box.top + box.height + GAP;
  }
  if (placement === "top") {
    left = box.left + box.width / 2 - width / 2;
    top = box.top - 220 - GAP;
  }

  return {
    left: clamp(left, EDGE, viewport.width - width - EDGE),
    top: clamp(top, EDGE, viewport.height - 260 - EDGE),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
