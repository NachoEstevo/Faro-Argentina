# Faro

**Faro convierte datos publicos en expedientes verificables para seguir el dinero, mirar el territorio y exigir rendicion de cuentas.**

Faro no acusa. Faro muestra donde mirar, por que mirar ahi y con que evidencia.

Es un mapa y scanner investigativo del dinero publico: toma fuentes oficiales dispersas y las transforma en casos navegables con obras, compras, proveedores, organismos, montos, fechas, receipts, caveats y export de evidencia.

![Faro landing](docs/assets/faro-landing.jpg)

_Entrada a Faro: presentacion del observatorio antes de abrir el mapa._

![Faro Explorer](docs/assets/faro-explorer.jpg)

_Explorer investigador: busqueda, pivots y expedientes verificables a partir de fuentes oficiales._

## El Problema

La informacion sobre gasto publico suele estar repartida entre portales, CSVs, APIs, XLSX, PDFs y datasets con nombres inconsistentes. Para pasar de una sospecha a una verificacion hay que encontrar la fuente, entender el registro, cruzar IDs, revisar montos, ubicar territorio y guardar evidencia reproducible.

Ese trabajo es lento incluso para periodistas, auditores y equipos tecnicos. Para ciudadanos es casi inaccesible.

Faro busca reducir ese tiempo:

```text
mapa o scanner -> pista -> expediente -> evidencia -> export -> accion
```

## La Promesa

Tocas un punto del mapa o una fila del scanner y Faro arma un expediente verificable:

- que es el caso;
- que organismo interviene;
- que proveedor aparece, si existe;
- que monto y fechas figuran;
- por que Faro lo muestra como pista;
- que fuente oficial lo sostiene;
- que receipts y hashes permiten reproducirlo;
- que falta verificar antes de concluir;
- que paquete de evidencia se puede descargar.

## Para Quien Es

- **Ciudadanos:** entienden el gasto publico sin leer bases de datos.
- **Periodistas:** encuentran pistas y descargan evidencia para investigar.
- **Auditores y watchdogs:** revisan patrones, brechas y trazabilidad.
- **Instituciones:** detectan donde falta rendicion de cuentas o cobertura.

## Que Hace Hoy

El producto actual ya tiene una primera version funcional:

- pantalla inicial de entrada a Faro;
- mapa territorial para casos con geometria oficial o referencia administrativa oficial claramente caveateada;
- modo investigador tipo scanner con busqueda, filtros compactos y pivots acumulables por fuente, organismo, proveedor y senal;
- inspector lateral compacto para revisar casos rapido;
- expediente completo con senales, evidencia, caveats y siguientes pasos;
- receipts oficiales con source, raw path, hashes, locator y parser version;
- export JSON de expediente o coleccion;
- catalogo de fuentes para Argentina, Peru y Chile;
- pipeline local para snapshot, build y verificacion de datos.

Datos actuales en la app:

- `1867` expedientes;
- `558` Argentina;
- `609` Peru;
- `700` Chile.

## Modos De Uso

### Mapa

El mapa es territorio primero. Solo deberia mostrar casos con geometria oficial validada o centroides administrativos oficiales rotulados como referencia, no como sitio exacto.

Es ideal para obras publicas y casos donde la ubicacion agrega contexto real: territorio, before/after satelital, jurisdiccion y entorno.

En Peru y Chile muchos puntos actuales son centroides administrativos del distrito/comuna o del comprador. Sirven para orientacion territorial y navegacion, pero no prueban el sitio de ejecucion ni habilitan evidencia satelital directa.

### Modo Investigador

El scanner es evidencia primero. Permite buscar por proveedor, organismo, fuente, receipt, senal o texto libre, y despues pivotear entre entidades relacionadas.

Este modo es clave para periodistas e investigadores porque no depende del mapa. Peru y Chile pueden tener expedientes utiles aunque una parte importante todavia no sea dibujable en el mapa.

## Principios Del Producto

- Faro no acusa.
- Faro separa evidencia de opinion.
- Faro no infiere ubicaciones debiles para llenar el mapa.
- Faro muestra caveats cerca de cada afirmacion.
- Faro distingue una URL de dataset de un detalle oficial directo.
- Faro prioriza trazabilidad sobre volumen.
- Faro no convierte adjudicaciones o contratos en pagos sin una fuente que lo sostenga.
- Faro debe ser simple de navegar aunque el usuario sea avanzado.

## Estado Actual Y Proxima Prioridad

