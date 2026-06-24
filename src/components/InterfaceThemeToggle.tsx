"use client";

import { Moon, Sun } from "lucide-react";

import styles from "./RegionalMap/RegionalMap.module.css";

export type InterfaceTheme = "dark" | "light";

export const INTERFACE_THEME_STORAGE_KEY = "faro-interface-theme";

interface Props {
  theme: InterfaceTheme;
  onThemeChange: (theme: InterfaceTheme) => void;
  className?: string;
}

export function readStoredInterfaceTheme(): InterfaceTheme | null {
  try {
    const stored = window.localStorage.getItem(INTERFACE_THEME_STORAGE_KEY);
    return stored === "dark" || stored === "light" ? stored : null;
  } catch {
    return null;
  }
}

export function persistInterfaceTheme(theme: InterfaceTheme) {
  try {
    window.localStorage.setItem(INTERFACE_THEME_STORAGE_KEY, theme);
  } catch {
    // Theme persistence is a convenience; platform views still render.
  }
}

export default function InterfaceThemeToggle({ theme, onThemeChange, className }: Props) {
  const rootClassName = [styles.interfaceThemeDock, className].filter(Boolean).join(" ");

  return (
    <div className={rootClassName} role="group" aria-label="Tema de interfaz">
      <button
        type="button"
        className={`${styles.interfaceThemeOption} ${theme === "light" ? styles.interfaceThemeOptionActive : ""}`}
        onClick={() => onThemeChange("light")}
        aria-label="Modo claro"
        aria-pressed={theme === "light"}
        title="Modo claro"
      >
        <Sun size={15} aria-hidden />
      </button>
      <button
        type="button"
        className={`${styles.interfaceThemeOption} ${theme === "dark" ? styles.interfaceThemeOptionActive : ""}`}
        onClick={() => onThemeChange("dark")}
        aria-label="Modo oscuro"
        aria-pressed={theme === "dark"}
        title="Modo oscuro"
      >
        <Moon size={15} aria-hidden />
      </button>
    </div>
  );
}
