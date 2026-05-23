import { SignUp } from "@clerk/nextjs";

import styles from "../../auth.module.css";

export default function SignUpPage() {
  return (
    <main className={styles.authShell}>
      <section className={styles.authContext}>
        <p className={styles.eyebrow}>Cuenta Faro</p>
        <h1>Creá un espacio privado de investigación.</h1>
        <p>
          Reuní expedientes, fuentes y notas en carpetas privadas. Faro no publica hipótesis ni acusa.
        </p>
        <ul className={styles.bullets}>
          <li>Workspace personal para periodistas e investigadores.</li>
          <li>Datos estructurados listos para exportar.</li>
          <li>Base para análisis asistido cuando conectemos el proveedor de AI.</li>
        </ul>
      </section>
      <section className={styles.authPanel} aria-label="Crear cuenta">
        <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
      </section>
    </main>
  );
}
