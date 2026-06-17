import { SignIn } from "@clerk/nextjs";

import styles from "../../auth.module.css";

export default function SignInPage() {
  return (
    <main className={styles.authShell}>
      <section className={styles.authContext}>
        <p className={styles.eyebrow}>Cuenta Faro</p>
        <h1>Entrá a tu cuenta Faro.</h1>
        <p>
          Accedé a las áreas internas que requieren identidad. El mapa y el explorador siguen abiertos.
        </p>
        <ul className={styles.bullets}>
          <li>Sesión privada por usuario.</li>
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
