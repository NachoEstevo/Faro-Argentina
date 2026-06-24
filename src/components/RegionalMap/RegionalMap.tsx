"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { FeatureCollection, Geometry } from "geojson";

import styles from "./RegionalMap.module.css";
import MobileHeader from "./MobileHeader";
import RegionalSidebar from "./RegionalSidebar";
import TrustStrip from "./TrustStrip";
import WelcomeOverlay from "./WelcomeOverlay";
import InterfaceThemeToggle, {
  persistInterfaceTheme,
  readStoredInterfaceTheme,
  type InterfaceTheme,
} from "../InterfaceThemeToggle";

const CountryMap = dynamic(() => import("./CountryMap"), {
  ssr: false,
  loading: () => <div className={styles.leafletHost} aria-hidden />,
});

interface Props {
  geojson: FeatureCollection<Geometry, { code: "AR"; name: string }>;
  totalCases: number;
  syncLabel: string;
}

export default function RegionalMap({ geojson, totalCases, syncLabel }: Props) {
  const overlayDismissed = false;
  const [enteringMap, setEnteringMap] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userToggledSidebar, setUserToggledSidebar] = useState(false);
  const [interfaceTheme, setInterfaceThemeState] = useState<InterfaceTheme>("dark");

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

  useEffect(() => {
    const stored = readStoredInterfaceTheme();
    if (stored) setInterfaceThemeState(stored);
  }, []);

  const setInterfaceTheme = useCallback((theme: InterfaceTheme) => {
    setInterfaceThemeState(theme);
    persistInterfaceTheme(theme);
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

  const showSidebar = overlayDismissed;
  const shellClasses = [
    styles.shell,
    !overlayDismissed ? styles.shellWelcome : "",
    enteringMap ? styles.shellEnteringMap : "",
    showSidebar && sidebarCollapsed ? styles.shellCollapsed : "",
    mobileMenuOpen ? styles.shellMobileMenuOpen : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className={shellClasses} data-platform-theme={interfaceTheme}>
      <div className={styles.mapArea}>
        <div className={styles.leafletHost}>
          <CountryMap geojson={geojson} />
        </div>
      </div>
      {showSidebar && <MobileHeader onOpenMenu={handleOpenMobileMenu} />}
      {showSidebar && (
        <RegionalSidebar
          syncLabel={syncLabel}
          collapsed={sidebarCollapsed}
          onToggle={handleSidebarToggle}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={handleCloseMobileMenu}
        />
      )}
      {showSidebar && mobileMenuOpen && (
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
        <InterfaceThemeToggle
          theme={interfaceTheme}
          onThemeChange={setInterfaceTheme}
          className={styles.interfaceThemeDockHome}
        />
        <TrustStrip totalCases={totalCases} />
      </div>
      <div className={styles.welcomeLayer}>
        <WelcomeOverlay
          dismissed={overlayDismissed}
          ctaHref="/pais/AR"
          entering={enteringMap}
          onEnterStart={() => setEnteringMap(true)}
        />
      </div>
    </main>
  );
}
