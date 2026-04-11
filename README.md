# Zableke

Sistema de gestion de tutorias UCN implementado como proyecto unico con Next.js en raiz.

## Estructura oficial

- `src/` es la fuente de verdad del codigo.
- `src/front/` concentra el avance del frontend (components, modules, lib).
- `src/backend/` concentra backend por capas y modulos de dominio.
- `src/app/` mantiene App Router y API Routes de Next.js.
- `src/graphql/` y `src/infrastructure/` contienen contexto GraphQL y cliente Prisma.
- `prisma/` contiene schema, migraciones y seed.
- `db/scripts/` contiene scripts operativos de base de datos.

## Desarrollo local

```bash
npm install
npm run dev
```

Servidor local: http://localhost:3000

## Docker

Levantar con build:

```bash
docker compose up --build
```

Levantar en segundo plano:

```bash
docker compose up -d
```

Detener servicios:

```bash
docker compose down
```

## Scripts disponibles

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run test:backend` (unitario/servicio)
- `npm run test:backend:integration` (integracion con BD)
- `npm run test:backend:all` (suite completa backend)
- `npm run db:check`
- `npm run db:generate`
- `npm run db:migrate`
- `npm run db:push`
- `npm run db:seed`

## GraphQL backend

Endpoint: `POST /api/graphql`

Operaciones actualmente expuestas (backend):

- Query `health`
- Mutation `authenticateWithEmail`
- Query `roleAccessPreview`
- Query `myAccess`
- Query `usersAccess`
- Mutation `assignRoleToUser`
- Mutation `removeRoleFromUser`

RBAC aplicado en backend:

- `usersAccess` requiere permiso `READ_ALL_SCHEDULES`
- `assignRoleToUser` y `removeRoleFromUser` requieren permiso `MANAGE_TUTORS`

## Nota de estructura y alcance

La carpeta `App/` fue descartada por duplicacion de estructura. El desarrollo debe hacerse solo sobre `src/`.
`src/app/` no se mueve a `src/front/` porque Next.js requiere el App Router en `app/` o `src/app/`.

## Estado actual

- Epica 1 completada (base de arquitectura e infraestructura).
- Epica 2 completada en backend (autenticacion institucional + tests).
- Epica 3 completada en backend (RBAC + gestion de roles + tests unitarios e integracion).
- Integracion backend-BD activa con Prisma usando `DATABASE_URL` desde variables de entorno.
- CI de tests backend disponible en `.github/workflows/backend-tests.yml`.
