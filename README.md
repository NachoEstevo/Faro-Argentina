# Faro

**El poder deja rastros. Faro los ordena.**

Faro convierte datos oficiales de gasto publico en expedientes verificables para
seguir obras, contratos, organismos, proveedores y fuentes sin saltar a
conclusiones.

Faro no acusa. Faro muestra donde mirar, por que mirar ahi, que fuente oficial
lo sostiene y que falta verificar.

![Faro landing](docs/assets/faro-landing.jpg)

_Entrada a Faro: una capa publica y directa antes de entrar al mapa o al
Explorer._

![Faro Explorer](docs/assets/faro-explorer.jpg)

_Explorer investigador: busqueda por pais, pivots, receipts, fuentes oficiales y
expedientes exportables._

## Por Que Existe

La informacion sobre gasto publico existe, pero esta dispersa en portales,
CSVs, XLSX, APIs, PDFs y datasets con campos inconsistentes. Para verificar una
pista hay que encontrar la fuente, entender el registro, cruzar identificadores,
revisar montos, ubicar territorio, guardar hashes y explicar los caveats.

Ese trabajo es lento para periodistas, auditores y equipos tecnicos. Para la
mayoria de los ciudadanos es casi inaccesible.

Faro reduce esa distancia:

```text
datos oficiales -> pista -> expediente -> fuente oficial -> evidence pack
```

## Que Hace

Tocas un punto del mapa o una fila del Explorer y Faro arma un expediente con:

- resumen del caso en lenguaje claro;
- organismo, proveedor, monto, fecha y territorio cuando existen;
- senales investigativas sin lenguaje acusatorio;
- fuente oficial publica para abrir en el portal original;
- receipts reproducibles con raw path, snapshot hash, row hash y parser version;
- caveats sobre lo que la fuente no prueba;
- siguientes pasos de verificacion;
- informe imprimible y export JSON tecnico.

## Lo Que Lo Hace Diferente

Faro no es un mapa decorativo ni una tabla cruda. Su valor esta en la
trazabilidad:

- **Fuente oficial primero:** la UI abre paginas oficiales de catalogo o detalle;
  los links directos a datasets quedan para reproducibilidad tecnica.
- **Receipts verificables:** cada caso conserva hashes, paths y version de parser.
- **Explorer antes que sospecha:** se puede seguir el rastro por pais, fuente,
  organismo, proveedor, senal o identificador.
- **Mapa con prudencia:** solo se dibuja geometria validada; lo debil queda como
  brecha de datos, no como punto inventado.
- **Caveats visibles:** contratos y adjudicaciones no se presentan como pagos si
  no hay una fuente que lo pruebe.

## Demo Para Hackathon

El recorrido recomendado para mostrar Faro:

1. Abrir la landing y explicar la regla: **Faro no acusa**.
2. Entrar al Explorer y buscar por pais.
3. Usar pivots por organismo, proveedor o senal.
4. Abrir un expediente.
5. Mostrar la fuente oficial publica.
6. Mostrar receipt, hash y raw path.
7. Abrir el informe imprimible o exportar JSON tecnico.

El momento clave no es "mira un punto en el mapa". Es:

```text
esta pista -> esta fuente oficial -> este receipt -> este paquete verificable
```

## Estado Actual

Corpus versionado en el repo:

- `17` datasets;
- `1.867` expedientes;
- `4.510` receipts;
- `24` raw files verificados;
- `0` errores en el data spine actual.

Cobertura por pais:

| Pais | Expedientes | Map-ready | Nota |
| --- | ---: | ---: | --- |
| Argentina | 558 | 411 | Obras, contratos y contexto judicial verificable. |
| Peru | 609 | 550 | Contratos OECE, historicos seleccionados y presupuesto MEF. |
| Chile | 700 | 292 | Procesos ChileCompra/OCDS; mapa como referencia comunal caveateada. |

