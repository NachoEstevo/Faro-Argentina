"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent, useCallback, useEffect } from "react";
import styles from "./RegionalMap.module.css";

interface Props {
  dismissed: boolean;
  ctaHref: string;
  entering: boolean;
  onEnterStart: () => void;
}

export default function WelcomeOverlay({ dismissed, ctaHref, entering, onEnterStart }: Props) {
  const router = useRouter();

  useEffect(() => {
    router.prefetch(ctaHref);
  }, [ctaHref, router]);

  const handleEnterMap = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (entering) return;

      onEnterStart();
      router.prefetch(ctaHref);

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.setTimeout(() => {
        router.push(ctaHref);
      }, prefersReducedMotion ? 40 : 720);
    },
    [ctaHref, entering, onEnterStart, router],
  );

  if (dismissed) return null;
  const overlayClassName = `${styles.welcomeOverlay} ${entering ? styles.welcomeOverlayEntering : ""}`;

  return (
    <div className={overlayClassName} aria-hidden="false" aria-busy={entering}>
      <p className={styles.welcomeKicker}>Evidencia oficial de obra pública</p>
      <h1 className={styles.welcomeHeadline}>Faro</h1>
      <p className={styles.welcomeCopy}>
        Mapa, contratos y expedientes públicos para ver qué existe, dónde mirar y qué falta verificar.
      </p>
      <Link
        className={styles.welcomeCTA}
        href={ctaHref}
        onClick={handleEnterMap}
        aria-disabled={entering}
      >
        <span className={styles.welcomeCTALabel}>{entering ? "Preparando mapa" : "Entrar al mapa"}</span>
        <span className={styles.welcomeCTAArrow} aria-hidden>
          <ArrowRight size={18} strokeWidth={1.9} />
        </span>
      </Link>
    </div>
  );
}
