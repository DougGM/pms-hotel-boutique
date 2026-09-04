# Recursos Compartidos

`components/` aloja controles genéricos como botones, campos, modales, tablas,
badges y layouts. `constants/` contiene valores globales; `hooks/` hooks
reutilizables; `lib/` configuración de librerías; `types/` tipos que no
pertenecen a un solo módulo; y `utils/` funciones puras de utilidad.

Un archivo solo debe entrar en `shared/` cuando sea usado por dos o más zonas
o módulos. Si pertenece a una sola funcionalidad, debe permanecer dentro de
`src/modules/<modulo>/`.

Antes de crear un componente, revisar `src/index.css` para reutilizar las
variables, clases y patrones visuales del diseño original de Bolt.
