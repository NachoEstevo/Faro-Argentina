import type { ComponentType, SVGProps } from "react";
import { BookOpen, ChevronRight, Download, ShieldCheck } from "lucide-react";
import styles from "./RegionalMap.module.css";

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

interface ResourceRow {
  label: string;
  icon: IconComponent;
  href?: string;
}

const ROWS: ResourceRow[] = [
  { label: "Metodología", icon: BookOpen, href: "/metodologia" },
  { label: "Datos abiertos", icon: Download, href: "/datos" },
  { label: "Privacidad y seguridad", icon: ShieldCheck, href: "/privacidad" },
];

export default function ResourcesSection() {
  return (
    <section className={styles.section} aria-labelledby="resHeading">
      <p className={styles.eyebrow} id="resHeading">
        Recursos
      </p>
      <div className={styles.settingsList}>
        {ROWS.map(({ label, icon: Icon, href }) => (
          <a key={label} className={styles.settingRow} href={href}>
            <Icon size={16} aria-hidden className={styles.settingIcon} />
            <span className={styles.settingLabel}>{label}</span>
            <ChevronRight size={14} aria-hidden className={styles.settingChevron} />
          </a>
        ))}
      </div>
    </section>
  );
}
