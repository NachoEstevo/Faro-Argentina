# Aportes operativos, admin seguro y evidencia curada

Fecha: 2026-05-31
Estado: aprobado para plan de implementacion

## Contexto

Faro ya permite recibir aportes publicos, guardarlos como material privado,
revisarlos desde `/admin/aportes`, cambiar estados, abrir adjuntos privados y
vincular aportes aprobados a expedientes o carpetas. Ese flujo todavia se siente
como una herramienta interna suelta: no expresa con suficiente claridad la cadena
de custodia, los permisos, la auditoria, el riesgo de adjuntos ni el camino
controlado para que un aporte util se convierta en evidencia curada.

El objetivo de este cambio es profesionalizar Aportes end-to-end sin romper la
regla principal del producto: Faro no acusa y no publica aportes
automaticamente. Un aporte enviado por una persona es una pista privada hasta
que el equipo lo revise, lo caveatee, lo relacione de forma explicita y, si
corresponde, lo promueva manualmente como evidencia curada.

## Objetivos

- Convertir Aportes en un flujo operativo privado y auditable.
- Mantener separados evidencia oficial, material privado y evidencia curada.
- Dar al equipo una bandeja de revision clara, segura y accionable.
- Permitir vincular aportes aprobados a expedientes y carpetas sin publicarlos.
- Agregar un segundo paso explicito para promocion publica de evidencia curada.
- Proteger admin, adjuntos y mutaciones con Clerk, roles y auditoria.
- Validar que mapa, Explorer, informes y exports no mezclen aportes privados con
  evidencia oficial.

## No objetivos

- No reemplazar revision periodistica, pedidos de informacion, entrevistas ni
  trabajo de campo.
- No publicar archivos originales subidos por usuarios.
- No agregar un "score" de irregularidad, culpa, fraude o corrupcion.
- No inferir relaciones entre aportes y expedientes sin decision humana.
- No geocodificar ni corregir coordenadas a partir de aportes.
- No implementar busqueda AI ni analisis AI de adjuntos en esta etapa.

## Principios de producto

1. **Privado por defecto.** Todo aporte empieza privado y sigue privado aunque
   este aprobado para investigacion.
2. **Dos decisiones distintas.** Aprobar para investigacion no equivale a
   publicar. Publicar requiere una promocion explicita.
3. **Caveat visible.** Todo uso publico de material aportado debe explicar que
   es, que verifica, que no verifica y quien lo reviso.
4. **Sin fuente oficial mezclada.** Aportes y evidencia oficial se muestran en
   capas separadas.
5. **Trazabilidad primero.** Cada cambio sensible debe dejar actor, fecha, nota
   y accion.
6. **Adjuntos tratados como material sensible.** Los originales no se exponen
   publicamente y deben revisarse por metadata, permisos y contenido visible.

## Roles y permisos

### Usuario publico

- Puede enviar fuente, correccion o archivo/foto.
- Puede elegir modo sin contacto o permitir contacto.
- No puede ver bandeja, trazabilidad interna, adjuntos ni estados internos.

### Investigator

- Puede usar carpetas privadas propias.
- No puede acceder a `/admin/aportes`.
- No puede abrir adjuntos de aportes ni promover evidencia.

### Reviewer

- Puede abrir la bandeja admin.
- Puede leer aportes, abrir adjuntos privados, cambiar estados de revision,
  agregar notas internas y vincular aportes aprobados a expediente o carpeta.
- No puede publicar evidencia curada.
- No puede administrar roles.

### Admin

- Tiene todos los permisos de reviewer.
- Puede marcar un aporte como candidato publico.
- Puede publicar evidencia curada.
- Puede retirar evidencia curada.
- Puede ver auditoria completa y administrar decisiones sensibles.

## Estados

El flujo usa dos ejes separados.

### Estado de revision

- `submitted`: recibido, todavia sin toma interna.
- `accepted_for_review`: tomado en revision por el equipo.
- `needs_more_info`: requiere contexto, fuente, permiso o precision adicional.
- `approved_for_investigation`: util para investigacion interna; todavia
  privado.
- `rejected`: descartado para uso en Faro con la informacion disponible.

Compatibilidad: el estado actual `approved` debe migrarse semanticamente a
`approved_for_investigation` o mapearse como alias durante la transicion.

### Estado de publicacion

