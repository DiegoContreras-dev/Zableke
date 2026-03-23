# Arquitectura del Proyecto

Base: arquitectura por capas + modular por dominio, pensada para crecer sin perder orden.

## Front (Next.js + React + TS)

- app/
- app/(public)/
- app/(dashboard)/
- app/api/ (solo rutas necesarias del frontend)
- modules/
- modules/auth/
- modules/users/
- modules/roles/
- modules/schedules/
- modules/attendance/
- modules/notifications/
- components/ui/ (componentes reutilizables globales)
- components/shared/ (componentes de negocio compartidos)
- styles/ (tailwind, globals, tokens)
- lib/
- lib/http/ (cliente API)
- lib/validators/ (zod schemas)
- lib/utils/

Regla Front:
- Cada modulo en modules/ incluye: components, hooks, services, types.

## Back (API + Logica de negocio)

- src/
- src/modules/
- src/modules/auth/
- src/modules/users/
- src/modules/roles/
- src/modules/schedules/
- src/modules/attendance/
- src/modules/notifications/
- src/modules/audit/
- src/common/
- src/common/middlewares/ (auth, rbac, error handler)
- src/common/validators/ (zod)
- src/common/utils/
- src/config/ (logger, app config)
- src/infrastructure/
- src/infrastructure/prisma/
- src/infrastructure/email/

Regla Back:
- Cada modulo sigue capas internas: controller -> service -> repository -> model.
- La validacion de reglas criticas (RBAC, conflicto de horario) vive en service, no en frontend.

## BD (PostgreSQL + Prisma)

- prisma/
- prisma/schema.prisma
- prisma/migrations/
- prisma/seed.ts
- db/scripts/
- db/scripts/init.sh
- db/scripts/backup.sh
- db/scripts/restore.sh

Entidades base sugeridas:
- users
- roles
- user_roles
- tutors
- rooms
- schedules
- attendances
- notifications
- audit_logs

Regla BD:
- Toda modificacion estructural va por migraciones Prisma versionadas.

## CI/Calidad (GitHub Actions + SonarCloud)

- .github/workflows/ci.yml
- .env (en la raiz del proyecto)
- docker-compose.yml (en la raiz del proyecto)
- .gitignore (en la raiz del proyecto)
- Checks obligatorios en PR:
- lint
- typecheck
- jest
- playwright (segun estrategia de rama)
- sonarcloud quality gate

## Convenciones de largo plazo

- Un modulo por dominio de negocio, no por tipo tecnico.
- Evitar dependencias cruzadas entre modulos.
- Compartidos solo en common (back) y components/shared o lib (front).
- Toda nueva feature debe incluir test y validaciones.
- El archivo .env se mantiene en raiz y no dentro de carpetas del backend.
