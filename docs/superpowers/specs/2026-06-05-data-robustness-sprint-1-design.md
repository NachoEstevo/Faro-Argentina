# Data Robustness Sprint 1 Design

Fecha: 2026-06-05
Estado: aprobado por criterio operativo del thread

## Objetivo

Mejorar la robustez de datos de Faro sin sumar inferencias dudosas. La primera
mejora debe hacer mas claro que puede afirmar cada expediente, que evidencia lo
sostiene y que falta verificar antes de que un periodista o investigador use el
caso como insumo profesional.

## Principio

Faro no debe adivinar relaciones. Si una fuente no prueba pago, avance, proveedor,
ubicacion exacta o contexto judicial, la plataforma debe decirlo de forma
explicita como brecha.

## Decision

Implementar una matriz deterministica de afirmaciones por expediente:

- registro oficial;
- monto declarado;
- presupuesto oficial;
- proveedor;
- competencia/ofertas;
- ubicacion oficial;
- avance declarado;
- pago a proveedor;
- contexto judicial;
- rastro presupuestario BAPIN.

Cada afirmacion tendra estado:

- `supported`: la fuente integrada sostiene la afirmacion con dato directo;
- `partial`: hay una pista o dato parcial, pero no alcanza para afirmar completo;
- `not_supported`: Faro no tiene una fuente integrada para esa afirmacion.

Cada fila debe conservar:

- fuente(s) usadas;
- evidencia textual;
- caveat;
- proximo paso verificable.

## Alcance Seguro

Este sprint no integra nuevas fuentes productivas ni refresca snapshots. El
camino BAPIN/Presupuesto Abierto queda como candidato recomendado porque las
fuentes oficiales exponen BAPIN y endpoints presupuestarios, pero se mantiene
fuera del corpus hasta validar queries, receipts y cobertura.

## Riesgos Que Evitamos

- llamar pago a proveedor a una ejecucion presupuestaria;
- geocodificar obras sin latitud/longitud oficial;
- unir por nombres parecidos, montos parecidos o cercania geografica;
- convertir señales en acusaciones;
- presentar volumen de datos como calidad de evidencia.

## Valor Para Investigadores

La matriz permite decidir rapido:

1. que puedo citar hoy;
2. que debo abrir en la fuente oficial;
3. que falta para cerrar una hipotesis;
4. que no debo publicar todavia;
5. que fuentes futuras tendrian mas impacto real.

## Fuentes Oficiales Revisadas

- Presupuesto Abierto API: endpoints de credito y PEF.
- Mapa de Inversiones Argentina: campos `codigobapin`, avance fisico,
  avance financiero, monto total y perfil de obra.
- CONTRAT.AR historico: fuente auxiliar historica con BAPIN y datos de obra.
- BAPIN: registro oficial de proyectos de inversion y trazabilidad.

## Criterio De Exito

- Los expedientes y evidence packs incluyen matriz de afirmaciones.
- El reporte de calidad agrega cobertura por afirmacion.
- La documentacion explica que BAPIN/Presupuesto Abierto es rastro
  presupuestario, no pago verificado.
- Los tests prueban que pago a proveedor permanece `not_supported` con los datos
  actuales.
