# Zableke

Sistema de tutorias UCN implementado como proyecto unico con Next.js en raiz.

## Estructura oficial

- `src/` es la fuente de verdad del codigo.
- `src/front/` concentra el avance del frontend (components, modules, lib).
- `src/backend/` es una carpeta reservada (actualmente vacia).
- `src/app/` se mantiene para App Router y API Routes de Next.js.
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
- `npm run prisma:generate`
- `npm run prisma:validate`
- `npm run prisma:migrate:dev`
- `npm run prisma:migrate:deploy`
- `npm run prisma:studio`

## Nota de estructura

La carpeta `App/` fue descartada por duplicacion de estructura. El desarrollo debe hacerse solo sobre `src/`.
`src/app/` no se mueve a `src/front/` porque Next.js requiere el App Router en `app/` o `src/app/`.
