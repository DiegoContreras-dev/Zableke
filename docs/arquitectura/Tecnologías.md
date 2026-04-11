# Tecnologías del Proyecto

## Stack principal

- **Lenguaje**: TypeScript
- **Framework web**: Next.js (con React)
- **API**: GraphQL (Apollo Server en Next.js API Routes)
- **UI**: Tailwind CSS
- **ORM**: Prisma
- **Base de datos**: PostgreSQL
- **Gestor de paquetes**: npm
- **Contenedores**: Docker (con Docker Compose)
- **Control de versiones**: Git

## Estado del stack

### Implementado actualmente

- Next.js + React + TypeScript
- GraphQL con `@apollo/server` y `@as-integrations/next`
- Prisma + PostgreSQL
- Docker Compose (app + db)
- ESLint
- Node test runner (`node:test`) para backend

### Planificado (aun no implementado completamente)

- Auth.js (NextAuth)
- `@apollo/client` para frontend
- Zod + React Hook Form
- Playwright (si se define estrategia E2E)
- Husky + lint-staged + Prettier
- CI/CD extendido en `.github/workflows`

## Librerías GraphQL

| Librería | Propósito | Lado |
|---|---|---|
| `graphql` | Core spec de GraphQL | Compartida |
| `@apollo/server` | Servidor GraphQL (endpoint en API Route) | Backend |
| `@apollo/client` | Cliente GraphQL con cache | Frontend (pendiente) |

## Recomendaciones adicionales

- **Autenticación**: Auth.js (NextAuth), restringiendo acceso a dominios institucionales `@alumnos.ucn.cl` y `@ucn.cl`
- **Validación de datos**: Zod
- **Formularios**: React Hook Form + Zod Resolver
- **Logs y auditoría**: Pino + tabla `audit_logs` en PostgreSQL
- **Testing**: Jest (unitarias/integración) + Playwright (E2E)
- **Calidad de código**: ESLint + Prettier + Husky + lint-staged

## Versiones objetivo del repositorio

- Node.js 22+
- Next.js 16
- React 19
- Prisma 6
- PostgreSQL 16
- Tailwind CSS 4
- Apollo Server 5
- Apollo Client (pendiente en frontend)

## Decisiones cerradas del stack (100%)

1. **Arquitectura**: Por capas + modular por dominio.
2. **API**: GraphQL con Apollo Server/Client, endpoint en Next.js API Routes (`src/app/api/graphql/route.ts`).
3. **Backend**: No hay backend separado. Toda la lógica vive dentro del proyecto Next.js.
4. **Autenticación**: Google (Auth.js/NextAuth).
5. **Gestor de paquetes oficial**: npm.
6. **Testing backend actual**: Node test runner para unitarias e integracion.
7. **Automatización de migraciones/tareas**: Scripts `.sh`.
8. **Auditoría avanzada**: Se implementará más adelante.
9. **CI/CD**: GitHub Actions activo para tests backend.
10. **Calidad en PR**: reglas de branch/checks a completar segun estrategia del equipo.
11. **Configuración de entorno**: Variables en `.env` en la raíz (junto a `docker-compose.yml` y `.gitignore`).