La base es buena para continuar, pero todavia no esta al nivel de producto terminado. El siguiente bloque de trabajo no deberia ser mas UI: deberia ser confianza de datos.

Prioridad recomendada:

1. Dedupear obras y casos repetidos preservando receipts.
2. Expandir datos de Argentina, Chile y Peru con fuentes oficiales, cruces reproducibles y valor investigativo real.
3. Cruzar pagos, avance o ejecucion solo cuando exista fuente oficial que lo sostenga.
4. Profundizar expedientes historico-judiciales solo cuando el join documental sea verificable.

La regla geografica de Faro ya es conservadora: una coordenada oficial solo llega al mapa si pasa QA por pais. Coordenadas placeholder, fuera de bounds, duplicadas, sospechosas o marcadas como geometria mala conocida quedan como brecha de datos y no se corrigen automaticamente. El reporte actual muestra `1253` casos elegibles para mapa sobre `1867` expedientes totales: `411/558` Argentina, `550/609` Peru y `292/700` Chile. Los centroides administrativos deben leerse como referencias territoriales, no como ubicaciones exactas de obra o servicio.

## Fuentes Iniciales

Argentina:

- CONTRAT.AR obras;
- CONTRAT.AR contratos;
- CONTRAT.AR procedimientos;
- CONTRAT.AR ofertas;
- CONTRAT.AR ubicacion geografica;
- CONTRAT.AR actas de apertura;
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
- ChileCompra / OCDS procesos, incluyendo una muestra controlada de enero por ano 2019-2025 y enero 2026;
- DIPRES pagos como siguiente cruce.

## Estructura Relevante

```text
src/lib/caseRepository.ts              # fachada de datos para UI y APIs
src/lib/data/                          # normalizacion, senales, receipts, explorer
src/components/                        # experiencia mapa, explorer, inspector, expediente
src/app/api/                           # endpoints thin para casos, leads, export, readiness
scripts/                               # fetch/build/verify de datos oficiales
data/official/                         # snapshots oficiales locales
data/sources/source-catalog.json       # catalogo de fuentes
src/data/                              # artefactos generados para la app
docs/                                  # specs, planes y handoffs
```

## Correr Localmente

```bash
npm install
npm run dev
```

Por defecto el script usa:

```text
http://127.0.0.1:3002
```

En este workspace tambien se estuvo usando `3003` cuando `3002` estaba ocupado.

## Comandos De Datos Y Verificacion

```bash
# solo cuando se quiera refrescar snapshots oficiales completos:
npm run data:fetch:all
# solo cuando se quiera refrescar la seleccion historica de Peru:
npm run data:fetch:pe-historical
npm run data:build
npm run data:verify
npm run data:geo-report
npm run data:quality-report
npm test
npm run typecheck
npm run build
```

`npm run data:build` reconstruye los artefactos generados desde snapshots oficiales locales. `npm run data:fetch:all` refresca snapshots oficiales, FX y la seleccion historica de Peru antes de volver a buildear. `npm run data:verify` valida catalogo, raw hashes, snapshot profiles y receipts. `npm run data:geo-report` revisa calidad de coordenadas y elegibilidad de mapa. `npm run data:quality-report` resume cobertura por pais, fuente, monto, proveedor, geometria y senales.

No usar `npm run data:fetch` como reparacion rutinaria. Puede refrescar fuentes externas y cambiar la linea base de evidencia.

## Docs Para Continuar

- [Contexto de producto](docs/product/faro-product-context.md)
- [Handoff UI/UX del expediente](docs/handoffs/2026-05-16-ui-ux-expediente-faro-v1.md)
- [Handoff de datos, calidad y cobertura](docs/handoffs/2026-05-16-data-quality-and-coverage-handoff.md)
- [Handoff del sprint de integridad de datos](docs/handoffs/2026-05-17-data-integrity-and-quality-sprint-handoff.md)
- [Handoff de senales, filtros y Explorer](docs/handoffs/2026-05-17-investigation-signals-and-filters-ui-handoff.md)
- [Plan del data spine](docs/plans/2026-05-16-data-spine.md)
- [Spec del modo investigador](docs/superpowers/specs/2026-05-16-investigator-explorer-design.md)

## Descripcion Corta Para GitHub

Faro convierte datos oficiales de gasto publico en expedientes verificables con mapa, Explorer, receipts, caveats y export de evidencia.

## Frase Central

Faro convierte datos publicos en expedientes verificables para seguir el dinero, mirar el territorio y exigir rendicion de cuentas.