- `private`: no publicado; estado inicial.
- `candidate`: podria convertirse en evidencia curada si completa checklist.
- `published_curated`: publicado como pieza curada, separada de evidencia
  oficial.
- `withdrawn`: retirado de la vista publica; conserva auditoria interna.

## Flujo publico de aporte

La UI publica mantiene tres caminos:

- agregar fuente;
- corregir dato visible;
- subir archivo o foto.

Requisitos:

- lenguaje neutral;
- jurisdiccion;
- explicacion del aporte;
- fuente publica cuando corresponde;
- expediente sugerido cuando corresponde;
- consentimiento de fuente/material propio;
- confirmacion de revision privada;
- modo sin contacto con limites claros;
- limites de archivo: tipos permitidos, cantidad y peso.

El mensaje posterior al envio debe reforzar que el aporte fue recibido para
revision privada y no se publica automaticamente.

## Bandeja admin

`/admin/aportes` debe leerse como una mesa de revision, no como una tabla tecnica.

Debe incluir:

- resumen de pendientes por estado;
- filtros por estado, tipo, tiene archivos, modo de contacto, expediente
  sugerido, carpeta vinculada y candidato publico;
- busqueda por titulo, aporte, expediente, fuente, organismo, entidad y nota;
- lista compacta con prioridad visual;
- detalle con resumen, fuente, contacto, adjuntos, riesgos, notas y trazabilidad;
- acciones de revision con labels claros;
- accion de vincular con buscador de expediente/carpeta;
- accion admin-only para marcar candidato publico;
- accion admin-only para publicar o retirar evidencia curada.

## Detalle de aporte

El detalle debe responder rapidamente:

- Que envio la persona.
- Por que podria ser util.
- Que expediente o carpeta sugiere.
- Que fuente o permiso acompana.
- Si hay contacto o no.
- Que adjuntos existen.
- Que metadata o riesgo debe revisarse.
- Que falta para usarlo.
- Que hizo el equipo y cuando.

## Adjuntos

Los adjuntos originales siguen privados siempre.

Reglas:

- sin `publicUrl` en manifest ni API publica;
- acceso solo por endpoint admin con rol reviewer/admin;
- `cache-control: private, no-store`;
- validacion de que el `objectKey` pertenece a un aporte existente;
- auditoria de apertura de archivo;
- advertencia visible de EXIF/PDF metadata;
- no usar el nombre original como identidad cuando el aporte es sin contacto;
- preparar extension futura para escaneo de malware antes de preview publica.

Si una imagen se publica, se publica como pieza curada separada, no como el
archivo original.

## Vinculos

Un aporte aprobado para investigacion puede vincularse a:

- expediente existente;
- carpeta interna;
- ambos.

Reglas:

- el vinculo sugerido por el usuario no es relacion validada;
- solo reviewer/admin puede crear vinculos;
- solo aportes en `approved_for_investigation` pueden vincularse;
- cada vinculo debe tener nota interna;
- en expedientes/carpetas privadas aparece como "material asociado", no como
  evidencia oficial.

## Evidencia curada publica

La publicacion publica requiere un segundo paso admin-only.

Checklist obligatorio:

- aporte aprobado para investigacion;
- vinculo validado a expediente;
- titulo neutral;
- caption neutral;
- caveat explicito;
- fuente, permiso o razon de uso;
- decision sobre metadata y datos personales;
- reviewer/admin responsable;
- fecha de promocion;
- confirmacion de que no es evidencia oficial primaria.

La pieza curada debe mostrarse separada de datos oficiales, por ejemplo en una
seccion del expediente publico llamada "Evidencia complementaria" o "Aportes
curados". No debe aparecer en mapa ni alterar geometria oficial.

Retirar una pieza publica no borra auditoria: cambia `publicationStatus` a
`withdrawn` y conserva el historial interno.

## Seguridad admin

Requisitos de seguridad:

- Clerk obligatorio en produccion.
- MFA requerido para reviewers y admins mediante configuracion de Clerk.
- RBAC server-side en todos los endpoints admin.
- `reviewer` no puede publicar ni retirar evidencia curada.
- `admin` requerido para promocion publica y retiro.
- Mutaciones admin con validacion de origen/CSRF.
- Rate limiting para endpoints admin y apertura de adjuntos.
- Admin no indexable y con headers de seguridad razonables.
- Fail closed si Clerk o variables criticas no estan configuradas.
- No aceptar codigos admin por query string.
- Auditoria para lectura sensible, apertura de adjuntos, cambios de estado,
  vinculos, promocion y retiro.

