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
