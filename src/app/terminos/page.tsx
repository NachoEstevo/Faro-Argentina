import LegalDocument from "@/components/Legal/LegalDocument";

export const metadata = {
  title: "Términos | Faro",
  description: "Términos de uso operativos de Faro.",
  alternates: { canonical: "/terminos" },
};

export default function TermsPage() {
  return (
    <LegalDocument
      eyebrow="Términos"
      title="Términos de uso"
      intro="Faro es una herramienta de investigación cívica. Muestra dónde mirar, qué evidencia oficial existe y qué falta verificar."
      updatedAt="24 de mayo de 2026"
      sections={[
        {
          title: "Regla principal",
          body: (
            <p>Faro no acusa. Faro no determina culpabilidad, irregularidad, delito, fraude ni responsabilidad legal. Las señales son pistas documentales para orientar revisión humana.</p>
          ),
        },
        {
          title: "Uso permitido",
          body: (
            <ul>
              <li>Explorar expedientes, fuentes y datos oficiales.</li>
              <li>Descargar evidencia y preparar revisión periodística, institucional o académica.</li>
              <li>Enviar aportes verificables para revisión privada.</li>
            </ul>
          ),
        },
        {
          title: "Uso no permitido",
          body: (
            <ul>
              <li>Subir información falsa, manipulada o presentada como verificada sin respaldo.</li>
              <li>Usar Faro para hostigar, doxxear o acusar personas sin evidencia.</li>
              <li>Intentar acceder a aportes o áreas internas de otras personas.</li>
              <li>Publicar material privado de terceros sin autorización o base legal.</li>
            </ul>
          ),
        },
        {
          title: "Limitaciones",
          body: (
            <p>Los datos pueden contener errores de fuente, desactualizaciones, faltantes o cambios posteriores. Cada conclusión requiere revisión de documentos originales, contexto y asesoramiento profesional cuando corresponda.</p>
          ),
        },
        {
          title: "Uso de aportes",
          body: (
            <p>Al enviar un aporte, autorizás a Faro a almacenarlo, revisarlo, verificarlo, redactarlo, descartarlo o usarlo como pista interna. Esa autorización no obliga a publicarlo ni convierte el aporte en evidencia oficial.</p>
          ),
        },
      ]}
    />
  );
}