## Persistencia

El sistema puede seguir usando:

- R2 para objetos y manifests de aportes;
- Neon para usuarios, workspaces, eventos de revision, vinculos y auditoria;
- fallback local solo para desarrollo/test.

Cambios de datos esperados:

- normalizar `approved` a `approved_for_investigation`;
- agregar `publicationStatus`;
- agregar tabla o registro de evidencia curada;
- agregar audit log de acciones sensibles;
- registrar aperturas de adjuntos;
- registrar actor y rol en cada mutacion.

## APIs

### Publico

- `POST /api/aportes`: recibe aporte y adjuntos; crea submission privada.

### Admin reviewer/admin

- `GET /api/admin/aportes`: lista bandeja privada.
- `PATCH /api/admin/aportes`: cambia estado de revision y nota interna.
- `POST /api/admin/aportes`: vincula aporte aprobado a expediente/carpeta.
- `GET /api/admin/aportes/linked`: lista material privado asociado.
- `GET /api/admin/aportes/attachment`: abre adjunto privado y audita acceso.

### Admin-only nuevo

- `POST /api/admin/aportes/promote`: crea o actualiza candidatura/publicacion
  curada.
- `POST /api/admin/aportes/withdraw`: retira evidencia curada publicada.
- `GET /api/admin/audit`: consulta auditoria interna.

Los endpoints nuevos deben mantener route handlers delgados y mover logica a
servicios bajo `src/lib/server` o `src/lib/data`.

## Superficies UI

### Publico

- `/pais/AR?mode=aportes`: formulario publico con copy claro de privacidad.
- Expediente publico: solo muestra evidencia curada publicada, separada de
  evidencia oficial.

### Privado

- `/admin/aportes`: bandeja de revision.
- `/admin/expediente/[id]`: material privado asociado a expediente.
- Carpetas: material asociado como insumo de trabajo, con gaps y proximos pasos.

## Testing y validacion

Debe haber cobertura para:

- usuario sin rol no puede abrir admin;
- investigator no puede leer bandeja ni adjuntos;
- reviewer puede revisar y vincular, pero no publicar evidencia curada;
- admin puede promocionar y retirar evidencia curada;
- ningun aporte se publica automaticamente al enviarse, aprobarse o vincularse;
- adjuntos privados nunca exponen `publicUrl`;
- apertura de adjuntos valida pertenencia del `objectKey`;
- apertura de adjuntos queda auditada;
- mutaciones admin rechazan origen invalido;
- estados invalidos son rechazados;
- evidencia curada publica requiere checklist completo;
- mapa no dibuja coordenadas de aportes;
- Explorer, informes y exports no mezclan aportes privados con evidencia
  oficial;
- copy evita acusaciones y mantiene caveats.

Validacion manual:

- enviar aporte con fuente;
- enviar aporte con archivo;
- revisar en `/admin/aportes`;
- abrir adjunto privado;
- cambiar estado;
- vincular a expediente;
- ver material asociado en admin expediente;
- promover como evidencia curada con admin;
- confirmar que aparece separado en expediente publico;
- retirar evidencia curada;
- confirmar que desaparece publicamente pero queda auditoria.

## Rollout

1. Migrar modelo y aliases de estado sin romper aportes existentes.
2. Agregar auditoria y hardening de endpoints admin.
3. Mejorar bandeja admin y detalle de aporte.
4. Mejorar vinculo con buscador a expediente/carpeta.
5. Agregar flujo admin-only de evidencia curada.
6. Mostrar evidencia curada en expediente publico, separada de evidencia
   oficial.
7. Validar con tests, typecheck, build y recorrida manual.

## Criterio de exito

El cambio esta completo cuando:

- el equipo puede operar aportes de punta a punta desde admin;
- las acciones sensibles quedan auditadas;
- los adjuntos siguen privados;
- un reviewer no puede publicar;
- un admin puede promocionar con checklist explicito;
- nada se publica automaticamente;
- Carpetas y expedientes privados pueden usar aportes como material de trabajo;
- expedientes publicos muestran solo evidencia curada, caveateada y separada;
- las pruebas cubren seguridad, privacidad, estados, vinculos y no mezcla de
  evidencia.
