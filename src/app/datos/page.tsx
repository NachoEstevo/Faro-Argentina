import Link from "next/link";

import ProductDocument from "@/components/ProductDocument";

export const metadata = {
  title: "Datos | Faro",
  description: "Fuentes, recibos, límites y criterios de publicación de datos en Faro.",
  alternates: { canonical: "/datos" },
};

export default function DataPage() {
  return (
    <ProductDocument
      eyebrow="Datos abiertos"
      title="Qué datos usa Faro"
      intro="Faro trabaja con fuentes oficiales y documentales de Argentina. El valor no está solo en juntar registros: está en conservar recibos, explicar límites y mostrar cuándo falta información confiable."
      sections={[
        {
          title: "Fuentes principales",
          body: (
            <ul>
              <li>CONTRAT.AR contratos y obras, para procesos, adjudicaciones, proveedores y organismos.</li>
              <li>Mapa de Inversiones Argentina, para obras con avance, montos, estado y fuente declarada.</li>
              <li>Documentos judiciales o fiscales oficiales, usados como contexto y no como conclusión automática.</li>
              <li>Aportes privados, solo como material en revisión interna hasta que se valide su utilidad.</li>
            </ul>
          ),
        },
        {
          title: "Qué conserva cada expediente",
          body: (
            <p>
              Cuando una fuente lo permite, Faro conserva identificador, organismo, proveedor, monto, fechas, localidad,
              provincia, enlace a fuente, ruta del dato crudo, hash, fecha de extracción, caveats y señales de revisión.
            </p>
          ),
        },
        {
          title: "Geometría y mapa",
          body: (
            <>
              <p>
                El mapa exige geometría oficial validada. Faro no inventa coordenadas, no corrige puntos a mano y no dibuja
                expedientes con ubicación dudosa.
              </p>
              <p>
                Cuando falta un punto confiable, el expediente queda en Explorer y en las exportaciones como una brecha de
                datos. Esa ausencia también puede orientar una investigación.
              </p>
            </>
          ),
        },
        {
          title: "Exportación",
          body: (
            <p>
              Los datos visibles pueden exportarse para auditoría, revisión documental o armado de carpetas de investigación.
              El export principal de Argentina está disponible en{" "}
              <Link href="/api/export?country=AR">/api/export?country=AR</Link>.
            </p>
          ),
        },
        {
          title: "Límites importantes",
          body: (
            <ul>
              <li>Una página de dataset no siempre es una página directa del expediente.</li>
              <li>Un contrato oficial no confirma por sí solo pago, avance físico ni calidad de ejecución.</li>
              <li>Una señal de revisión no es una conclusión automática.</li>
              <li>Los aportes de usuarios no se publican sin revisión.</li>
            </ul>
          ),
        },
      ]}
    />
  );
}
