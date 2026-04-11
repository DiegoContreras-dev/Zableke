# Tecnologías del Proyecto

## Stack principal

- **Lenguaje**: TypeScript
- **Framework web**: Next.js (con React)
- **API**: GraphQL (Apollo Server en Next.js API Routes)
- **UI**: Tailwind CSS
- **Componentes UI**: shadcn/ui
- **ORM**: Prisma
- **Base de datos**: PostgreSQL
- **Gestor de paquetes**: npm
- **Contenedores**: Docker (con Docker Compose)
- **Control de versiones**: Git

## Librerías GraphQL

| Librería | Propósito | Lado |
|---|---|---|
| `graphql` | Core spec de GraphQL | Compartida |
| `@apollo/server` | Servidor GraphQL (endpoint en API Route) | Backend |
| `@apollo/client` | Cliente GraphQL con cache | Frontend |
| `graphql-tag` | Template literals para queries/mutations | Compartida |
| `@graphql-codegen/cli` | Generación automática de tipos desde schema | Dev tooling |

## Recomendaciones adicionales

- **Autenticación**: Auth.js (NextAuth), restringiendo acceso a dominios institucionales `@alumnos.ucn.cl` y `@ucn.cl`
- **Validación de datos**: Zod
- **Formularios**: React Hook Form + Zod Resolver
- **Logs y auditoría**: Pino + tabla `audit_logs` en PostgreSQL
- **Testing**: Jest (unitarias/integración) + Playwright (E2E)
- **Calidad de código**: ESLint + Prettier + Husky + lint-staged

## Versiones sugeridas

- Node.js 22 LTS
- Next.js 15
- React 19
- Prisma 6
- PostgreSQL 16
- Tailwind CSS 4
- Apollo Server 4
- Apollo Client 3

## Decisiones cerradas del stack (100%)

1. **Arquitectura**: Por capas + modular por dominio.
2. **API**: GraphQL con Apollo Server/Client, endpoint en Next.js API Routes (`src/app/api/graphql/route.ts`).
3. **Backend**: No hay backend separado. Toda la lógica vive dentro del proyecto Next.js.
4. **Autenticación**: Google (Auth.js/NextAuth).
5. **Gestor de paquetes oficial**: npm.
6. **Testing**: Jest para unitarias/integración y Playwright para E2E.
7. **Automatización de migraciones/tareas**: Scripts `.sh`.
8. **Auditoría avanzada**: Se implementará más adelante.
9. **CI/CD**: GitHub Actions.
10. **Calidad en PR**: Jenkins como quality gate (análisis estático, bugs, code smells y cobertura).
11. **Configuración de entorno**: Variables en `.env` en la raíz (junto a `docker-compose.yml` y `.gitignore`).
