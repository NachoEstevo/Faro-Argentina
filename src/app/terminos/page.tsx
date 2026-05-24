import LegalDocument from "@/components/Legal/LegalDocument";

export const metadata = {
  title: "Terminos | Faro",
  description: "Terminos de uso operativos de Faro.",
  alternates: { canonical: "/terminos" },
};

export default function TermsPage() {
  return (
    <LegalDocument
      eyebrow="Terminos"
      title="Terminos de uso"
      intro="Faro es una herramienta de investigacion civica. Muestra donde mirar, que evidencia oficial existe y que falta verificar."
      updatedAt="24 de mayo de 2026"
      sections={[
        {
          title: "Regla principal",
          body: (
            <p>Faro no acusa. Faro no determina culpabilidad, irregularidad, delito, fraude ni responsabilidad legal. Las señales son pistas documentales para orientar revision humana.</p>
          ),
        },
        {
          title: "Uso permitido",
          body: (
            <ul>
              <li>Explorar expedientes, fuentes y datos oficiales.</li>
              <li>Guardar carpetas privadas de investigacion.</li>
              <li>Descargar evidencia y preparar revision periodistica, institucional o academica.</li>
              <li>Enviar aportes verificables para revision privada.</li>
            </ul>
          ),
        },
        {
          title: "Uso no permitido",
          body: (
            <ul>
              <li>Subir informacion falsa, manipulada o presentada como verificada sin respaldo.</li>
              <li>Usar Faro para hostigar, doxxear o acusar personas sin evidencia.</li>
              <li>Intentar acceder a carpetas, aportes o areas internas de otras personas.</li>
              <li>Publicar material privado de terceros sin autorizacion o base legal.</li>
            </ul>
          ),
        },
        {
          title: "Limitaciones",
          body: (
            <p>Los datos pueden contener errores de fuente, desactualizaciones, faltantes o cambios posteriores. Cada conclusion requiere revision de documentos originales, contexto y asesoramiento profesional cuando corresponda.</p>
          ),
        },
        {
          title: "Uso de aportes",
          body: (
            <p>Al enviar un aporte, autorizas a Faro a almacenarlo, revisarlo, verificarlo, redactarlo, descartarlo o usarlo como pista interna. Esa autorizacion no obliga a publicarlo ni convierte el aporte en evidencia oficial.</p>
          ),
        },
      ]}
    />
  );
}
