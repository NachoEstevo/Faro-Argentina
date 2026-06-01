import Link from "next/link";

import ProductDocument from "@/components/ProductDocument";

export const metadata = {
  title: "Metodología | Faro",
  description: "Cómo Faro organiza expedientes, fuentes oficiales, receipts, señales, aportes privados y caveats.",
  alternates: { canonical: "/metodologia" },
};

export default function MethodologyPage() {
  return (
    <ProductDocument
      eyebrow="Metodología"
      title="Metodología de evidencia pública"
      intro="Faro organiza información oficial de obra pública argentina para que periodistas, investigadores, auditores y equipos institucionales puedan ver dónde mirar, por qué mirar y qué falta comprobar. No acusa ni reemplaza la verificación documental: ordena evidencia, límites y próximos pasos."
      actions={[
        { href: "/pais/AR?mode=explorer", label: "Abrir Explorer" },
        { href: "/datos", label: "Ver fuentes", variant: "secondary" },
      ]}
      summaryItems={[
        {
          title: "Evidencia oficial",
          text: "Cada expediente nace de una fuente identificada o de material privado que permanece en revisión.",
        },
        {
          title: "Receipts",
          text: "Conservamos identificadores, rutas, hashes y fecha de extracción para que el dato sea trazable.",
        },
        {
          title: "Caveats",
          text: "Cada señal explica qué puede leerse y qué no debería concluirse solo con ese registro.",
        },
        {
          title: "Carpetas",
          text: "Las hipótesis de trabajo se arman en espacios privados antes de cualquier publicación.",
        },
      ]}
      sections={[
        {
          title: "Qué es Faro",
          body: (
            <>
              <p>
                La información pública suele estar distribuida en datasets, PDFs, portales administrativos y documentos con
                distintos identificadores. Eso hace difícil seguir una obra, comparar contratos o saber qué falta pedir.
              </p>
              <p>
                Faro reduce esa fricción: junta registros oficiales, conserva el rastro técnico y los presenta como
                expedientes navegables. El objetivo no es cerrar una conclusión, sino acelerar el primer tramo de una
                investigación seria.
              </p>
            </>
          ),
        },
        {
          title: "Qué es un expediente",
          body: (
            <p>
              Un expediente de Faro es una unidad de lectura: puede representar una obra, contrato, adjudicación, registro de
              avance o contexto documental. Incluye organismo, proveedor, monto, fechas, ubicación si existe, fuente, receipts,
              señales y caveats. No es un expediente judicial ni administrativo completo.
            </p>
          ),
        },
        {
          title: "Cómo se arma un expediente",
          body: (
            <ol>
              <li>Tomamos un registro de una fuente oficial o documental identificada.</li>
              <li>Preservamos un recibo técnico con fuente, locator, ruta, hash y fecha de extracción.</li>
              <li>Normalizamos campos de investigación: organismo, proveedor, monto, fechas, ubicación y estado.</li>
              <li>Marcamos señales de revisión cuando el dato sugiere una pregunta útil.</li>
              <li>Agregamos caveats para separar evidencia disponible de hipótesis pendientes.</li>
            </ol>
          ),
        },
        {
          title: "Fuentes y trazabilidad",
          body: (
            <>
              <p>
                Faro trabaja con fuentes como CONTRAT.AR, Mapa de Inversiones Argentina y documentos judiciales o fiscales
                oficiales usados como contexto. Cuando una fuente no permite verificar una fila exacta, esa limitación queda
                visible.
              </p>
              <p>
                Los receipts no son decoración técnica: permiten reconstruir de dónde salió cada dato, qué snapshot lo produjo
                y qué nivel de verificación soporta.
              </p>
            </>
          ),
        },
        {
          title: "Mapa y geometría oficial",
          body: (
            <>
              <p>
                El mapa no dibuja todos los expedientes. Solo muestra puntos cuando hay geometría oficial validada y controles
                de calidad básicos. Faro no inventa, geocodifica ni corrige coordenadas a mano.
              </p>
              <p>
                Los expedientes sin punto confiable siguen disponibles en Explorer y exportaciones como brechas de datos. Para
                un investigador, saber que falta ubicación confiable también puede ser una pista.
              </p>
            </>
          ),
        },
        {
          title: "Señales y relaciones",
          body: (
            <>
              <p>
                Las señales ayudan a priorizar lectura: baja competencia, montos fuera de rango, proveedor recurrente, falta de
                geometría, contexto judicial o datos incompletos.
              </p>
              <p>
                Las relaciones se etiquetan por su origen: CUIT exacto, organismo, número de obra, nombre normalizado, contexto
                judicial o sugerencia del usuario. Una relación no prueba un caso; indica por qué vale la pena mirar dos piezas
                juntas.
              </p>
            </>
          ),
        },
        {
          title: "Aportes privados",
          body: (
            <p>
              Los aportes de usuarios entran como material privado en revisión. Pueden ayudar a corregir datos, sumar contexto,
              adjuntar fotos o sugerir relaciones, pero no se publican automáticamente ni se mezclan con evidencia oficial sin
              revisión, redacción, caveat y decisión editorial.
            </p>
          ),
        },
        {
          title: "Carpetas de investigación",
          body: (
            <p>
              Las carpetas son espacios privados para reunir expedientes, notas, fuentes manuales, tareas de verificación y
              próximos pasos. Funcionan como una mesa de trabajo: permiten armar una hipótesis sin convertirla en afirmación
              pública.
            </p>
          ),
        },
        {
          title: "Qué no afirma Faro",
          body: (
            <ul>
              <li>No afirma corrupción, fraude, delito ni responsabilidad personal.</li>
              <li>No toma una variación de monto como prueba por sí sola.</li>
              <li>No confirma pagos, avance físico ni calidad de ejecución si la fuente no lo prueba.</li>
              <li>No convierte aportes privados o sugerencias de usuarios en evidencia pública automática.</li>
              <li>No reemplaza expedientes administrativos, pedidos de información, entrevistas ni trabajo de campo.</li>
            </ul>
          ),
        },
        {
          title: "Cómo leer Faro",
          body: (
            <ol>
              <li>Entrá al mapa o Explorer para ubicar una obra, proveedor, organismo o señal.</li>
              <li>Abrí el expediente y revisá fuente, receipts, caveats y datos faltantes.</li>
              <li>Guardá los registros relevantes en una carpeta privada.</li>
              <li>Sumá notas, relaciones y tareas verificables antes de sacar conclusiones.</li>
              <li>Descargá el informe o ZIP como punto de partida para investigación externa.</li>
            </ol>
          ),
        },
      ]}
      closing={
        <>
          <p>
            La promesa de Faro es metodológica: hacer más fácil encontrar evidencia pública, entender sus límites y documentar
            qué falta verificar antes de publicar o escalar una investigación.
          </p>
          <Link href="/pais/AR?mode=explorer">Empezar por Explorer</Link>
        </>
      }
    />
  );
}
