import Link from "next/link";

import ProductDocument from "@/components/ProductDocument";
import {
  argentinaContractDatasets,
  argentinaHistoricalJudicialDatasets,
  argentinaInvestmentMapDataset,
  argentinaWorkDataset,
  dataSpineCoverage,
  sourceCatalogEntries,
} from "@/lib/caseRepository";
import {
  buildSourceCandidatePipeline,
  labelSourceCandidateStatus,
} from "@/lib/data/sourceCandidatePipeline";

export const metadata = {
  title: "Datos | Faro",
  description: "Fuentes, recibos, límites y criterios de publicación de datos en Faro.",
  alternates: { canonical: "/datos" },
};

export default function DataPage() {
  const sourceRows = buildSourceRows();
  const candidatePipeline = buildSourceCandidatePipeline();
  const argentinaCoverage = dataSpineCoverage.countries.AR;
  return (
    <ProductDocument
      eyebrow="Datos abiertos"
      title="Qué datos usa Faro"
      intro="Faro trabaja con fuentes oficiales y documentales de Argentina. El valor no está solo en juntar registros: está en conservar recibos, explicar límites y mostrar cuándo falta información confiable."
      summaryItems={[
        {
          title: `${argentinaCoverage.caseFiles.toLocaleString("es-AR")} expedientes`,
          text: "Disponibles para Explorer, expedientes y exportaciones según la línea de datos versionada.",
        },
        {
          title: `${argentinaCoverage.caseFilesWithCoordinates.toLocaleString("es-AR")} con coordenadas`,
          text: "No todos se dibujan en mapa: el gate exige geometría oficial validada y receipts adecuados.",
        },
        {
          title: `${argentinaCoverage.caseFilesWithReceipts.toLocaleString("es-AR")} con receipts`,
          text: "Cada receipt conserva fuente, locator, hash, raw path, record id y fecha de extracción cuando existe.",
        },
        {
          title: `${argentinaCoverage.sourcesWithSnapshots}/${argentinaCoverage.totalSources} fuentes`,
          text: "Fuentes del catálogo con snapshot integrado en el corpus actual de Argentina.",
        },
      ]}
      sections={[
        {
          title: "Cómo leer la cobertura",
          body: (
            <>
              <p>
                Faro no trata todas las fuentes como si probaran lo mismo. Un procedimiento ayuda a entender licitación,
                un contrato documenta adjudicación o vínculo administrativo, una obra con avance puede aportar ejecución
                declarada y una fuente judicial solo agrega contexto documental.
              </p>
              <p>
                Por eso la matriz separa etapa, casos, filas crudas y elegibilidad de mapa. Un expediente puede ser muy útil
                para Explorer o para una carpeta aunque no sea seguro dibujarlo en el mapa.
              </p>
            </>
          ),
        },
        {
          title: "Fuentes principales",
          body: (
            <div style={{ display: "grid", gap: 10 }}>
              {sourceRows.map((source) => (
                <article
                  key={source.sourceId}
                  style={{
                    display: "grid",
                    gap: 8,
                    padding: 14,
                    border: "1px solid #d8e0ea",
                    borderRadius: 8,
                    background: "rgba(255, 255, 255, 0.74)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start" }}>
                    <div>
                      <strong>{source.name}</strong>
                      <p style={{ margin: "4px 0 0" }}>{source.agency}</p>
                    </div>
                    <span style={{ color: "#145b86", fontSize: 12, fontWeight: 700 }}>{source.stage}</span>
                  </div>
                  <p style={{ margin: 0 }}>
                    {source.cases.toLocaleString("es-AR")} expedientes · {source.rawRows.toLocaleString("es-AR")} filas
                    crudas · {source.mapReadyCases.toLocaleString("es-AR")} map-ready · formato {source.format}
                  </p>
                  <p style={{ margin: 0 }}>
                    Campos clave: {source.keyFields.length > 0 ? source.keyFields.slice(0, 4).join(", ") : "sin campos clave declarados"}.
                  </p>
                  <p style={{ margin: 0 }}>
                    Límite: {source.caveat}
                  </p>
                </article>
              ))}
            </div>
          ),
        },
        {
          title: "Matriz fuente-campo-afirmación",
          body: (
            <ul>
              <li>Procedimientos y ofertas permiten revisar competencia, fechas y organismos; no prueban ejecución.</li>
              <li>Contratos permiten revisar adjudicación, proveedor y monto; no prueban pago ni avance físico por sí solos.</li>
              <li>Mapa de Inversiones puede aportar avance declarado y presupuesto; si falta geometría confiable queda como brecha.</li>
              <li>Documentos judiciales o fiscales oficiales son contexto; no convierten otros contratos en conclusiones automáticas.</li>
              <li>Aportes privados solo sirven para revisión interna hasta que exista curación explícita.</li>
            </ul>
          ),
        },
        {
          title: "Próximas fuentes candidatas",
          body: (
            <div style={{ display: "grid", gap: 12 }}>
              <p style={{ margin: 0 }}>
                Una fuente candidata no entra a Faro por volumen ni por intuición. Entra cuando puede conservar receipt,
                llave de cruce oficial, caveat y una afirmación concreta que no sobrepase sus datos.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
                {candidatePipeline.candidates.map((candidate) => (
                  <article
                    key={candidate.id}
                    style={{
                      display: "grid",
                      gap: 8,
                      padding: 14,
                      border: "1px solid #d8e0ea",
                      borderRadius: 8,
                      background: "rgba(255, 255, 255, 0.74)",
                    }}
                  >
                    <span style={{ color: "#145b86", fontSize: 12, fontWeight: 700 }}>
                      {labelSourceCandidateStatus(candidate.status)}
                    </span>
                    <strong>{candidate.name}</strong>
                    <p style={{ margin: 0 }}>{candidate.evidenceLane}</p>
                    <p style={{ margin: 0 }}>Puede aportar: {candidate.canSupport}</p>
                    <p style={{ margin: 0 }}>Límite: {candidate.caveat}</p>
                    <p style={{ margin: 0 }}>Próximo paso: {candidate.nextStep}</p>
                    <Link href={candidate.officialUrl}>Abrir fuente oficial</Link>
                  </article>
                ))}
              </div>
              <ul>
                {candidatePipeline.admissionRules.map((rule) => <li key={rule}>{rule}</li>)}
              </ul>
            </div>
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

function buildSourceRows() {
  const statsBySource = new Map<string, { rawRows: number; cases: number; mapReadyCases: number }>();
  for (const dataset of [
    argentinaWorkDataset,
    ...argentinaContractDatasets,
    argentinaInvestmentMapDataset,
    ...argentinaHistoricalJudicialDatasets,
  ]) {
    const current = statsBySource.get(dataset.source.sourceId) ?? { rawRows: 0, cases: 0, mapReadyCases: 0 };
    current.rawRows += dataset.stats.rawRows;
    current.cases += dataset.stats.caseFiles;
    current.mapReadyCases += dataset.stats.mapReadyCases;
    statsBySource.set(dataset.source.sourceId, current);
  }

  return sourceCatalogEntries
    .filter((source) => source.countryCode === "AR")
    .map((source) => {
      const stats = statsBySource.get(source.sourceId) ?? { rawRows: 0, cases: 0, mapReadyCases: 0 };
      return {
        sourceId: source.sourceId,
        name: source.name,
        agency: source.agency,
        stage: labelSourceStage(source.category),
        format: source.format,
        keyFields: source.keyFields,
        caveat: source.caveats[0] ?? "Revisar alcance de fuente antes de usarla como evidencia.",
        rawRows: stats.rawRows,
        cases: stats.cases,
        mapReadyCases: stats.mapReadyCases,
      };
    })
    .filter((source) => source.cases > 0 || source.rawRows > 0)
    .sort((left, right) => right.cases - left.cases || left.name.localeCompare(right.name, "es"));
}

function labelSourceStage(category: string): string {
  if (category.includes("procurement")) return "Contratación";
  if (category.includes("supplier")) return "Proveedor";
  if (category.includes("progress")) return "Ejecución declarada";
  if (category.includes("public_works")) return "Obra pública";
  if (category.includes("geo")) return "Geometría";
  if (category.includes("judicial")) return "Contexto documental";
  if (category.includes("fx") || category.includes("currency")) return "Conversión";
  return "Fuente";
}
