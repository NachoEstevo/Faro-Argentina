# Contexto De Producto: Faro

Fecha: 2026-05-17
Audiencia: producto, UI/UX, datos, satelite, ingenieria
Estado: contexto de trabajo vigente despues de Explorer compacto y limpieza de geometria

## Definicion Corta

Faro es un mapa y explorer investigativo del dinero publico.

Convierte datos oficiales en expedientes verificables: obras publicas,
contrataciones, proveedores, organismos, montos, fechas, fuentes, caveats,
receipts y evidencia visual cuando los datos lo permiten.

## Principio Central

Faro no acusa. Faro muestra donde mirar, por que mirar ahi, que evidencia existe
y que falta verificar.

Esta regla debe guiar copy, UI, ranking, colores, labels y exports. Faro puede
priorizar una pista, pero no debe insinuar culpabilidad.

## Problema

Los datos de gasto publico existen, pero estan fragmentados:

- CSVs, XLSX, APIs y portales;
- nombres de entidades inconsistentes;
- links de dataset en lugar de paginas directas de cada caso;
- geolocalizacion debil o ausente;
- contratos separados de pagos, avance y proveedores;
- registros publicos dificiles de citar fuera del portal original.

El resultado es que un periodista, ciudadano o watchdog puede perder horas antes
de saber si un registro vale la pena.

## Objetivo Del Producto

Reducir la distancia entre una senal de datos publicos y una ruta reproducible de
verificacion.

La ruta ideal de Faro es:

```text
pregunta -> mapa/scanner -> pista -> expediente -> rastro oficial -> export -> accion
```

El usuario deberia poder responder rapido:

1. Que estoy mirando?
2. Por que Faro lo muestra?
3. Que fuente lo sostiene?
4. Que falta o que es incierto?
5. Que deberia verificar despues?
6. Puedo exportar la evidencia?

## Usuarios

### Ciudadanos

Necesitan contexto simple y lenguaje claro. Deben entender un caso sin leer la
base cruda.

### Periodistas

Necesitan pistas, pivots por entidad, links oficiales, caveats y exports que
puedan usar como carpeta inicial de investigacion.

### Auditores Y Watchdogs

Necesitan trazabilidad, evidencia reproducible, cobertura de fuentes y patrones
entre proveedores, organismos, metodos y territorios.

### Instituciones

Necesitan ver brechas de transparencia, registros faltantes, cobertura
territorial debil y lugares donde puede mejorar la rendicion de cuentas.

## Unidades Del Producto

### Pista

Una pista es una razon priorizada para abrir un caso. No es un score de
corrupcion.

Lenguaje correcto:

- "Competencia limitada"
- "Monto sobre presupuesto"
- "Falta pago/avance"
- "Evidencia cruzada"
- "Sin geometria oficial"

Lenguaje incorrecto:

- "Fraude"
- "Corrupto"
- "Robo"
- "Caso probado"
- "Ranking de sospechosos"

### Expediente

El expediente es la unidad central del producto. Debe funcionar con o sin mapa.

Incluye:

- resumen;
- datos clave;
- por que aparecio;
- rastro oficial;
- receipts;
- caveats;
- siguientes pasos de verificacion;
- paquete exportable.

### Receipt

El receipt es la capa de confianza. Le dice al usuario de donde salio el registro
y como reproducirlo.

Campos importantes:

- source id;
- source name;
- source URL;
- raw path;
- snapshot hash;
- row hash;
- record id;
- locator type;
- parser version;
- extracted timestamp.

La UI debe distinguir entre:

- detalle oficial directo;
- busqueda oficial;
- URL de dataset oficial;
- sin URL exacta.

### Punto En El Mapa

Un punto en el mapa solo es seguro cuando el caso tiene geometria oficial que
pasa controles de calidad.

No dibujar puntos desde:

- direccion del proveedor;
- direccion del organismo;
- texto de localidad;
- geocoding debil;
- coordenadas inferidas.

