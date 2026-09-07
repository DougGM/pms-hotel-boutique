# Arquitectura del Frontend

```text
src/
  public/                 Vistas disponibles sin sesión
    page.tsx              Entrada pública
    pages/                Páginas públicas adicionales
    components/           Componentes exclusivos de la zona pública
  private/                Vistas autenticadas de empleados y administración
    page.tsx              Layout con menú principal
    pages/                Páginas privadas que combinan módulos
    components/           Componentes exclusivos del layout privado
    guards/               Protección de sesión y permisos
    routes/               Definición de rutas privadas
  layouts/                Layouts conectados a React Router
  pages/                  Páginas base conectadas a las rutas
  modules/                Lógica por dominio de negocio
    <modulo>/
      models/             Modelos de dominio
      dtos/               Contratos de datos
      mappers/            Conversión DTO/modelo
      adapters/           Integración con fuentes externas
      services/           Lógica y llamadas de datos
      components/         Componentes propios del módulo
  shared/                 Código reutilizable por todo el frontend
    components/           Button, Input, Modal, DataTable, Pagination, etc.
    constants/            Constantes globales
    hooks/                Hooks reutilizables
    lib/                  Configuración de librerías
    types/                Tipos transversales
    utils/                Funciones utilitarias puras
  services/               Cliente HTTP y servicios transversales
  assets/                 Imágenes, fuentes e iconos propios
  styles/                 Tokens, estilos globales y temas
  app/router.tsx          Configuración explícita de React Router
  app/routes.ts           Catálogo tipado y constantes de rutas
```

## Reglas

- Una vista sin sesión se crea en `public/pages/`.
- Una vista autenticada se crea en `private/pages/`; su lógica de negocio se
  consume desde el módulo correspondiente.
- Todo lo específico de un dominio se coloca en `modules/<modulo>/`.
- Solo código reutilizable por dos o más áreas debe estar en `shared/`.
- No agregar lógica nueva a `src/app/` o `src/components/`; son la capa
  temporal heredada de Bolt que se migrará de forma gradual. Las excepciones
  son `src/app/router.tsx` y `src/app/routes.ts`, que configuran la navegación
  y centralizan sus URL. El router y los enlaces deben referenciar el catálogo.
- Auth vive en `modules/auth/`; su proveedor envuelve el router desde `main.tsx`.
  El login está en `public/pages/StaffLoginPage.tsx`. Las guardas y el catálogo
  de navegación por permiso se mantienen en `private/guards/` y `private/routes/`.
  La fachada de auth consume `services/authService.ts` y los tipos compartidos.
  No crear otra persistencia ni duplicar DTOs de usuario. Consultar
  `modules/auth/README.md` para el contrato y la política de permisos.
