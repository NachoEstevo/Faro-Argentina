# Contexto De Producto: Faro Argentina

Fecha: 2026-06-01
Audiencia: producto, UI/UX, datos, satelite, ingenieria
Estado: contexto vigente para fork privado enfocado en Argentina

## Definicion Corta

Faro Argentina es un mapa y explorer investigativo del dinero publico.

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

- CSVs, APIs y portales;
- nombres de entidades inconsistentes;
- links de dataset en lugar de paginas oficiales comprensibles;
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
pregunta -> mapa/explorer -> pista -> expediente -> rastro oficial -> export -> accion
```

Para periodistas e investigadores, la ruta operativa agrega una carpeta privada:

```text
pregunta de investigacion -> busqueda por entidad/lugar/fuente -> expediente relacionado
-> motivo y nota de relacion -> matriz de evidencia -> brechas -> proximos pasos
-> paquete exportable
```

La carpeta no confirma relaciones. Sirve para ordenar hipotesis de trabajo,
recibos oficiales, caveats y tareas de verificacion.

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

### Carpeta De Investigacion

Una carpeta es un espacio privado de trabajo, no una publicacion.

Debe conservar:

- pregunta de investigacion;
- expedientes relacionados;
- motivo de relacion declarado por el usuario;
- nota de relacion o pendiente de verificacion;
- actores comunes;
- matriz de evidencia;
- brechas;
- proximos pasos;
- fuentes manuales;
- export descargable.

El motivo por defecto debe ser neutral, por ejemplo "Hipotesis de trabajo". No
usar "Mismo contexto judicial" como default porque puede sobreafirmar una
relacion.

#### Preparacion Del Dossier

La carpeta debe mostrar una lectura de preparacion para handoff interno. Esa
lectura no aprueba un caso, no habilita publicacion y no afirma que la hipotesis
sea correcta. Ordena:

- evidencia oficial cargada;
- notas de relacion;
- cobertura de fuentes;
- brechas de datos;
- tareas de verificacion;
- material manual pendiente;
- limite entre trabajo privado y evidencia publica.

Los estados correctos son "Inicial", "En armado" y "Lista para handoff interno"
o "Lista para handoff interno con caveats". Evitar "caso probado", "caso
fuerte", "publicable" o cualquier lenguaje que convierta una carpeta privada en
conclusion publica.

El export de carpeta debe conservar esta preparacion para que el ZIP viaje con
blockers, caveats y proximas acciones.

### Aportes

Los aportes de usuarios son material privado de revision. Aunque apunten a un
expediente Faro, ese vinculo es sugerido por el usuario y no queda aprobado hasta
que alguien lo revise.

Reglas:

- no publicar aportes automaticamente;
- no mostrar aportes en mapa, Explorer, informes o exports publicos sin curacion
  manual;
- mantener visible que "sin contacto" no significa anonimato absoluto;
- explicar que archivos pueden conservar metadatos EXIF o PDF;
- separar sugerencia de relacion de relacion validada;
- si un aporte se usa publicamente despues, debe tener fuente/caveat/redaccion
  explicita.

#### Aportes operativos

Aportes es una bandeja privada de revision. Recibir, aprobar para investigacion,
vincular y publicar son decisiones distintas:

```text
recibido -> en revision -> necesita mas info -> aprobado para investigar -> descartado
                           \
                            -> candidato publico -> aporte curado publicado -> retirado
