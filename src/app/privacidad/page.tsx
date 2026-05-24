import LegalDocument from "@/components/Legal/LegalDocument";

export const metadata = {
  title: "Privacidad | Faro",
  description: "Politica de privacidad operativa de Faro.",
  alternates: { canonical: "/privacidad" },
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      eyebrow="Privacidad"
      title="Politica de privacidad"
      intro="Faro minimiza los datos personales que pide, separa la evidencia oficial de los aportes privados y explica que datos se procesan para operar el producto."
      updatedAt="24 de mayo de 2026"
      sections={[
        {
          title: "Que datos tratamos",
          body: (
            <>
              <p>Faro puede tratar datos de cuenta, carpetas privadas, notas de investigacion, aportes enviados a revision, archivos adjuntos, datos tecnicos de seguridad y comunicaciones voluntarias.</p>
              <p>Los expedientes publicos de Faro se construyen sobre fuentes oficiales, receipts y caveats. Los aportes de usuarios no se publican automaticamente.</p>
            </>
          ),
        },
        {
          title: "Para que usamos los datos",
          body: (
            <ul>
              <li>Operar cuentas, sesiones y carpetas privadas.</li>
              <li>Recibir, revisar y auditar aportes privados.</li>
              <li>Proteger el servicio, prevenir abuso y responder incidentes.</li>
              <li>Mejorar la calidad de datos, fuentes y experiencia de investigacion.</li>
            </ul>
          ),
        },
        {
          title: "Proveedores",
          body: (
            <p>Faro puede usar proveedores de infraestructura, autenticacion, base de datos, almacenamiento y hosting, incluyendo servicios como Vercel, Clerk, Neon y Cloudflare R2. Esos proveedores pueden procesar informacion tecnica necesaria para prestar el servicio. No vendemos datos personales.</p>
          ),
        },
        {
          title: "Derechos sobre datos personales",
          body: (
            <p>Las personas pueden solicitar acceso, rectificacion, actualizacion o supresion de sus datos personales. La AAIP informa que el acceso debe responderse en 10 dias corridos, y la rectificacion, actualizacion o supresion en 5 dias habiles. En Argentina, la Ley 25.326 exige informacion clara sobre finalidad, destinatarios y responsable del tratamiento.</p>
          ),
        },
        {
          title: "Marco legal pendiente de cierre",
          body: (
            <>
              <p>Antes de operar con usuarios reales, el equipo responsable debe definir responsable legal, contacto, inscripcion de bases cuando corresponda, transferencias internacionales, retencion y acuerdos con proveedores.</p>
              <p>
                Referencias:{" "}
                <a href="https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/texto">Ley 25.326</a>,{" "}
                <a href="https://www.argentina.gob.ar/aaip/datospersonales/derechos">derechos sobre datos personales</a> y{" "}
                <a href="https://www.argentina.gob.ar/aaip/politica-de-privacidad-de-la-aaip">politica de privacidad de la AAIP</a>.
              </p>
            </>
          ),
        },
        {
          title: "Contacto",
          body: (
            <p>Mientras Faro completa su alta operativa y revision legal, los pedidos de privacidad deben canalizarse por el contacto institucional definido por el equipo responsable del proyecto.</p>
          ),
        },
      ]}
    />
  );
}
