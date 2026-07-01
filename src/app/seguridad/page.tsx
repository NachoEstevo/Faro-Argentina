import LegalDocument from "@/components/Legal/LegalDocument";

export const metadata = {
  title: "Seguridad y anonimato | Faro",
  description: "Política operativa de seguridad y anonimato de Faro.",
  alternates: { canonical: "/seguridad" },
};

export default function SecurityPage() {
  return (
    <LegalDocument
      eyebrow="Seguridad"
      title="Seguridad y anonimato"
      intro="Faro ofrece modos de uso con distintos niveles de identificación. La promesa debe ser clara: podemos reducir datos pedidos, pero no prometer anonimato absoluto en una aplicación web."
      updatedAt="25 de mayo de 2026"
      sections={[
        {
          title: "Modos de uso",
          body: (
            <ul>
              <li>Exploración pública: no requiere cuenta.</li>
              <li>Cuenta privada: permite operar áreas internas y usa autenticación.</li>
              <li>Aporte sin contacto: no pide nombre ni email.</li>
              <li>Aporte con contacto: permite que el equipo pida contexto adicional.</li>
            </ul>
          ),
        },
        {
          title: "Límite del anonimato",
          body: (
            <p>Si elegís enviar un aporte sin contacto, Faro no te pide nombre ni email para ese envío. Aun así, tu navegador, red, proveedor de internet, hosting, seguridad de infraestructura o requerimientos legales pueden generar o revelar metadatos técnicos. Ningún sistema web puede garantizar anonimato absoluto.</p>
          ),
        },
        {
          title: "Practicas de proteccion",
          body: (
            <ul>
              <li>Los aportes quedan en revisión privada.</li>
              <li>Los archivos no se publican como adjuntos públicos automáticamente.</li>
              <li>Los archivos privados deben servirse por accesos limitados, no por URLs públicas permanentes.</li>
              <li>Los accesos administrativos deben estar limitados a roles internos.</li>
              <li>La evidencia oficial se mantiene separada del material aportado por usuarios.</li>
            </ul>
          ),
        },
        {
          title: "Metadatos de archivos",
          body: (
            <p>Faro puede neutralizar el nombre de archivo que guarda en su manifiesto interno para aportes sin contacto. Eso no elimina metadatos dentro del archivo original, como EXIF, autor de PDF, ubicación embebida, miniaturas o texto visible. El equipo revisor debe revisar ese material antes de usarlo.</p>
          ),
        },
        {
          title: "Recomendacion para aportes sensibles",
          body: (
            <p>No incluyas datos personales innecesarios. Revisá nombres de archivo, capturas, documentos y metadatos antes de subirlos. Si tu situacion implica riesgo personal, legal o laboral, buscá asesoramiento especializado antes de enviar material.</p>
          ),
        },
      ]}
    />
  );
}
