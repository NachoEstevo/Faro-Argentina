import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./LegalDocument.module.css";

interface LegalSection {
  title: string;
  body: ReactNode;
}

interface Props {
  eyebrow: string;
  title: string;
  intro: string;
  updatedAt: string;
  sections: LegalSection[];
}

const navItems = [
  { href: "/metodologia", label: "Metodología" },
  { href: "/datos", label: "Datos" },
  { href: "/privacidad", label: "Privacidad" },
  { href: "/terminos", label: "Términos" },
  { href: "/seguridad", label: "Seguridad" },
  { href: "/aportes/politica", label: "Política de aportes" },
] as const;

export default function LegalDocument({ eyebrow, title, intro, updatedAt, sections }: Props) {
  return (
    <main className={styles.shell}>
      <div className={styles.frame}>
        <aside className={styles.sidebar} aria-label="Documentos legales">
          <Link href="/" className={styles.brandLink}>
            Faro
          </Link>
          <nav className={styles.nav} aria-label="Politicas">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={styles.navLink}>
                {item.label}
              </Link>
            ))}
          </nav>
          <p className={styles.notice}>
            Estos textos son una base operativa de producto. Deben ser revisados por asesoría legal antes de usarse como contrato definitivo.
          </p>
        </aside>
        <article className={styles.document}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1>{title}</h1>
          <p className={styles.intro}>{intro}</p>
          <p className={styles.updated}>Ultima actualizacion: {updatedAt}</p>
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
