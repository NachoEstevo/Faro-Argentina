import type { ComponentType, SVGProps } from "react";
import { BookOpen, ChevronRight, Download, Flag } from "lucide-react";
import styles from "./RegionalMap.module.css";

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

interface ResourceRow {
  label: string;
  icon: IconComponent;
  href?: string;
}

const ROWS: ResourceRow[] = [
  { label: "Metodología", icon: BookOpen, href: "https://github.com/NachoEstevo/Faro#metodologia" },
  { label: "Datos abiertos", icon: Download, href: "https://github.com/NachoEstevo/Faro/tree/main/data" },
  { label: "Reportar un error", icon: Flag, href: "https://github.com/NachoEstevo/Faro/issues/new" },
];

export default function ResourcesSection() {
  return (
    <section className={styles.section} aria-labelledby="resHeading">
      <p className={styles.eyebrow} id="resHeading">
        Recursos
      </p>
      <div className={styles.settingsList}>
        {ROWS.map(({ label, icon: Icon, href }) => (
          <a
            key={label}
            className={styles.settingRow}
            href={href}
            target="_blank"
            rel="noreferrer"
          >
            <Icon size={16} aria-hidden className={styles.settingIcon} />
            <span className={styles.settingLabel}>{label}</span>
            <ChevronRight size={14} aria-hidden className={styles.settingChevron} />
          </a>
        ))}
      </div>
    </section>
  );
}
