import { SignIn } from "@clerk/nextjs";

import styles from "../../auth.module.css";

export default function SignInPage() {
  return (
    <main className={styles.authShell}>
      <section className={styles.authContext}>
        <p className={styles.eyebrow}>Cuenta Faro</p>
        <h1>Entrá a tus carpetas privadas.</h1>
        <p>
          Guardá investigaciones, expedientes, notas y fuentes sin publicar nada. El mapa y el explorador siguen abiertos.
        </p>
        <ul className={styles.bullets}>
          <li>Carpetas por usuario.</li>
          <li>Sincronización segura entre dispositivos.</li>
          <li>Preparado para revisión interna y aportes privados.</li>
        </ul>
      </section>
      <section className={styles.authPanel} aria-label="Iniciar sesión">
        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
      </section>
    </main>
  );
}
