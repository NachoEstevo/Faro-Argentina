import type { ComponentType, SVGProps } from "react";
import { BookOpen, ChevronRight, Download, Flag, ShieldCheck } from "lucide-react";
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
  { label: "Privacidad y seguridad", icon: ShieldCheck, href: "/privacidad" },
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
          <a key={label} className={styles.settingRow} href={href} {...externalLinkProps(href)}>
            <Icon size={16} aria-hidden className={styles.settingIcon} />
            <span className={styles.settingLabel}>{label}</span>
            <ChevronRight size={14} aria-hidden className={styles.settingChevron} />
          </a>
        ))}
      </div>
    </section>
  );
}

function externalLinkProps(href: string | undefined) {
  if (!href || href.startsWith("/")) return {};
  return { target: "_blank", rel: "noreferrer" };
}
