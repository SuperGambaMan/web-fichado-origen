Esta carpeta contiene versiones estáticas en HTML puro de las páginas del dashboard para poder probar estilos CSS sin usar TypeScript o Next.js.

Estructura:
- index.html -> Login
- dashboard/index.html -> Vista principal del dashboard
- dashboard/history.html -> Pestaña Historial
- dashboard/users.html -> Pestaña Usuarios
- dashboard/time-entries.html -> Pestaña Fichajes
- dashboard/audit.html -> Pestaña Auditoría
- components/ -> fragmentos HTML reutilizables (header, sidebar, tarjetas, widget)

Uso:
- Abre cualquiera de los archivos HTML en un navegador (por ejemplo: design/dashboard/index.html).
- Edita tu CSS en un fichero separado y enlázalo desde los HTML o usa estilos inline para pruebas rápidas.

Nota: Estos archivos son estáticos y contienen marcadores de posición donde la aplicación real renderiza datos dinámicos. Están pensados sólo para diseño y pruebas visuales.
