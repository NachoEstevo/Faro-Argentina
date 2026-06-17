import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./ProductDocument.module.css";

interface ProductSection {
  title: string;
  body: ReactNode;
}

interface SummaryItem {
  title: string;
  text: string;
}

interface DocumentAction {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
}

interface Props {
  eyebrow: string;
  title: string;
  intro: string;
  summaryItems?: SummaryItem[];
  actions?: DocumentAction[];
  sections: ProductSection[];
  closing?: ReactNode;
}

const navItems = [
  { href: "/metodologia", label: "Metodología" },
  { href: "/datos", label: "Datos" },
  { href: "/privacidad", label: "Privacidad" },
  { href: "/terminos", label: "Términos" },
  { href: "/seguridad", label: "Seguridad" },
] as const;

export default function ProductDocument({ eyebrow, title, intro, summaryItems, actions, sections, closing }: Props) {
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
          <header className={styles.hero}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{eyebrow}</p>
              <h1>{title}</h1>
              <p className={styles.intro}>{intro}</p>
              {actions && actions.length > 0 && (
                <div className={styles.actions} aria-label="Acciones principales">
                  {actions.map((action) => (
                    <Link
                      key={action.href}
                      href={action.href}
                      className={action.variant === "secondary" ? styles.secondaryAction : styles.primaryAction}
                    >
                      {action.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {summaryItems && summaryItems.length > 0 && (
              <div className={styles.summaryGrid} aria-label="Resumen metodológico">
                {summaryItems.map((item) => (
                  <div key={item.title} className={styles.summaryItem}>
                    <strong>{item.title}</strong>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            )}
          </header>
          <div className={styles.sections}>
            {sections.map((section) => (
              <section key={section.title} className={styles.section}>
                <h2>{section.title}</h2>
                <div className={styles.body}>{section.body}</div>
              </section>
            ))}
          </div>
          {closing && <footer className={styles.closing}>{closing}</footer>}
        </article>
      </div>
    </main>
  );
}
