"use client";

import Link from "next/link";
import {
  FileSearch,
  FolderOpen,
  Map as MapIcon,
  MessageSquarePlus,
  type LucideIcon,
} from "lucide-react";

import styles from "./PlatformModeNav.module.css";

export type PlatformMode = "map" | "explorer" | "investigations" | "aportes";
type PrimaryMode = Exclude<PlatformMode, "aportes">;
type PlatformModeNavVariant = "floating" | "floatingBar" | "header";

interface PlatformModeItem {
  mode: PrimaryMode;
  label: string;
  ariaLabel: string;
  Icon: LucideIcon;
}

const PRIMARY_MODES: PlatformModeItem[] = [
  { mode: "map", label: "Mapa", ariaLabel: "Abrir mapa", Icon: MapIcon },
  { mode: "explorer", label: "Explorar", ariaLabel: "Abrir explorador de expedientes", Icon: FileSearch },
  { mode: "investigations", label: "Carpetas", ariaLabel: "Abrir carpetas", Icon: FolderOpen },
];

interface Props {
  activeMode: PlatformMode;
  onModeChange?: (mode: PlatformMode) => void;
  hrefForMode?: (mode: PlatformMode) => string;
  variant?: PlatformModeNavVariant;
  showSecondaryAction?: boolean;
  className?: string;
}

export function buildPlatformModeHref(mode: PlatformMode, countryCode: "AR" = "AR") {
  if (mode === "map") return `/pais/${countryCode}`;
  return `/pais/${countryCode}?mode=${mode}`;
}

export default function PlatformModeNav({
  activeMode,
  onModeChange,
  hrefForMode,
  variant = "header",
  showSecondaryAction = true,
  className,
}: Props) {
  const rootClassName = [styles.root, styles[variant], className].filter(Boolean).join(" ");

  return (
    <nav className={rootClassName} aria-label="Navegación principal de Faro">
      <div className={styles.primary} role="group" aria-label="Modo de trabajo">
        {PRIMARY_MODES.map((item) => (
          <ModeControl
            key={item.mode}
            mode={item.mode}
            label={item.label}
            ariaLabel={item.ariaLabel}
            Icon={item.Icon}
            active={activeMode === item.mode}
            className={styles.item}
            activeClassName={styles.active}
            onModeChange={onModeChange}
            hrefForMode={hrefForMode}
          />
        ))}
      </div>
      {showSecondaryAction && (
        <ModeControl
          mode="aportes"
          label="Aportar"
          ariaLabel="Enviar aporte a revisión"
          Icon={MessageSquarePlus}
          active={activeMode === "aportes"}
          className={styles.secondary}
          activeClassName={styles.secondaryActive}
          onModeChange={onModeChange}
          hrefForMode={hrefForMode}
        />
      )}
    </nav>
  );
}

function ModeControl({
  mode,
  label,
  ariaLabel,
  Icon,
  active,
  className,
  activeClassName,
  onModeChange,
  hrefForMode,
}: {
  mode: PlatformMode;
  label: string;
  ariaLabel: string;
  Icon: LucideIcon;
  active: boolean;
  className: string;
  activeClassName: string;
  onModeChange?: (mode: PlatformMode) => void;
  hrefForMode?: (mode: PlatformMode) => string;
}) {
  const controlClassName = `${className} ${active ? activeClassName : ""}`;
  const content = (
    <>
      <Icon size={13} aria-hidden />
      <span>{label}</span>
    </>
  );

  if (onModeChange) {
    return (
      <button
        type="button"
        className={controlClassName}
        onClick={() => onModeChange(mode)}
        aria-label={ariaLabel}
        aria-pressed={active}
      >
        {content}
      </button>
    );
  }

  const href = hrefForMode?.(mode);
  if (href && !active) {
    return (
      <Link className={controlClassName} href={href} aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={controlClassName}
      aria-label={ariaLabel}
      aria-pressed={active}
    >
      {content}
    </button>
  );
}