```

Solo una cuenta admin puede convertir un aporte aprobado y vinculado a un
expediente en evidencia curada publica. Esa pieza debe tener titulo neutral,
caption, caveat, fuente o permiso, responsable de revision y fecha. Se muestra
separada del rastro oficial y no modifica mapa, receipts, exports ni geometria.

La bandeja interna tiene un estado propio de orden operativo: `active`,
`archived` o `removed`. Ese estado no borra el aporte ni cambia la decision de
revision; solo limpia la cola de trabajo y conserva trazabilidad interna. Quitar
un aporte de la bandeja es una remocion blanda, no una eliminacion fisica.

Si un aporte con imagen se publica como evidencia curada, Faro debe crear una
copia publica separada del adjunto privado, exigir texto alternativo publico y
exponer solo la URL publica redaccionada. La ruta interna del objeto privado
nunca debe salir en APIs publicas ni en el expediente.

La vista admin debe permitir leer auditoria interna con metadata redaccionada:
actor, rol, accion, destino, fecha y resumen seguro. No debe mostrar object keys,
rutas `submissions/...`, contacto, nombres originales de archivos ni metadata
cruda. La apertura de bandeja se audita cuando hay base productiva configurada.

### Receipt

El receipt es la capa de confianza. Le dice al usuario de donde salio el registro
y como reproducirlo.

Campos importantes:

- source id;
- source name;
- source URL cruda para reproducibilidad;
- public source URL para abrir la pagina oficial en la UI;
- raw path;
- snapshot hash;
- row hash;
- record id;
- locator type;
- parser version;
- extracted timestamp.

Cuando un receipt conserva un link descargable a CSV/API, la UI publica debe
abrir la pagina oficial del catalogo o portal cuando exista. El link crudo queda
para export tecnico y reproducibilidad.

### Matriz De Afirmaciones

La matriz de afirmaciones es el contrato operativo para leer un expediente. No
rankea sospechas ni valida un caso: separa que afirmaciones sostiene Faro, cuales
estan parcialmente cubiertas y cuales no estan soportadas por el corpus actual.

Estados:

- `supported`: la fuente integrada trae un dato directo para esa afirmacion.
- `partial`: existe una llave, dato administrativo o pista oficial, pero falta
  otra fuente para afirmar completo.
- `not_supported`: Faro no tiene una fuente integrada que permita decir eso.

La matriz cubre:

- registro oficial;
- monto declarado;
- presupuesto oficial;
- proveedor;
- competencia;
- ubicacion oficial;
- avance declarado;
- pago a proveedor;
- contexto judicial;
- rastro presupuestario BAPIN.

Reglas de lectura:

- Un contrato, adjudicacion, avance declarado o credito presupuestario no prueba
  pago a proveedor.
- Una provincia/departamento sin latitud/longitud oficial es ubicacion parcial,
  no punto map-safe.
- Un BAPIN en Mapa de Inversiones permite preparar un cruce con Presupuesto
  Abierto, pero no debe mostrarse como ejecucion presupuestaria integrada hasta
  guardar query, receipt y caveat.
- Un contexto judicial no prueba nada sobre otro contrato Faro sin match
  documental exacto.

La matriz debe viajar en expediente, informe y evidence pack para que el usuario
pueda descargar no solo datos, sino tambien los limites de esos datos.

### Checklist Investigativo

El checklist investigativo es una capa operacional sobre la matriz. No agrega
fuentes nuevas ni cambia el estado de una afirmacion; ordena:

- brechas prioritarias;
- proximos cruces o revisiones;
- fuentes candidatas aplicables por llave oficial;
- afirmaciones que no deben hacerse todavia.

Usar etiquetas de trabajo, no puntajes: "Buen punto de partida", "Requiere
cruce de fuente" o "Pista limitada". La severidad de una brecha mide riesgo de
sobreinterpretacion, no riesgo legal, penal ni reputacional.

Presupuesto Abierto/BAPIN solo puede aparecer como cruce candidato mientras no
exista query reproducible, receipt, hash, fecha de actualizacion y caveat. Un
resultado sin filas debe registrarse como brecha de datos, no como pago cero ni
como ejecucion cero.

### Matriz De Datos

La pagina de datos y la documentacion deben explicar fuente, etapa del ciclo,
campos utiles, cantidad de expedientes, raw rows, map-ready y caveats. El valor
no es comunicar solo volumen, sino mostrar que afirmaciones permite cada fuente:
procedimiento, contrato, proveedor, ejecucion declarada, contexto documental o
conversion.

No presentar una fuente como cobertura completa del gasto publico si solo cubre
una etapa del ciclo. No convertir falta de pago, avance o geometria en
acusacion; mantenerlo como brecha verificable.

#### Fuentes Candidatas

Una fuente candidata no es parte del corpus productivo hasta pasar una matriz de
ingreso: URL oficial, campos utiles, llave de cruce documentada, receipt,
snapshot/hash, caveat y afirmacion permitida. Presupuesto Abierto puede ser un
prototipo recomendado para ejecucion presupuestaria declarada por BAPIN, pero no
debe llamarse pago verificado a proveedor. SIGEN/AGN son contexto documental
manual hasta que exista un flujo editorial de citas.

### Perfiles Investigativos Del Explorer

Explorer puede agrupar resultados en perfiles por proveedor, organismo,
provincia, fuente y senal. Esos perfiles son accesos de trabajo: muestran
expedientes, fuentes, brechas, monto comparable y caveat. No son rankings de
sospecha, no comparan instituciones y no publican aportes privados.

La regla de accion es simple:

- proveedor, organismo, fuente y senal pueden convertirse en pivots;
- provincia se trata como busqueda por ubicacion oficial declarada;
- cada perfil debe explicar su base y su limite antes de sugerir un proximo
  paso.

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
- Explorer investigador con filtros compactos y pivots por fuente, organismo,
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
- autenticacion Clerk para superficies privadas e internas;
- persistencia Neon opcional para estado privado estructurado;
- storage R2 compatible para adjuntos privados de Aportes cuando esta
  configurado.

Datos actuales segun reportes generados el 2026-05-21:

- `7.932` expedientes de Argentina;
- `389` contratos CONTRAT.AR canonicos;
- `246` obras publicas CONTRAT.AR;
- `7.285` proyectos de Mapa de Inversiones cargados como cobertura de avance,
  sin mapa porque el CSV actual no trae latitud/longitud;
- `12` expedientes historico-judiciales;
- `431` expedientes elegibles para mapa despues del gate;
- `9.617` receipts.

Currentness:

- El manifest principal de snapshots fue generado el
  `2026-05-18T00:19:46.421Z`.
- Mapa de Inversiones fue agregado en la linea de datos del `2026-05-21`.
- Las metricas publicas deben verificarse con `npm run data:geo-report` y
  `npm run data:quality-report` antes de una presentacion o release.
- "Map-safe" no significa "todos los casos"; significa que el expediente tiene
  geometria oficial validada. Los demas casos siguen siendo buscables,
  exportables y revisables como brechas.

Bloqueos antes de llamarlo producto terminado:

- Algunas coordenadas de Argentina son invalidas, duplicadas, placeholders o
  parecen tener signos negativos faltantes; esos casos deben seguir como brechas
  de datos, no como puntos corregidos manualmente.
- Mapa de Inversiones suma volumen y avance declarado, pero no debe alimentar
  el mapa ni senales fuertes de proveedor hasta cruzarse con geometria o
  contratacion oficial mas especifica.
- Las obras publicas de Argentina conservan filas oficiales duplicadas con ids
  estables tipo `--row-2`; el `numero_obra` oficial sigue en el receipt.
- Los expedientes historico-judiciales cargados para Argentina son contexto
  verificable; no deben mezclarse con contratos actuales sin match documental
  exacto.

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
4. Los casos nuevos deben ser fuertes, validados y utiles antes que numerosos.
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
