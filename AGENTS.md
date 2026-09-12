# AGENTS.md

## Regla visual obligatoria

No crear pantallas, layouts, componentes visuales ni CSS que se salgan del
diseno establecido por el prototipo Bolt.

La fuente visual del proyecto es:

- `src/index.css`
- `src/styles/tokens.css`
- los patrones heredados de Bolt: `visitor-*`, `reservation-*`, `rc-*`,
  `adm-*`, `.panel`, `.button`, `.content`, `.brand`, `.visitor-header`,
  `.search-panel`, `.room-cards`, entre otros.

Antes de crear una clase nueva, revisar si ya existe una clase o patron Bolt
equivalente. Si hace falta una clase nueva, debe ser un wrapper pequeno sobre
el lenguaje visual existente, no un sistema paralelo.

## Zonas con propietario

No tocar la web publica / motor de reservas sin validar primero las issues de
GitHub correspondientes. Actualmente ese bloque esta bajo las tareas:

- `#45` Ronda 1 - Motor de reservas
- `#46` SearchScreen
- `#47` RoomDetailScreen
- `#48` BookingFormScreen
- `#49` BookingConfirmationScreen

Estas tareas pertenecen a la vertical `web-publica`.

## Login y registro

El login es una excepcion funcional respecto a Bolt: Bolt separaba huesped y
empleado, pero este proyecto usa un login general y decide el acceso segun las
credenciales y permisos de sesion.

No implementar un flujo de registro nuevo desde el boton `Registrarse` sin una
issue explicita. Si se necesita registro de huesped, cuenta de cliente o portal
de huesped, crear/asignar la tarea antes de tocar UI o rutas.
