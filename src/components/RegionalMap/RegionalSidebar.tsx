"use client";

import styles from "./RegionalMap.module.css";
import SidebarBrand from "./SidebarBrand";
import IntroSection from "./IntroSection";
import HowItWorksSection from "./HowItWorksSection";
import ResourcesSection from "./ResourcesSection";
import SyncFooter from "./SyncFooter";

interface Props {
  syncLabel: string;
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function RegionalSidebar({
  syncLabel,
  collapsed,
  onToggle,
  mobileOpen,
  onCloseMobile,
}: Props) {
  const classes = [
    styles.sidebar,
    collapsed ? styles.sidebarCollapsed : "",
    mobileOpen ? styles.sidebarMobileOpen : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <aside className={classes} aria-label="Información de Faro">
      <SidebarBrand
        collapsed={collapsed}
        onToggle={mobileOpen ? onCloseMobile : onToggle}
        toggleVariant={mobileOpen ? "close" : "collapse"}
      />
      {!collapsed && (
        <>
          <IntroSection />
          <HowItWorksSection />
          <ResourcesSection />
          <div className={styles.spacer} />
          <SyncFooter label={syncLabel} />
        </>
      )}
    </aside>
  );
}
