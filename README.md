# Zableke

Sistema de gestion de tutorias UCN implementado como proyecto unico con Next.js en raiz.

## Estructura oficial

- `src/` es la fuente de verdad del codigo.
- `src/frontend/` concentra el frontend (components, modules, lib, hooks).
- `src/backend/` concentra backend por capas y modulos de dominio (auth, roles, offerings, schedules, audit, drive, notifications).
- `src/app/` mantiene App Router y API Routes de Next.js.
- `src/graphql/` y `src/infrastructure/` contienen contexto GraphQL y cliente Prisma.
- `prisma/` contiene schema, migraciones y seed.
- `db/scripts/` contiene scripts operativos de base de datos (sync, seed de admin/tutores).

## Desarrollo local

```bash
npm install
npm run dev
```

Servidor local: http://localhost:3000

## Contenedores (Docker / Podman)

Funciona con `docker compose` y `podman compose` (ambos reconocen `compose.yaml` automáticamente).

Levantar con build:

```bash
docker compose up --build
# o
podman compose up --build
```

Levantar en segundo plano:

```bash
docker compose up -d
# o
podman compose up -d
```

Detener servicios:

```bash
docker compose down
# o
podman compose down
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

Modulos principales expuestos (backend):

- **Auth**: `authenticateWithEmail`, `authenticateWithGoogle`
- **Roles**: `myAccess`, `usersAccess`, `assignRoleToUser`, `removeRoleFromUser`
- **Offerings**: `offerings`, `createOffering`, `updateOffering`, `closeOffering`, `deleteOffering`, `addSlotToOffering`, `removeSlot`, `createEnrollment`, `removeEnrollment`, `generateGoogleForm`, `syncFormResponses`
- **Schedules**: `myTutoringSlots`, `tutoringSlotsByTutor`, `attendanceForSlot`, `updateSchedule`, `cancelSchedule`
- **Reportes**: `reportStats`, `tutorStats`, `allEnrollments`

Autenticacion via JWT firmado (`Authorization: Bearer <token>`), verificado en `src/graphql/context.ts`. RBAC por permisos declarados en `src/backend/modules/roles/model/rbac.model.ts` (ver `requirePermission`/`requireUser` en cada resolver).

## Nota de estructura y alcance

La carpeta `App/` fue descartada por duplicacion de estructura. El desarrollo debe hacerse solo sobre `src/`.
`src/app/` no se mueve a `src/frontend/` porque Next.js requiere el App Router en `app/` o `src/app/`.

## Estado actual

- Autenticacion institucional (email + Google OAuth) implementada y testeada.
- RBAC completo (roles ADMIN/TUTOR, permisos granulares) implementado y testeado.
- Gestion de ofertas de tutoria, horarios, inscripciones y asistencia implementada.
- Generacion automatica de Google Forms para inscripciones (flujo OAuth del admin + service account).
- Integracion con Google Drive para fotos de perfil y carpetas de tutores.
- Auditoria (`AuditLog`) activa sobre operaciones CREATE/UPDATE/CLOSE/DELETE de ofertas, inscripciones y horarios.
- Notificaciones automaticas (`src/backend/modules/notifications/`) **no implementadas todavia**.
- CI de tests backend disponible en `.github/workflows/backend-tests.yml`.
