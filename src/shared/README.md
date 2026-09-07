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

## Presentación — WEB-13

Componentes disponibles en `shared/components/`:

| Componente   | API principal                                                                           |
| ------------ | --------------------------------------------------------------------------------------- |
| Card         | `title`, `description`, `children`, `footer`, `variant`: outlined / raised / muted      |
| Badge        | `children`, `tone`: neutral / info / success / warning / danger, `size`: small / medium |
| EmptyState   | `title`, `description`, `action` opcional                                               |
| LoadingState | `label`, `variant`: block / inline; anuncio mediante `role=status`                      |
| ErrorState   | `title`, `description`, `onRetry` obligatorio, síncrono o asíncrono                     |
| DataTable    | `columns`, `data`, `getRowId`, `caption`, `pageSize` (5 por defecto), `emptyMessage`    |
| Pagination   | `currentPage`, `totalPages`, `onPageChange`, `label` accesible                          |

La columna conserva `id`, `header` y `cell`; agregar `sortValue` habilita la
ordenación. Ordena todos los datos antes de paginar, sin mutar el arreglo
original. Los números se comparan numéricamente; el texto usa colación española
con orden natural. Los valores nulos quedan al final; los empates conservan su
orden original. Cambiar la ordenación vuelve a la primera página. Al reducir
datos se limita la página activa a un valor válido. `getRowId` recibe el índice
original; se recomienda devolver siempre un identificador estable del dominio.

`ErrorState` deshabilita el reintento mientras se resuelve, evita llamadas
duplicadas y muestra un mensaje si la promesa falla. El consumidor actualiza
los datos y cambia al estado de éxito. El catálogo `/components` incluye una
demostración con servicio asíncrono y recuperación de 13 registros.

### Tabla única y código heredado

`TableFrame`, exportado desde `DataTable.tsx`, contiene el único elemento
`<table>` del código TSX. DataTable lo usa para ordenar/paginar; AdminTable es
un adaptador de sus filas existentes, y la factura también lo consume.
Esos dos consumidores conservan sus clases y formato heredados. No se migró
su lógica de negocio ni su estilo completo; no introducir otro renderizador.

### Tema y dependencias

`presentation.css` utiliza tokens `--ui-*` del punto de entrada
`src/styles/tokens.css`. El archivo `presentation-tokens.css` es un puente
provisional a los colores base actuales, no la entrega de WEB-03. Reconciliar
paleta semántica, medidas y tipografía con WEB-03 antes del merge de WEB-13.

Los controles nativos internos `.ui-action` permiten probar reintento y
paginación mientras falta WEB-04; no se exporta una implementación alternativa
de Button. Sustituirlos por el componente oficial al integrarlo. Incorporar al
catálogo todas las variantes y estados de Button, Input, Select, Modal y
DatePicker de WEB-04; hoy solo se señala su ausencia.

### Verificación

Ejecutar `npm run test:presentation`: 8 pruebas sobre ordenación, paginación,
datos vacíos, reintento, estados accesibles, catálogo y tablas heredadas. La
compilación de pruebas incluye los consumidores heredados aunque el chequeo
TypeScript habitual los excluya. No sustituye una revisión visual en navegador.
