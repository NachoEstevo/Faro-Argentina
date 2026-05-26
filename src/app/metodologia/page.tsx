import ProductDocument from "@/components/ProductDocument";

export const metadata = {
  title: "Metodología | Faro",
  description: "Cómo Faro organiza expedientes, fuentes oficiales, señales y caveats.",
  alternates: { canonical: "/metodologia" },
};

export default function MethodologyPage() {
  return (
    <ProductDocument
      eyebrow="Metodología"
      title="Cómo trabaja Faro"
      intro="Faro convierte datos oficiales dispersos en expedientes navegables para investigar obra pública en Argentina. No acusa ni reemplaza la verificación: muestra dónde mirar, por qué mirar y qué falta comprobar."
      sections={[
        {
          title: "Qué es Faro",
          body: (
            <p>
              Faro es una plataforma de investigación cívica. Reúne obras, contratos, organismos, proveedores, fuentes y notas
              de cautela en un flujo simple: mapa, Explorer, expediente, carpeta e informe descargable.
            </p>
          ),
        },
        {
          title: "Cómo se arma un expediente",
          body: (
            <ol>
              <li>Se toma un registro de una fuente oficial o documental identificada.</li>
              <li>Se conserva un recibo técnico: fuente, ruta de archivo, identificador, hash y fecha de extracción.</li>
              <li>Se normalizan campos útiles: organismo, proveedor, monto, fechas, ubicación y estado documental.</li>
              <li>Se agregan caveats para explicar qué se puede leer y qué no se puede concluir con ese dato.</li>
            </ol>
          ),
        },
        {
          title: "Mapa y geometría",
          body: (
            <>
              <p>
                El mapa no dibuja todos los expedientes. Solo muestra puntos cuando hay geometría oficial validada y pasa
                controles de calidad.
              </p>
              <p>
                Los expedientes sin punto confiable siguen disponibles en Explorer, porque una brecha de datos también puede
                ser relevante para investigar.
              </p>
            </>
          ),
        },
        {
          title: "Señales de revisión",
          body: (
            <p>
              Las señales ayudan a priorizar lectura: baja competencia, montos fuera de rango, proveedor recurrente, falta de
              geometría, contexto judicial o datos incompletos. Una señal no es una conclusión; es una razón para revisar mejor.
            </p>
          ),
        },
        {
          title: "Qué no afirma Faro",
          body: (
            <ul>
              <li>No afirma responsabilidades personales ni hechos no verificados.</li>
              <li>No toma una variación de monto como prueba por sí sola.</li>
              <li>No convierte aportes privados en publicaciones automáticas.</li>
              <li>No reemplaza expedientes administrativos, pedidos de información, entrevistas ni trabajo de campo.</li>
            </ul>
          ),
        },
        {
          title: "Cómo usarlo",
          body: (
            <p>
              Para una investigación concreta, empezá por el mapa o Explorer, abrí un expediente, revisá fuente y caveats,
              guardalo en una carpeta, comparalo con casos relacionados y descargá el informe antes de avanzar con verificación
              externa.
            </p>
          ),
        },
      ]}
    />
  );
}
