import LegalDocument from "@/components/Legal/LegalDocument";

export const metadata = {
  title: "Politica de aportes | Faro",
  description: "Politica de revision privada de aportes en Faro.",
  alternates: { canonical: "/aportes/politica" },
};

export default function ContributionPolicyPage() {
  return (
    <LegalDocument
      eyebrow="Aportes"
      title="Politica de aportes"
      intro="Los aportes ayudan a encontrar fuentes, corregir datos y sumar contexto. No son publicaciones publicas ni acusaciones."
      updatedAt="24 de mayo de 2026"
      sections={[
        {
          title: "Revision privada",
          body: (
            <p>Todo aporte entra a una bandeja privada. No aparece automaticamente en el mapa, Explorer, informes, exports ni expedientes publicos.</p>
          ),
        },
        {
          title: "Que aceptamos",
          body: (
            <ul>
              <li>Links oficiales o publicos relevantes.</li>
              <li>Fotos, PDFs o documentos propios para revision.</li>
              <li>Correcciones de datos visibles.</li>
              <li>Contexto verificable sobre expedientes existentes.</li>
            </ul>
          ),
        },
        {
          title: "Que podemos rechazar",
          body: (
            <ul>
              <li>Acusaciones sin fuente o lenguaje no neutral.</li>
              <li>Material obtenido sin autorizacion o con datos personales innecesarios.</li>
              <li>Contenido manipulado, ofensivo, ilegal o imposible de verificar.</li>
              <li>Archivos que pongan en riesgo a terceros o al equipo de revision.</li>
            </ul>
          ),
        },
        {
          title: "Uso posterior",
          body: (
            <p>Si un aporte es util, Faro puede usarlo como pista interna, vincularlo a una carpeta de revision o convertirlo en una mejora de datos solo despues de verificar fuente, contexto, permiso y caveats.</p>
          ),
        },
        {
          title: "Que significa aprobado",
          body: (
            <p>Un aporte aprobado no significa verdadero, probado ni publicado. Significa que puede seguir dentro del flujo interno de revision, relacionarse con un expediente o alimentar una mejora controlada.</p>
          ),
        },
      ]}
    />
  );
}
