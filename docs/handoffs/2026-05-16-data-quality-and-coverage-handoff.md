# Handoff: Calidad De Datos Y Cobertura

Fecha: 2026-05-16
Audiencia: datos, satelite, ingenieria
Estado: handoff de analisis; gate geografico implementado. Nota 2026-05-17:
las cifras y el data spine fueron superados por expansiones posteriores.

## Por Que Existe Este Handoff

Faro ya tiene mapa, scanner investigador, expediente y export de evidencia. El
siguiente riesgo no es la interfaz. El siguiente riesgo es si la data es lo
suficientemente confiable para sostener la promesa del producto.

No queremos un demo de hackathon con visuales fuertes y evidencia debil. La
proxima fase debe hacer reproducible el data spine, limpiar el mapa y expandir
Argentina, Chile y Peru con registros validados, utiles y cruzados.

## Snapshot Actual De Datos

Case files generados en el snapshot original de este handoff:

- 371 expedientes totales;
- 296 Argentina;
- 50 Peru;
- 25 Chile.

Snapshot actualizado 2026-05-17:

- 1608 expedientes totales;
- 558 Argentina;
- 525 Peru;
- 525 Chile;
- 1099 casos elegibles para mapa: 413 AR, 469 PE y 217 CL.

Fuentes principales generadas:

- `AR-CONTRATAR-OBRAS`: 246 casos;
- `AR-CONTRATAR-CONTRATOS`: 50 casos;
- `PE-MEF-GASTO-DIARIO`: 25 casos;
- `PE-OECE-CONTRATOS`: 25 casos;
- `CL-MERCADO-PUBLICO-API`: 25 casos.

Receipts actuales:

- 321 primary receipts apuntan a datasets oficiales;
- 50 primary receipts apuntan a URLs de detalle oficial;
- existen related receipts para casos cruzados de Argentina y Peru.

## Problemas Verificados

### 1. Los Hashes Del Data Spine Estan Fuera De Sync

`npm run data:verify` fallaba en este snapshot. En el estado actualizado del
17/05/2026 vuelve a pasar y reporta 1608 case files, 3995 receipts y 15 raw
files chequeados.

Sintoma principal:

- los hashes de datasets generados no coinciden con los raw files actuales;
- muchos related receipts tambien reportan hash mismatch.

Esto importa porque el evidence pack de Faro debe sobrevivir fuera de la UI. Si
el raw snapshot y el receipt no coinciden, el usuario no puede reproducir la
afirmacion end to end.

Primer arreglo:

1. decidir si los raw files trackeados o los JSON generados son la fuente de
   verdad;
2. correr `npm run data:build` desde esos snapshots;
3. correr `npm run data:verify`;
4. commitear solo cuando raw files, generated data y receipts coincidan.

### 2. El Gate Del Mapa Acepta Coordenadas Malas

El gate actual de UI revisa:

- que existan coordenadas;
- que el receipt sea visible;
- que existan caveats;
- que el evidence level sea soportado.

No revisa si las coordenadas pertenecen al pais esperado.

Problemas observados en Argentina:

- puntos en `0,0`;
- puntos en `0.123456,0.123456`;
- latitud/longitud con signos negativos faltantes;
- longitud duplicada desde la latitud;
- coordenadas fuera de Argentina que pueden aparecer en oceano u otro
  continente;
- obras duplicadas con varias filas y calidad de coordenadas mezclada.

Esto bloquea el mapa confiable y el trabajo satelital.

### 3. Hay Obras Duplicadas En Argentina

Las obras de Argentina tienen `AR-WORK-*` duplicados. Hay 246 filas de obra, pero
196 work ids unicos.

Esto no significa que la fuente este mal. Significa que el modelo generado debe
representar filas repetidas o multiples ubicaciones de forma deliberada:

- un expediente canonico por obra;
- muchas filas/fuentes como evidencia relacionada;
- coordenada display solo si pasa validacion;
- geometria invalida conservada como caveat o metadata QA, no escondida.

### 4. Peru Y Chile Necesitan Mas Cruce Util

Peru y Chile ya son utiles porque prueban que Faro no es solo mapa, pero la
siguiente iteracion de datos debe ganar profundidad.

Peru:

- mantener contratos OECE y links OCDS;
- fortalecer matching de comprador/proveedor;
- decidir como se relaciona MEF con contratos sin sobreafirmar pagos;
- agregar UBIGEO o normalizador territorial antes de mapear.

Chile:

- expandir mas alla de una muestra chica de Mercado Publico API;
- usar ChileCompra OCDS como fuente bulk mas fuerte;
- conectar compradores, proveedores, actas de adjudicacion y orden/pago cuando
  sea posible;
