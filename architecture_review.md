# Revisión de Arquitectura — Estado Actual (2026-04-11)

## Resumen

El proyecto está en fase de implementación temprana del MVP para gestión de tutorías UCN.
La base técnica está operativa (Next.js, GraphQL base, Prisma, Docker), pero la lógica de negocio por módulos aún está en construcción.

## Estado real del repositorio

### Implementado

- Proyecto único Next.js en raíz.
- App Router activo en `src/app`.
- Endpoint GraphQL base en `src/app/api/graphql/route.ts`.
- Contexto GraphQL activo en `src/graphql/context.ts`.
- Cliente Prisma activo en `src/infrastructure/prisma/client.ts`.
- Docker Compose operativo con servicios `app` y `db`.
- Estructura frontend separada en `src/front`.
- Estructura backend creada en `src/backend` (scaffold por módulos y capas).

### En implementación

- Migración del backend activo hacia `src/backend` (actualmente coexiste con `src/graphql` y `src/infrastructure`).
- Lógica de negocio de módulos (`auth`, `users`, `roles`, `schedules`, `attendance`, `notifications`, `audit`).
- Contratos GraphQL por dominio (actualmente schema mínimo de health check).

### Pendiente

- Auth.js y control de acceso institucional completo.
- RBAC funcional por roles Admin/Tutor.
- Validación de conflictos de horario en tiempo real.
- Notificaciones automáticas por correo.
- Auditoría inmutable completa.
- Pipeline CI/CD en `.github/workflows`.
- Suite de pruebas (unit/integration/e2e) conectada a ejecución automatizada.

## Decisiones vigentes

1. API principal: GraphQL sobre Next.js API Routes.
2. Proyecto unificado (sin separación física de app frontend/backend en runtime).
3. Estructura de trabajo: `src/front` para frontend y `src/backend` para backend en desarrollo.
4. Persistencia: Prisma + PostgreSQL.
5. Contenerización: Docker Compose para app y base de datos.

## Riesgos actuales

1. Coexistencia temporal de rutas backend (`src/backend` vs `src/graphql` y `src/infrastructure`) puede causar confusión si no se define una ruta final de migración.
2. Existe API funcional base, pero aún no hay flujo de tutorías completo conectado end-to-end.
3. Sin CI/CD activo, el control de calidad depende de ejecución manual de checks.

## Recomendación inmediata

1. Definir y documentar el primer flujo vertical del MVP: `schedules` (crear/editar/cancelar + validación de conflicto).
2. Implementarlo completo desde módulo backend hasta operación GraphQL.
3. Al cerrar ese flujo, formalizar la convención final de ubicación backend para evitar duplicidad de rutas.
