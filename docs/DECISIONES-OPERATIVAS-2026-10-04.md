# Correcciones operativas — 2026-10-04

## Contexto

La interfaz privada tenía acciones financieras que podían confundirse, el
reporte de desperfectos no conservaba el archivo seleccionado y el cambio de
estado de promociones podía depender de una posición de lista.

## Decisión

- Caja mantiene un modal exclusivo para registrar pagos y otro para agregar
  cargos a la cuenta.
- Limpieza captura el `File` del selector y lo convierte a Data URL al enviar
  el reporte.
- Promociones actualiza la entidad por su `dbId` persistido, nunca por el
  índice de la colección.

## Alcance

Se modificaron únicamente los flujos privados existentes, reutilizando sus
componentes y clases visuales actuales.

## Ajustes de usabilidad posteriores

- El formulario de reserva manual usa una grilla responsiva de una columna en
  móvil y dos en escritorio para los campos de estadía.
- El menú de Room Service se segmenta por pestañas de Desayunos, Almuerzos,
  Cenas y Bebidas; la clasificación se deriva del nombre del producto porque
  el contrato actual no expone una categoría de horario.
- El registro de insumos muestra la unidad del producto seleccionado junto a
  la cantidad recibida.
