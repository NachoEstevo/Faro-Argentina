import LegalDocument from "@/components/Legal/LegalDocument";

export const metadata = {
  title: "Seguridad y anonimato | Faro",
  description: "Politica operativa de seguridad y anonimato de Faro.",
  alternates: { canonical: "/seguridad" },
};

export default function SecurityPage() {
  return (
    <LegalDocument
      eyebrow="Seguridad"
      title="Seguridad y anonimato"
      intro="Faro ofrece modos de uso con distintos niveles de identificacion. La promesa debe ser clara: podemos reducir datos pedidos, pero no prometer anonimato absoluto en una aplicacion web."
      updatedAt="24 de mayo de 2026"
      sections={[
        {
          title: "Modos de uso",
          body: (
            <ul>
              <li>Exploracion publica: no requiere cuenta.</li>
              <li>Cuenta privada: permite carpetas persistentes y usa autenticacion.</li>
              <li>Aporte sin contacto: no pide nombre ni email.</li>
              <li>Aporte con contacto: permite que el equipo pida contexto adicional.</li>
            </ul>
          ),
        },
        {
          title: "Limite del anonimato",
          body: (
            <p>Si elegis enviar un aporte sin contacto, Faro no te pide nombre ni email para ese envio. Aun asi, tu navegador, red, proveedor de internet, hosting, seguridad de infraestructura o requerimientos legales pueden generar o revelar metadata tecnica. Ningun sistema web puede garantizar anonimato absoluto.</p>
          ),
        },
        {
          title: "Practicas de proteccion",
          body: (
            <ul>
              <li>Los aportes quedan en revision privada.</li>
              <li>Los archivos no se publican como adjuntos publicos automaticamente.</li>
              <li>Las carpetas privadas requieren cuenta.</li>
              <li>Los accesos administrativos deben estar limitados a roles internos.</li>
              <li>La evidencia oficial se mantiene separada del material aportado por usuarios.</li>
            </ul>
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
