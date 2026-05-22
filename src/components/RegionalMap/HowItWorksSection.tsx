import styles from "./RegionalMap.module.css";

const STEPS = [
  {
    num: "01",
    title: "Abrí Argentina",
    desc: "Entrá al mapa o a Explorar para revisar expedientes argentinos.",
  },
  {
    num: "02",
    title: "Explorá el mapa",
    desc: "Cada punto es una obra pública. El color te dice si hay algo para revisar.",
  },
  {
    num: "03",
    title: "Abrí los detalles",
    desc: "Hacé clic en cualquier obra para ver los datos oficiales y el enlace a la fuente.",
  },
];

export default function HowItWorksSection() {
  return (
    <section className={styles.section} aria-labelledby="howHeading">
      <p className={styles.eyebrow} id="howHeading">
        Cómo funciona
      </p>
      <div className={styles.steps}>
        {STEPS.map((step) => (
          <div key={step.num} className={styles.stepRow}>
            <span className={styles.stepNum}>{step.num}</span>
            <div className={styles.stepBody}>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDesc}>{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
