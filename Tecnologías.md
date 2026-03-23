# Tecnologías del Proyecto

## Stack principal

- **Lenguaje**: TypeScript
- **Framework web**: Next.js (con React)
- **UI**: Tailwind CSS
- **ORM**: Prisma
- **Base de datos**: PostgreSQL
- **Gestor de paquetes**: pnpm
- **Contenedores**: Docker (con Docker Compose)
- **Control de versiones**: Git

## Recomendaciones adicionales

- **Autenticación**: Auth.js (NextAuth), restringiendo acceso a dominios institucionales `@alumnos.ucn.cl` y `@ucn.cl`
- **Validación de datos**: Zod
- **Componentes UI base**: shadcn/ui
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
- pnpm 10

## Decisiones cerradas del stack (100%)

1. **Arquitectura**: Por capas.
2. **Autenticación**: Google (Auth.js/NextAuth).
3. **Gestor de paquetes oficial**: pnpm.
4. **Testing**: Jest para unitarias/integración y Playwright para E2E.
5. **Automatización de migraciones/tareas**: Scripts `.sh`.
6. **Auditoría avanzada**: Se implementará más adelante.
7. **CI/CD**: GitHub Actions.
8. **Calidad en PR**: SonarCloud como quality gate (análisis estático, bugs, code smells y cobertura).
9. **Configuración de entorno**: Variables en `.env` en la raíz (junto a `docker-compose.yml` y `.gitignore`).