Chile conserva evidencia administrativa para una parte de los registros y la
dibuja como referencia comunal oficial del comprador. No es sitio exacto de
ejecucion y no habilita comparacion satelital automatica.

## Superficies Del Producto

### Explorer

El Explorer es el modo principal de investigacion. Permite buscar por pais,
proveedor, organismo, fuente, receipt, senal o texto libre, y combinar pivots
sin depender del mapa.

### Mapa

El mapa orienta territorialmente solo cuando la geometria pasa controles de
calidad. Coordenadas placeholder, duplicadas, fuera de bounds, sospechosas o
marcadas como malas quedan fuera del mapa y siguen disponibles en
Explorer/export.

### Expediente

El expediente es la unidad central: explica por que el caso aparece, que fuente
lo sostiene, que caveats aplican y que deberia verificarse despues.

### Evidence Pack

El export tecnico conserva el rastro reproducible: caso, receipt, fuentes
relacionadas, senales, caveats, hashes y pasos de verificacion.

## Fuentes Iniciales

Argentina:

- CONTRAT.AR obras, contratos, procedimientos, ofertas, ubicacion geografica y
  actas de apertura;
- SIPRO proveedores;
- CIJ Causa Vialidad;
- MPF Causa Vialidad;
- MPF Cuadernos / La Camarita;
- Contratar historico obras como fuente auxiliar.

Peru:

- OECE contratos;
- OECE contratos historicos seleccionados 2018-2024;
- OECE OCDS;
- MEF presupuesto y ejecucion de gasto diario.

Chile:

- Mercado Publico API;
- ChileCompra / OCDS procesos, con muestra controlada 2019-2026;
- DIPRES pagos como siguiente cruce previsto.

## Stack

- Next.js 16;
- React 19;
- TypeScript;
- Leaflet / React Leaflet;
- datos generados y versionados en el repo;
- sin base de datos runtime para la demo publica.

## Estructura

```text
src/lib/caseRepository.ts              # fachada de datos para UI y APIs
src/lib/data/                          # normalizacion, senales, receipts, explorer
src/components/                        # landing, mapa, explorer, inspector, expediente
src/app/api/                           # endpoints thin para casos, leads, export, readiness
scripts/                               # fetch/build/verify de datos oficiales
data/official/                         # snapshots oficiales locales
data/sources/source-catalog.json       # catalogo de fuentes oficiales
src/data/                              # artefactos generados para la app
docs/                                  # documentacion publica e interna
```

## Correr Localmente

```bash
npm install
npm run dev
```

Por defecto:

```text
http://127.0.0.1:3002
```

Si el puerto esta ocupado, Next puede ofrecer otro puerto local.

## Verificacion

```bash
npm run data:verify
npm run data:geo-report
npm run data:quality-report
npm test
npm run typecheck
npm run build
```

`npm run data:verify` valida catalogo, raw hashes, snapshot profiles y receipts.
`npm run data:geo-report` valida elegibilidad de mapa. `npm run
data:quality-report` resume cobertura por pais, fuente, monto, proveedor,
geometria, senales y blockers.

No usar fetch de datos como reparacion rutinaria:

```bash
npm run data:fetch:all
```

Ese comando refresca fuentes externas y puede cambiar la linea base de
evidencia.

## Documentacion

Para jueces, colaboradores y futuras sesiones:

- [Mapa de documentacion](docs/README.md)
- [Contexto de producto](docs/product/faro-product-context.md)
- [Onboarding tecnico](docs/agent-onboarding.md)
- [Deployment](docs/deployment.md)

Los handoffs siguen en `docs/handoffs/` y los planes largos viven en
`docs/internal/`. La vitrina publica debe ser este README y `docs/README.md`.

## Descripcion Corta

Faro convierte datos oficiales de gasto publico en expedientes verificables con
Explorer, mapa prudente, fuentes oficiales, receipts, caveats e informes
exportables.
