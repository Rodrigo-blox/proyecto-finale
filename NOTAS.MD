Basándome en el análisis del código y la documentación existente, aquí está mi análisis y plan detallado para la separación de roles:
📊 Análisis de Permisos Actuales en el Backend
Según el código actual, los permisos están así:
ADMIN (Acceso completo)
✅ Gestión de usuarios (crear, editar, desactivar)
✅ Todas las operaciones de SUPERVISOR
✅ Todas las operaciones de TÉCNICO
✅ Ver auditoría completa
SUPERVISOR (Gestión y visualización)
✅ Crear/editar/eliminar NAPs
✅ Crear/editar/eliminar clientes
✅ Crear/editar/eliminar planes
✅ Crear/finalizar conexiones
✅ Crear puertos para NAPs
✅ Ver todos los reportes
✅ Ver auditoría
❌ Gestión de usuarios
❌ Editar puertos directamente
❌ Registrar mantenimientos
TÉCNICO (Operaciones de campo)
✅ Ver NAPs (consulta)
✅ Actualizar NAPs
✅ Editar puertos (asignar/liberar clientes)
✅ Actualizar conexiones
✅ Crear/editar mantenimientos
❌ Crear/eliminar NAPs
❌ Crear/eliminar clientes
❌ Crear/eliminar planes
❌ Finalizar conexiones
❌ Ver reportes avanzados
❌ Ver auditoría
❌ Gestión de usuarios
🎯 Plan Propuesto para Frontend

1. ADMIN (Administrador del Sistema)
   Rol: Control total del sistema Puede hacer:
   ✅ Gestionar usuarios (crear, editar, desactivar, cambiar roles)
   ✅ Ver y exportar auditoría completa
   ✅ Generar todos los reportes (PDF/Excel)
   ✅ Ver estadísticas y dashboards completos
   ✅ Crear/editar/eliminar NAPs
   ✅ Crear/editar/eliminar clientes
   ✅ Crear/editar/eliminar planes
   ✅ Gestionar conexiones (crear, editar, finalizar)
   ✅ Gestionar puertos (crear, editar, asignar, liberar)
   ✅ Ver y gestionar mantenimientos
   ✅ Ver notificaciones/alertas
   ✅ Acceso a todas las secciones del sistema
   En el frontend mostrar:
   Todos los menús y secciones
   Todos los botones de acción
   Sección "Usuarios"
   Sección "Auditoría"
   Todos los reportes
2. SUPERVISOR (Supervisor de Operaciones)
   Rol: Gestiona la infraestructura y clientes, genera reportes Puede hacer:
   ✅ Ver mapa con NAPs
   ✅ Crear/editar/eliminar NAPs
   ✅ Crear/editar/eliminar clientes
   ✅ Crear/editar/eliminar planes
   ✅ Crear/finalizar conexiones de clientes
   ✅ Ver estado de puertos (solo consulta)
   ✅ Ver lista de mantenimientos (solo consulta)
   ✅ Generar reportes (ocupación, consumo, técnico)
   ✅ Ver y exportar auditoría
   ✅ Ver notificaciones/alertas
   ✅ Ver estadísticas del sistema
   ❌ Gestionar usuarios
   ❌ Editar puertos directamente (asignar/liberar)
   ❌ Registrar mantenimientos
   En el frontend ocultar/desactivar:
   ❌ Menú "Usuarios"
   ❌ Botones de "Asignar Cliente" y "Liberar Puerto" en mapa
   ❌ Botones "Crear/Editar/Eliminar" en mantenimientos
   ✅ Puede ver mantenimientos pero no crearlos/editarlos
3. TÉCNICO (Técnico de Campo)
   Rol: Ejecuta trabajo de campo, actualiza NAPs y registra mantenimientos Puede hacer:
   ✅ Ver mapa con NAPs
   ✅ Ver detalles de NAPs
   ✅ Actualizar información de NAPs (estado, observaciones)
   ✅ Ver lista de clientes (solo consulta)
   ✅ Asignar/liberar puertos a clientes
   ✅ Actualizar estado de conexiones
   ✅ Crear/editar/eliminar mantenimientos
   ✅ Ver notificaciones/alertas
   ❌ Crear/eliminar NAPs
   ❌ Crear/editar/eliminar clientes
   ❌ Crear/editar/eliminar planes
   ❌ Crear/finalizar conexiones
   ❌ Ver reportes avanzados
   ❌ Ver auditoría
   ❌ Gestionar usuarios
   En el frontend ocultar/desactivar:
   ❌ Menú "Usuarios"
   ❌ Menú "Auditoría"
   ❌ Menú "Reportes"
   ❌ Menú "Planes"
   ❌ Botón "Crear NAP" en mapa
   ❌ Botón "Eliminar NAP" en detalles
   ❌ Botones "Crear/Editar/Eliminar" en clientes
   ❌ Sección de estadísticas en mapa
   ✅ Solo puede ver mapa, NAPs, puertos, mantenimientos
   📋 Implementación Técnica
   Archivos a modificar:
   frontend/src/app/stores/auth.store.ts
   Añadir computed signals para permisos:
   isAdmin()
   isSupervisor()
   isTecnico()
   canManageUsers()
   canViewAuditoria()
   canGenerateReports()
   canCreateNAP()
   canDeleteNAP()
   canManageClients()
   canManagePlanes()
   canManageConnections()
   canEditPorts()
   canManageMaintenances()
   frontend/src/app/app.routes.ts
   Añadir guards de navegación basados en rol
   Bloquear acceso a rutas según permisos
   Componentes a actualizar:
   mapa-new.html: Ocultar botones según rol
   usuarios/: Solo visible para ADMIN
   auditoria/: Solo ADMIN y SUPERVISOR
   Sidebar/Navigation: Mostrar solo menús permitidos
   NAPs detalle: Condicionar botones de editar/eliminar
   Clientes: Condicionar CRUD según rol
   Planes: Condicionar CRUD según rol
   Mantenimientos: TÉCNICO puede crear, SUPERVISOR solo ver
   Reportes: Solo ADMIN y SUPERVISOR
   Crear servicio de permisos:
   frontend/src/app/services/permissions.service.ts
   Centralizar lógica de permisos
   Inyectar en componentes
   🔍 Resumen de Diferencias Clave
   Funcionalidad ADMIN SUPERVISOR TÉCNICO
   Gestionar usuarios ✅ ❌ ❌
   Ver auditoría ✅ ✅ ❌
   Generar reportes ✅ ✅ ❌
   Crear/Eliminar NAPs ✅ ✅ ❌
   Actualizar NAPs ✅ ✅ ✅
   Gestionar clientes ✅ ✅ ❌ (solo ver)
   Gestionar planes ✅ ✅ ❌ (solo ver)
   Crear conexiones ✅ ✅ ❌
   Asignar/liberar puertos ✅ ❌ ✅
   Crear mantenimientos ✅ ❌ ✅
   Ver estadísticas ✅ ✅ ❌
   ¿Te parece bien esta distribución de permisos? ¿Quieres que proceda con la implementación o prefieres ajustar algún permiso antes?
