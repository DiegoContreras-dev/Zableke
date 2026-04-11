# Revisión de Arquitectura — Estado Actual (2026-04-11)

## Resumen

El proyecto está en fase MVP con backend funcional para las épicas 2 y 3.
La base técnica está operativa (Next.js, GraphQL, Prisma, Docker, tests backend, workflow CI de tests).

## Estado real del repositorio

### Implementado

- Proyecto único Next.js en raíz.
- App Router activo en `src/app`.
- Endpoint GraphQL operativo en `src/app/api/graphql/route.ts`.
- Contexto GraphQL activo en `src/graphql/context.ts`.
- Cliente Prisma activo en `src/infrastructure/prisma/client.ts`.
- Docker Compose operativo con servicios `app` y `db`.
- Estructura frontend separada en `src/front`.
- Estructura backend activa en `src/backend` por módulos y capas.
- Auth institucional backend implementado y testeado.
- RBAC backend implementado y testeado.
- Tests backend unitarios + integracion ejecutables por scripts npm.
- Workflow GitHub Actions para tests backend (`.github/workflows/backend-tests.yml`).

### En implementación

- Lógica de negocio de módulos `schedules`, `attendance`, `notifications`, `audit`.
- Contratos GraphQL de esos dominios aún no implementados.

### Pendiente

- Validación de conflictos de horario en tiempo real.
- Notificaciones automáticas por correo.
- Auditoría inmutable completa.
- Tests E2E y estrategia CI extendida para integración automática con BD de pruebas.

## Decisiones vigentes

1. API principal: GraphQL sobre Next.js API Routes.
2. Proyecto unificado (sin separación física de app frontend/backend en runtime).
3. Estructura de trabajo: `src/front` para frontend y `src/backend` para backend en desarrollo.
4. Persistencia: Prisma + PostgreSQL.
5. Contenerización: Docker Compose para app y base de datos (imágenes Alpine).

## Riesgos actuales

1. Flujos de negocio centrales del MVP (horarios/notificaciones/auditoría) no están cerrados aún.
2. Integración tests depende de que exista una BD disponible y sincronizada.
3. Falta endurecer autenticación de request para producción (hoy se usa contexto por cabecera de usuario para autorización en resolvers).

## Recomendación inmediata

1. Implementar épica 4: CRUD de horarios con validación de conflicto en tiempo real.
2. Agregar auditoría de operaciones críticas de roles y horarios.
3. Agregar notificaciones automáticas para creación/edición/cancelación de tutorías.