### Contexto Satelital

La imagen satelital es ayuda de verificacion, no prueba por si sola.

Solo mostrar affordances satelitales cuando:

- el caso tiene geometria oficial validada;
- hay una fecha util;
- los caveats siguen visibles;
- el usuario entiende las limitaciones de fuente, nubes, resolucion y fecha.

## Estado Actual

Implementado:

- pantalla inicial;
- modo mapa;
- scanner investigador con filtros compactos y pivots por fuente, organismo,
  proveedor y senal;
- inspector compacto;
- panel de expediente completo;
- lead feed;
- modelo de senales;
- modelo de receipts;
- export de evidencia;
- readiness endpoint;
- catalogo de fuentes;
- scripts locales de fetch, build y verify.

Datos actuales:

- 1608 expedientes totales;
- 558 Argentina;
- 525 Peru;
- 525 Chile.
- 1097 expedientes elegibles para mapa: 411 Argentina, 469 Peru y 217 Chile.
- 2 casos de Argentina marcados como `known_bad_geometry` siguen disponibles
  para Explorer/export, pero no se dibujan en el mapa.

Bloqueos antes de llamarlo producto terminado:

- Algunas coordenadas de Argentina son invalidas, duplicadas, placeholders o
  parecen tener signos negativos faltantes; esos casos deben seguir como brechas
  de datos, no como puntos corregidos manualmente.
- Las obras publicas de Argentina tienen case ids duplicados que deben
  canonicalizarse.
- Los expedientes historico-judiciales cargados para Argentina son contexto
  verificable; no deben mezclarse con contratos actuales sin match documental
  exacto.
- Peru y Chile ya prueban que Faro no depende del mapa, pero necesitan mas
  cruces oficiales de mayor valor; el Explorer debe mostrar esos expedientes
  aunque una parte no sea map-ready.

## Donde Esta El Valor

Faro no deberia ganar por mostrar un mapa basico. Eso es facil de copiar.

El valor esta en combinar:

- registros de dinero publico legibles;
- territorio cuando la fuente lo soporta;
- receipts a nivel fuente;
- evidencia cruzada;
- caveats que evitan sobreinterpretar;
- carpetas de investigacion exportables;
- pivots por entidad para seguir el rastro.

## Barra De Calidad Para La Proxima Fase

Antes de mas polish visual, la proxima fase debe probar confianza de datos:

1. La app debe saber que coordenadas son seguras.
2. El evidence pack debe reproducir contra raw snapshots.
3. Cada caso visible debe explicar la calidad de su fuente.
4. Chile, Peru y Argentina deben tener pocos casos fuertes, validados y utiles
   antes que muchos casos debiles.
5. El modo investigador debe permitir seguir proveedores, organismos y receipts
   sin convertirse en una tabla cruda.

## Principio De Confianza De Datos

Faro debe preferir menos casos con receipts, hashes y caveats antes que muchos
casos con procedencia debil. Un caso puede seguir siendo buscable aunque no sea
map-ready o lead-eligible; el producto debe mostrar la brecha en vez de esconder
o inventar evidencia.

La recurrencia de proveedores solo debe leerse como pista. Si Faro agrupa por
documento fiscal, la confianza es mayor. Si agrupa solo por nombre normalizado,
la senal debe quedar con menor confianza y caveat visible.

## Notas Para El Equipo

UI/UX puede refinar como se muestran las piezas actuales, pero debe preservar:

- no usar lenguaje acusatorio;
- caveats cerca de cada afirmacion;
- acciones de fuente/export visibles;
- casos sin geometria como expedientes de primera clase;
- inspector para scanear, expediente completo para leer.

El trabajo satelital debe depender del gate de calidad de datos. Si la geometria
no esta validada, la UI no deberia ofrecer before/after.

El trabajo de datos debe priorizar fuentes validadas, resolucion de entidades y
receipts reproducibles por encima del volumen.
