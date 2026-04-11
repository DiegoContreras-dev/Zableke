# Zableke

Sistema de tutorias UCN implementado como proyecto unico con Next.js en raiz.

## Estructura oficial

- `src/` es la fuente de verdad del codigo.
- `src/app/` contiene el App Router (rutas y API Routes).
- `src/modules/` concentra modulos de dominio.
- `prisma/` contiene schema, migraciones y seed.
- `db/scripts/` contiene scripts operativos de base de datos.

## Desarrollo local

```bash
npm install
npm run dev
```

Servidor local: http://localhost:3000

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
