"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { FeatureCollection, Geometry } from "geojson";

import styles from "./RegionalMap.module.css";
import FloatingModeToggle from "./FloatingModeToggle";
import MobileHeader from "./MobileHeader";
import RegionalSidebar from "./RegionalSidebar";
import TrustStrip from "./TrustStrip";
import WelcomeOverlay from "./WelcomeOverlay";

const CountryMap = dynamic(() => import("./CountryMap"), {
  ssr: false,
  loading: () => <div className={styles.leafletHost} aria-hidden />,
});

interface Props {
  geojson: FeatureCollection<Geometry, { code: "AR" | "PE" | "CL"; name: string }>;
  totalCases: number;
  lastUpdated: string;
  syncLabel: string;
}

const WELCOME_STORAGE_KEY = "faro-welcome-dismissed";

export default function RegionalMap({ geojson, totalCases, lastUpdated, syncLabel }: Props) {
  const [overlayDismissed, setOverlayDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.sessionStorage.getItem(WELCOME_STORAGE_KEY);
    setOverlayDismissed(stored === "1");
  }, []);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userToggledSidebar, setUserToggledSidebar] = useState(false);

  useEffect(() => {
    if (userToggledSidebar) return;
    const apply = () => {
      const w = window.innerWidth;
      if (w >= 901 && w <= 1180) {
        setSidebarCollapsed(true);
      } else if (w > 1180) {
        setSidebarCollapsed(false);
      }
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [userToggledSidebar]);

  const handleCTA = useCallback(() => {
    setOverlayDismissed(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(WELCOME_STORAGE_KEY, "1");
    }
  }, []);

  const handleSidebarToggle = useCallback(() => {
    setUserToggledSidebar(true);
    setSidebarCollapsed((value) => !value);
  }, []);

  const handleOpenMobileMenu = useCallback(() => {
    setMobileMenuOpen(true);
  }, []);

  const handleCloseMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const shellClasses = [
    styles.shell,
    sidebarCollapsed ? styles.shellCollapsed : "",
    mobileMenuOpen ? styles.shellMobileMenuOpen : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className={shellClasses}>
      <div className={styles.mapArea}>
        <div className={styles.leafletHost}>
          <CountryMap geojson={geojson} />
        </div>
      </div>
      <MobileHeader onOpenMenu={handleOpenMobileMenu} />
      <RegionalSidebar
        syncLabel={syncLabel}
        collapsed={sidebarCollapsed}
        onToggle={handleSidebarToggle}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={handleCloseMobileMenu}
      />
      {mobileMenuOpen && (
        <button
          type="button"
          className={styles.mobileBackdrop}
          onClick={handleCloseMobileMenu}
          aria-label="Cerrar menú"
        />
      )}
      <div className={styles.overlayLayer}>
        <div className={styles.vignetteTop} aria-hidden />
        <div className={styles.vignetteSides} aria-hidden />
        <FloatingModeToggle />
        <WelcomeOverlay dismissed={overlayDismissed} onCTA={handleCTA} />
        <TrustStrip totalCases={totalCases} lastUpdated={lastUpdated} />
      </div>
    </main>
  );
}
