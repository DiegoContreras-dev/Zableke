# Arquitectura del Proyecto

Base: arquitectura por capas + modular por dominio, en un unico proyecto Next.js con GraphQL (Apollo Server) como API.

## Estructura del Proyecto

```
zableke/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (public)/               # Páginas públicas (login, landing)
│   │   ├── (dashboard)/            # Páginas protegidas (panel principal)
│   │   ├── api/
│   │   │   └── graphql/
│   │   │       └── route.ts        # Apollo Server endpoint
│   │   └── layout.tsx
│   │
│   ├── frontend/                   # Todo el avance del frontend
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   └── shared/
│   │   ├── modules/                # auth, users, roles, schedules, etc.
│   │   └── lib/                    # apollo-client, validators, utils
│   │
│   ├── backend/                    # Backend por modulos y capas
│   │   ├── common/
│   │   ├── config/
│   │   ├── infrastructure/
│   │   ├── modules/
│   │   ├── scripts/
│   │   └── test/
│   │
│   ├── graphql/                    # Contexto GraphQL
│   │   └── context.ts
│   │
│   └── infrastructure/             # Prisma usado por API
│       └── prisma/
│
├── styles/                         # Tailwind, globals, tokens
│
├── prisma/
│   ├── schema.prisma               # Esquema de la BD
│   ├── migrations/                 # Migraciones versionadas
│   └── seed.ts                     # Datos iniciales
│
├── db/
│   └── scripts/
│       ├── init.sh                 # Inicialización del contenedor PG
│       ├── backup.sh               # Backup de BD
│       └── restore.sh              # Restauración de BD
│
├── compose.yaml
├── .env
├── package.json                    # npm
└── .gitignore
```

## Reglas del Backend (src/backend/)

- El backend se implementa en `src/backend/` por dominio.
- Cada modulo sigue capas internas: `resolvers -> service -> repository -> model`.
- `src/graphql/context.ts` y `src/infrastructure/prisma` son piezas activas del backend runtime.

## Reglas del Frontend (src/frontend/modules/)

- Cada módulo incluye: `components/`, `hooks/`, `services/`, `types/`.
- Los services del frontend usan Apollo Client para queries/mutations.
- Validación de formularios manual (`useState` + validadores propios). Zod + React Hook Form siguen planificados, no adoptados.

## Regla BD (prisma/)

- Toda modificación estructural va por migraciones Prisma versionadas.
- El esquema vive en `prisma/schema.prisma` en la raíz del proyecto.

## Entidades base

- users
- roles
- user_roles
- tutors
- rooms
- schedules
- attendances
- notifications
- audit_logs

## CI/Calidad

- Workflow actual: `.github/workflows/backend-tests.yml`
- Estrategia actual:
  - tests backend (unitario/servicio) en workflow
  - tests de integracion por comando dedicado

## Convenciones de largo plazo

- Un módulo por dominio de negocio, no por tipo técnico.
- Evitar dependencias cruzadas entre módulos.
- Compartidos frontend en `src/frontend/components/shared` o `src/frontend/lib`.
- Toda nueva feature de backend debe incluir test unitario o de integracion.
- El archivo `.env` se mantiene en raíz y no dentro de subcarpetas.

## Estado funcional actual

- Epica 2 backend: implementada (auth institucional + Google).
- Epica 3 backend: implementada (RBAC y gestion de roles).
- Epica 4: implementada (ofertas de tutoria, horarios, inscripciones, generacion de Google Form, asistencia).
- Auditoria (`audit_logs`): implementada de forma best-effort sobre Offering/Enrollment/Schedule.
- Notificaciones (`notifications`): pendiente, sin implementar.
