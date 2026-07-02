# Tecnologías del Proyecto

## Stack principal

- **Lenguaje**: TypeScript
- **Framework web**: Next.js (con React)
- **API**: GraphQL (Apollo Server en Next.js API Routes)
- **UI**: Tailwind CSS
- **ORM**: Prisma
- **Base de datos**: PostgreSQL
- **Gestor de paquetes**: npm
- **Contenedores**: Docker / Podman (con `compose.yaml` — Compose Spec estándar)
- **Control de versiones**: Git

## Estado del stack

### Implementado actualmente

- Next.js + React + TypeScript
- GraphQL con `@apollo/server` y `@as-integrations/next`
- `@apollo/client` en el frontend (`src/frontend/lib/apollo-client.ts`, `ApolloWrapper.tsx`)
- Prisma + PostgreSQL
- `compose.yaml` compatible con Docker y Podman (app + db)
- ESLint
- Node test runner (`node:test`) para backend (unitario e integracion)
- Autenticación institucional propia por email (`authenticateWithEmail`) + Google Identity Services (`authenticateWithGoogle`, ID token, sin NextAuth)
- JWT firmado (`jose`) para sesiones, verificado en `src/graphql/context.ts` via header `Authorization: Bearer <token>`
- AuditLog (best-effort) sobre operaciones de Offering/Enrollment/Schedule
- Integración con Google Drive (fotos de perfil, carpetas de tutores) y Google Forms (generación automática de formularios de inscripción)

### Planificado (aun no implementado)

- Zod + React Hook Form
- Playwright (E2E) — no instalado
- Husky + lint-staged + Prettier
- Notificaciones automáticas por correo (`src/backend/modules/notifications/` solo tiene estructura, sin lógica)
- CI/CD extendido en `.github/workflows` mas alla de tests backend

## Librerías GraphQL

| Librería | Propósito | Lado |
|---|---|---|
| `graphql` | Core spec de GraphQL | Compartida |
| `@apollo/server` | Servidor GraphQL (endpoint en API Route) | Backend |
| `@apollo/client` | Cliente GraphQL con cache | Frontend (implementado) |

## Recomendaciones adicionales

- **Autenticación**: ya no es una recomendación, está implementada — email institucional propio + Google Identity Services, restringido a dominios `@alumnos.ucn.cl` y `@ucn.cl`, con JWT firmado
- **Validación de datos**: manual/custom (DTOs propios). Zod sigue siendo una mejora planificada, no adoptada
- **Formularios**: manejo manual con `useState`. React Hook Form sigue planificado, no adoptado
- **Logs y auditoría**: `AuditLog` en PostgreSQL implementado (best-effort, no bloqueante). Pino no está instalado — logging sigue siendo `console.error` puntual
- **Testing**: Node test runner (`node:test`), no Jest. Playwright no está instalado, sin estrategia E2E definida
- **Calidad de código**: solo ESLint activo. Prettier/Husky/lint-staged siguen planificados

## Versiones objetivo del repositorio

- Node.js 22+ (verificar `@types/node` en `package.json` cubra la version en uso)
- Next.js 16
- React 19
- Prisma 6
- PostgreSQL 16
- Tailwind CSS 4
- Apollo Server 5
- Apollo Client 4.x (implementado en frontend)

## Decisiones cerradas del stack (100%)

1. **Arquitectura**: Por capas + modular por dominio.
2. **API**: GraphQL con Apollo Server/Client, endpoint en Next.js API Routes (`src/app/api/graphql/route.ts`).
3. **Backend**: No hay backend separado. Toda la lógica vive dentro del proyecto Next.js.
4. **Autenticación**: email institucional propio (`authenticateWithEmail`) + Google Identity Services (`authenticateWithGoogle`), con JWT firmado propio. No se usa Auth.js/NextAuth.
5. **Gestor de paquetes oficial**: npm.
6. **Testing backend actual**: Node test runner para unitarias e integracion.
7. **Automatización de migraciones/tareas**: Scripts `.sh` y `.cjs` (`db/scripts/db-sync.cjs`).
8. **Auditoría**: implementada de forma best-effort sobre Offering/Enrollment/Schedule; no bloquea la operación principal si falla.
9. **CI/CD**: GitHub Actions activo para tests backend.
10. **Calidad en PR**: reglas de branch/checks a completar segun estrategia del equipo.
11. **Configuración de entorno**: Variables en `.env` en la raíz (junto a `compose.yaml` y `.gitignore`).
