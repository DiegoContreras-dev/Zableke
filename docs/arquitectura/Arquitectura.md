# Arquitectura del Proyecto

Base: arquitectura por capas + modular por dominio, en un **único proyecto Next.js** con **GraphQL** (Apollo Server) como API.

## Estructura del Proyecto

```
zableke/
├── app/                            # Next.js App Router
│   ├── (public)/                   # Páginas públicas (login, landing)
│   ├── (dashboard)/                # Páginas protegidas (panel principal)
│   ├── api/
│   │   └── graphql/
│   │       └── route.ts            # Apollo Server endpoint
│   └── layout.tsx
│
├── src/
│   ├── modules/                    # Lógica de negocio (backend)
│   │   ├── auth/                   # Autenticación (Auth.js)
│   │   ├── users/                  # Gestión de usuarios
│   │   ├── roles/                  # RBAC (Admin/Tutor)
│   │   ├── schedules/              # Horarios de tutorías
│   │   ├── attendance/             # Control de asistencia
│   │   ├── notifications/          # Notificaciones por email
│   │   └── audit/                  # Auditoría y logs
│   │
│   ├── graphql/
│   │   ├── schema/                 # Type definitions (.graphql)
│   │   ├── resolvers/              # Resolvers por módulo
│   │   └── context.ts              # Auth context + Prisma client
│   │
│   ├── common/
│   │   ├── guards/                 # Auth guards, RBAC checks
│   │   ├── validators/             # Zod schemas (validación backend)
│   │   └── utils/
│   │
│   ├── infrastructure/
│   │   ├── prisma/                 # Prisma client singleton
│   │   └── email/                  # Email service (transaccional)
│   │
│   └── lib/
│       ├── apollo-client.ts        # Cliente Apollo (frontend)
│       └── validators/             # Zod schemas compartidos
│
├── components/
│   ├── ui/                         # Componentes reutilizables globales
│   └── shared/                     # Componentes de negocio compartidos
│
├── modules/                        # Módulos frontend
│   ├── auth/                       # components, hooks, services, types
│   ├── users/
│   ├── roles/
│   ├── schedules/
│   ├── attendance/
│   └── notifications/
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

## Reglas del Backend (src/modules/)

- Cada módulo sigue capas internas: **resolvers → service → repository → model**.
- La validación de reglas críticas (RBAC, conflicto de horario) vive en **service**, no en frontend.
- Los resolvers solo delegan al service; no contienen lógica de negocio.
- Los repositories son los únicos que acceden a Prisma.

## Reglas del Frontend (modules/)

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
- Compartidos solo en `src/common` (backend) y `components/shared` o `src/lib` (frontend).
- Toda nueva feature debe incluir test y validaciones.
- El archivo `.env` se mantiene en raíz y no dentro de subcarpetas.