- tratar DIPRES pagos como capa posterior, no como join garantizado.

## Sprint Recomendado: Data Trust

### Tarea 1: Dejar La Verificacion En Verde

Objetivo: `npm run data:verify` pasa.

Entregables:

- snapshot manifest estable;
- `src/data/*.json` regenerados;
- receipts cuyo `snapshotHash` y `fileHash` coinciden con raw files;
- secuencia de comandos documentada.

### Tarea 2: QA De Coordenadas

Estado: implementado para el gate core de Faro.

Objetivo: ninguna coordenada invalida llega al mapa o al pipeline satelital.

Modelo sugerido:

```ts
type CoordinateStatus =
  | "valid_official_geometry"
  | "missing_geometry"
  | "outside_country_bounds"
  | "placeholder_geometry"
  | "sign_suspect"
  | "duplicate_or_conflicting_geometry";
```

Empezar simple. Un bounds check por pais alcanza para el primer gate:

- Argentina: lat `-56..-21`, lon `-74..-53`;
- Peru: lat `-19..1`, lon `-82..-68`;
- Chile continental: lat `-56..-17`, lon `-76..-66`.

Dejar Isla de Pascua u otros territorios especiales fuera de scope salvo que un
caso respaldado por fuente lo requiera.

Comando disponible:

```bash
npm run data:geo-report
```

El reporte debe usarse antes de dar casos al mapa o al flujo satelital. En el
estado actualizado del 17/05/2026 reporta `1608` expedientes totales y `1099`
casos elegibles para mapa.

### Tarea 3: Canonicalizar Obras De Argentina

Objetivo: un work id se convierte en un expediente.

Reglas:

- agrupar por `numero_obra`;
- preservar todas las filas crudas como receipts o source rows relacionados;
- elegir coordenada display solo desde coordenadas oficiales validas;
- si hay multiples coordenadas validas, marcar como multi-location o documentar
  la regla de seleccion;
- las coordenadas invalidas permanecen en metadata QA, no se dibujan en mapa.

### Tarea 4: Gatear Mapa Y Sentinel Juntos

Objetivo: el trabajo satelital recibe solo candidatos seguros.

Reglas:

- un punto de mapa requiere `valid_official_geometry`;
- un candidato Sentinel requiere `valid_official_geometry` y fecha util;
- geometria invalida o ausente debe aparecer como senal de brecha, no como un
  punto roto en el mapa.

### Tarea 5: Expandir Cobertura Con Valor

Objetivo: mejorar AR/PE/CL con casos cruzados y utiles.

Preferir:

- menos expedientes, pero mas confiables;
- links de fuente mas fuertes;
- pivots por proveedor y organismo;
- URLs directas de detalle cuando existan;
- caveats explicitos para registros a nivel dataset.

Evitar:

- filas bulk sin valor investigativo;
- geocoding inferido;
- mezclar ejecucion presupuestaria con claims de pago sin fuente que lo sostenga;
- rankings de paises o scores de wrongdoing.

## Notas Por Rol

### Para Datos

Priorizar reproducibilidad y joins:

- source catalog;
- snapshot manifest;
- raw file hash;
- row hash;
- case id;
- receipt id;
- source URL;
- locator type.

Un caso no esta listo solo porque tiene titulo y monto. Esta listo cuando otra
persona puede reabrir la fuente y entender la afirmacion.

### Para Satelite

No consumir todos los casos de mapa todavia.

Esperar o ayudar a definir:

- coordinate status;
- coordenada valida seleccionada;
- fecha util del caso;
- caveats de nube/fecha/resolucion;
- ventana de busqueda before/after.

La salida satelital debe presentarse como contexto visual, no como prueba de
ejecucion.

### Para UI/UX

Representar calidad de datos con lenguaje claro:

- "con geometria oficial validada";
- "sin geometria oficial";
- "coordenada oficial requiere revision";
- "receipt de dataset";
- "detalle oficial directo";
- "falta cruzar pago/avance".

El usuario debe entender cuando un caso es fuerte, incompleto o bloqueado por
calidad de datos sin leer metadata cruda.

## Criterios De Exito

La proxima fase es exitosa cuando:

- `data:verify` pasa;
- ningun punto visible cae fuera de los bounds esperados de su pais;
- los candidatos satelitales salen solo de geometria validada;
- las obras duplicadas de Argentina no crean expedientes duplicados o
  enganiosos;
- Argentina, Peru y Chile tienen un set chico de casos fuertes, explicables y
  exportables;
- README y handoffs reflejan el estado real del producto.
