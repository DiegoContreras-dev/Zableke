# Arquitectura del Proyecto

Base: arquitectura por capas + modular por dominio, en un **único proyecto Next.js** con **GraphQL** (Apollo Server) como API.

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
│   ├── front/                      # Todo el avance del frontend
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   └── shared/
│   │   ├── modules/                # auth, users, roles, schedules, etc.
│   │   └── lib/                    # apollo-client, validators, utils
│   │
│   ├── backend/                    # Backend por modulos y capas (en implementacion)
│   │   ├── common/
│   │   ├── config/
│   │   ├── infrastructure/
│   │   ├── modules/
│   │   └── test/
│   │
│   ├── graphql/                    # Contexto GraphQL activo (transicion)
│   │   └── context.ts
│   │
│   └── infrastructure/             # Prisma activo usado por API (transicion)
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
├── docker-compose.yml
├── .env
├── package.json                    # npm
└── .gitignore
```

## Reglas del Backend (src/backend/)

- El backend se implementa en `src/backend/` por dominio.
- Cada módulo seguirá capas internas: **resolvers → service → repository → model**.
- Mientras dure la migracion, `src/graphql/context.ts` y `src/infrastructure/prisma` siguen activos para la API.

## Reglas del Frontend (src/front/modules/)

- Cada módulo incluye: `components/`, `hooks/`, `services/`, `types/`.
- Los services del frontend usan Apollo Client para queries/mutations.
- Validación de formularios con Zod + React Hook Form.

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

## CI/Calidad (GitHub Actions + Jenkins)

- `.github/workflows/ci.yml`
- Checks obligatorios en PR:
  - lint
  - typecheck
  - jest
  - playwright (según estrategia de rama)
  - Jenkins quality gate

## Convenciones de largo plazo

- Un módulo por dominio de negocio, no por tipo técnico.
- Evitar dependencias cruzadas entre módulos.
- Compartidos frontend en `src/front/components/shared` o `src/front/lib`.
- Migrar gradualmente los elementos backend en `src/graphql` y `src/infrastructure` hacia `src/backend`.
- Toda nueva feature debe incluir test y validaciones.
- El archivo `.env` se mantiene en raíz y no dentro de subcarpetas.
