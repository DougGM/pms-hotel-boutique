# Aviso: diseno Bolt y ownership de web publica

Fecha: 2026-09-12

Durante la revision visual de `develop` se detecto que algunas pantallas
mergeadas de la Ronda 1 estaban respetando la estructura de carpetas, pero no
el diseno heredado de Bolt.

La estructura actual es valida; el problema a cuidar es visual/CSS:

- No crear sistemas visuales paralelos al prototipo Bolt.
- Reutilizar `src/index.css`, `src/styles/tokens.css` y los patrones existentes
  (`visitor-*`, `reservation-*`, `rc-*`, `adm-*`, `.panel`, `.button`,
  `.content`, etc.).
- Si una pantalla necesita CSS propio, debe envolver patrones Bolt, no
  reemplazarlos.

## Web publica / booking engine

La zona publica del motor de reservas esta asociada a las issues:

- `#45` Ronda 1 - Motor de reservas
- `#46` SearchScreen
- `#47` RoomDetailScreen
- `#48` BookingFormScreen
- `#49` BookingConfirmationScreen

Antes de continuar con cambios visuales en esa zona, validar ownership en
GitHub para no pisar trabajo asignado.

## Boton `Registrarse`

No se encontro una issue abierta especifica para implementar registro. Por
ahora no debe agregarse un flujo nuevo desde `Registrarse` sin una tarea
explicita.

El login general si esta definido: a diferencia del prototipo Bolt, que
separaba huesped/empleado, esta app usa un unico login y decide el acceso por
credenciales/permisos de sesion.

