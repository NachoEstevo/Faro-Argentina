import LegalDocument from "@/components/Legal/LegalDocument";

export const metadata = {
  title: "Política de aportes | Faro",
  description: "Política de revisión privada de aportes en Faro.",
  alternates: { canonical: "/aportes/politica" },
};

export default function ContributionPolicyPage() {
  return (
    <LegalDocument
      eyebrow="Aportes"
      title="Política de aportes"
      intro="Los aportes ayudan a encontrar fuentes, corregir datos y sumar contexto. No son publicaciones públicas ni acusaciones."
      updatedAt="25 de mayo de 2026"
      sections={[
        {
          title: "Revisión privada",
          body: (
            <p>Todo aporte entra a una bandeja privada. No aparece automáticamente en el mapa, Explorer, informes, exports ni expedientes públicos.</p>
          ),
        },
        {
          title: "Modo sin contacto",
          body: (
            <p>Si elegís enviar sin contacto, Faro no pide nombre ni email para ese aporte. Ese modo reduce datos pedidos, pero no garantiza anonimato absoluto: red, navegador, infraestructura, requerimientos legales o archivos subidos pueden conservar datos técnicos.</p>
          ),
        },
        {
          title: "Archivos y metadatos",
          body: (
            <p>En aportes sin contacto, Faro puede guardar nombres de archivo neutralizados en el manifiesto interno. El contenido del archivo puede conservar metadatos EXIF o PDF, texto visible, ubicación embebida o datos de terceros. Revisá el material antes de enviarlo.</p>
          ),
        },
        {
          title: "Qué aceptamos",
          body: (
            <ul>
              <li>Links oficiales o públicos relevantes.</li>
              <li>Fotos, PDFs o documentos propios para revisión.</li>
              <li>Correcciones de datos visibles.</li>
              <li>Contexto verificable sobre expedientes existentes.</li>
            </ul>
          ),
        },
        {
          title: "Qué podemos rechazar",
          body: (
            <ul>
              <li>Acusaciones sin fuente o lenguaje no neutral.</li>
              <li>Material obtenido sin autorización o con datos personales innecesarios.</li>
              <li>Contenido manipulado, ofensivo, ilegal o imposible de verificar.</li>
              <li>Archivos que pongan en riesgo a terceros o al equipo de revisión.</li>
            </ul>
          ),
        },
        {
          title: "Uso posterior",
          body: (
            <p>Si un aporte es útil, Faro puede usarlo como pista interna o convertirlo en una mejora de datos solo después de verificar fuente, contexto, permiso y caveats.</p>
          ),
        },
        {
          title: "Qué significa aprobado",
          body: (
            <p>Un aporte aprobado no significa verdadero, probado ni publicado. Significa que puede seguir dentro del flujo interno de revisión, relacionarse con un expediente o alimentar una mejora controlada.</p>
          ),
        },
        {
          title: "Retención y descarte",
          body: (
            <p>El equipo debe conservar aportes solo durante el tiempo necesario para revisión, auditoría, seguridad o trazabilidad. El descarte debe impedir que el material siga avanzando en producto salvo que exista una razón legal, técnica o de seguridad para conservar un registro limitado.</p>
          ),
        },
      ]}
    />
  );
}
