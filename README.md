# Zableke

Sistema de tutorias UCN implementado como proyecto unico con Next.js en raiz.

## Estructura oficial

- `src/` es la fuente de verdad del codigo.
- `src/front/` concentra el avance del frontend (components, modules, lib).
- `src/backend/` concentra el scaffolding del backend por modulos y capas.
- `src/app/` se mantiene para App Router y API Routes de Next.js.
- `src/graphql/` y `src/infrastructure/` contienen el contexto GraphQL y Prisma actualmente usados por la API.
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
- `npm run db:generate`
- `npm run db:migrate`
- `npm run db:push`
- `npm run db:seed`

## Nota de estructura

La carpeta `App/` fue descartada por duplicacion de estructura. El desarrollo debe hacerse solo sobre `src/`.
`src/app/` no se mueve a `src/front/` porque Next.js requiere el App Router en `app/` o `src/app/`.

## Estado actual

- Docker de app + db funcional con `docker compose up --build`.
- Endpoint GraphQL base operativo en `src/app/api/graphql/route.ts`.
- Backend en implementacion: existe estructura, pero las reglas de negocio del MVP aun no estan completas.
