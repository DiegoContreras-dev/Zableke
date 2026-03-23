# Arquitectura del Proyecto

Base: arquitectura por capas + modular por dominio, pensada para crecer sin perder orden.

## Front (Next.js + React + TS)

- App/Front/app/
- App/Front/app/(public)/
- App/Front/app/(dashboard)/
- App/Front/app/api/ (solo rutas necesarias del frontend)
- App/Front/modules/
- App/Front/modules/auth/
- App/Front/modules/users/
- App/Front/modules/roles/
- App/Front/modules/schedules/
- App/Front/modules/attendance/
- App/Front/modules/notifications/
- App/Front/components/ui/ (componentes reutilizables globales)
- App/Front/components/shared/ (componentes de negocio compartidos)
- App/Front/styles/ (tailwind, globals, tokens)
- App/Front/lib/
- App/Front/lib/http/ (cliente API)
- App/Front/lib/validators/ (zod schemas)
- App/Front/lib/utils/

Regla Front:
- Cada modulo en modules/ incluye: components, hooks, services, types.

## Back (API + Logica de negocio)

- App/Back/src/
- App/Back/src/modules/
- App/Back/src/modules/auth/
- App/Back/src/modules/users/
- App/Back/src/modules/roles/
- App/Back/src/modules/schedules/
- App/Back/src/modules/attendance/
- App/Back/src/modules/notifications/
- App/Back/src/modules/audit/
- App/Back/src/common/
- App/Back/src/common/middlewares/ (auth, rbac, error handler)
- App/Back/src/common/validators/ (zod)
- App/Back/src/common/utils/
- App/Back/src/config/ (logger, app config)
- App/Back/src/infrastructure/
- App/Back/src/infrastructure/prisma/
- App/Back/src/infrastructure/email/

Regla Back:
- Cada modulo sigue capas internas: controller -> service -> repository -> model.
- La validacion de reglas criticas (RBAC, conflicto de horario) vive en service, no en frontend.

## BD (PostgreSQL + Prisma)

- App/BD/prisma/
- App/BD/prisma/schema.prisma
- App/BD/prisma/migrations/
- App/BD/prisma/seed.ts
- App/BD/db/scripts/
- App/BD/db/scripts/init.sh
- App/BD/db/scripts/backup.sh
- App/BD/db/scripts/restore.sh

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
