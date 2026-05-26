import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./ProductDocument.module.css";

interface ProductSection {
  title: string;
  body: ReactNode;
}

interface Props {
  eyebrow: string;
  title: string;
  intro: string;
  sections: ProductSection[];
}

const navItems = [
  { href: "/metodologia", label: "Metodología" },
  { href: "/datos", label: "Datos" },
  { href: "/privacidad", label: "Privacidad" },
  { href: "/pais/AR?mode=aportes", label: "Aportes" },
] as const;

export default function ProductDocument({ eyebrow, title, intro, sections }: Props) {
  return (
    <main className={styles.shell}>
      <div className={styles.frame}>
        <aside className={styles.sidebar} aria-label="Documentos del proyecto">
          <Link href="/" className={styles.brandLink}>
            Faro
          </Link>
          <nav className={styles.nav} aria-label="Recursos de Faro">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={styles.navLink}>
                {item.label}
              </Link>
            ))}
          </nav>
          <p className={styles.notice}>
            Faro ordena evidencia oficial y pistas de revisión. No reemplaza la verificación documental ni el trabajo de
            campo.
          </p>
        </aside>
        <article className={styles.document}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1>{title}</h1>
          <p className={styles.intro}>{intro}</p>
          <div className={styles.sections}>
            {sections.map((section) => (
              <section key={section.title} className={styles.section}>
                <h2>{section.title}</h2>
                <div className={styles.body}>{section.body}</div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}
