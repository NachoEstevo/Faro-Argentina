import styles from "./RegionalMap.module.css";

export default function IntroSection() {
  return (
    <section className={styles.section} aria-labelledby="introHeading">
      <p className={styles.eyebrow} id="introHeading">
        Qué es Faro
      </p>
      <h2 className={styles.introTitle}>Las obras públicas, a la vista.</h2>
      <p className={styles.introBody}>
        Faro lee los datos oficiales de Argentina, Chile y Perú y marca las obras
        que conviene revisar. No acusa: ilumina dónde mirar y entrega las pruebas.
      </p>
    </section>
  );
}
