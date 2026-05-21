import styles from "./RegionalMap.module.css";

export default function IntroSection() {
  return (
    <section className={styles.section} aria-labelledby="introHeading">
      <p className={styles.eyebrow} id="introHeading">
        Qué es Faro
      </p>
      <h2 className={styles.introTitle}>Las obras públicas, a la vista.</h2>
      <p className={styles.introBody}>
        Faro lee datos oficiales de Argentina y arma expedientes para seguir obras,
        contratos, organismos, proveedores y fuentes. No acusa: ilumina dónde mirar.
      </p>
    </section>
  );
}
