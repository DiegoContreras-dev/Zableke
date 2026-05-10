# Plan: Gestión de Ofertas de Tutoría + Integración Google Forms

## Contexto

El sistema Zableke necesita que el admin pueda crear **ofertas de tutoría** (ej: "Programación Orientada a Objetos") con horarios y tutores asignados. Estas ofertas se publican automáticamente en un **Google Form** donde los estudiantes se inscriben. Las inscripciones se sincronizan al sistema y alimentan el módulo de asistencia existente.

## Flujo completo

```mermaid
flowchart LR
    A[Admin crea ofertas] --> B[Backend almacena]
    B --> C[Genera/actualiza Google Form]
    C --> D[Estudiantes responden]
    D --> E[Sync respuestas]
    E --> F[Enrollments en BD]
    F --> G[Tutor ve sus slots]
    G --> H[Toma asistencia con inscritos pre-cargados]
```

---

## Fase 1 — Modelos de datos (Prisma)

> [!IMPORTANT]
> Esta fase es la base de todo. No se puede avanzar sin ella.

### [MODIFY] [schema.prisma](file:///c:/Users/vjopi/OneDrive/Documentos/GitHub/Zableke/prisma/schema.prisma)

Agregar 3 enums nuevos:

```prisma
enum DayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
}

enum OfferingStatus {
  OPEN
  CLOSED
}

enum EnrollmentSource {
  GOOGLE_FORM
  MANUAL
}
```

Agregar 4 modelos nuevos:

- **`TutoringOffering`** — La asignatura/tutoría ofertada (nombre, semestre, estado, ref al Google Form item)
  - `@@unique([name, semester])` para evitar duplicados por semestre
  - Relación con `User` (creador) y `TutoringSlot[]` (horarios)

- **`TutoringSlot`** — Un bloque horario semanal (día, hora inicio/fin, tutor, sala opcional, cupo)
  - Relación con `TutoringOffering`, `Tutor`, `Room?`, `Enrollment[]`, `Schedule[]`
  - Cada tutor puede ser diferente por slot

- **`Enrollment`** — Inscripción de estudiante a un slot específico
  - `@@unique([slotId, studentEmail])` — un estudiante no se inscribe 2 veces al mismo horario
  - Campos: studentEmail, studentName, studentPhone, source (GOOGLE_FORM/MANUAL), googleFormResponseId

- **`GoogleFormLink`** — Config del formulario por semestre (formId, formUrl, lastSyncedAt)
  - `@@unique` en semester — un solo form por semestre

Agregar relaciones inversas en modelos existentes:
- `User` → `createdOfferings TutoringOffering[]`
- `Tutor` → `tutoringSlots TutoringSlot[]`
- `Room` → `tutoringSlots TutoringSlot[]`
- `Schedule` → `tutoringSlotId String?` + relación con `TutoringSlot?`
- `TutoringSlot` → `sessions Schedule[]`

Luego ejecutar:
```bash
npx prisma migrate dev --name add-tutoring-offerings
npx prisma generate
```

---

## Fase 2 — Backend: CRUD de ofertas de tutoría

### Nuevo módulo: `src/backend/modules/offerings/`

Seguir la misma estructura por capas que los módulos existentes (`auth`, `roles`, `schedules`).

#### [NEW] `src/backend/modules/offerings/dto/offering.dto.ts`

Parsers de input:
- `parseCreateOfferingInput(raw)` → valida `name` (string no vacío), `semester` (formato "YYYY-S" donde S es 1 o 2)
- `parseCreateSlotInput(raw)` → valida `offeringId`, `tutorId`, `dayOfWeek` (enum), `startTime`/`endTime` (formato "HH:mm"), `maxCapacity` (entero > 0), `roomId?`

Función utilitaria:
- `getCurrentSemester()` → devuelve `"2026-1"` o `"2026-2"` basado en la fecha actual (semestre 1: enero-julio, semestre 2: agosto-diciembre)

#### [NEW] `src/backend/modules/offerings/model/offering.model.ts`

Tipos de vista:
- `OfferingView` — id, name, semester, status, slotsCount, enrollmentsCount, googleFormItemId
- `SlotView` — id, offeringId, offeringName, tutorId, tutorName, tutorEmail, roomId, roomName, dayOfWeek, startTime, endTime, maxCapacity, enrolledCount
- `EnrollmentView` — id, slotId, studentEmail, studentName, studentPhone, source, enrolledAt

#### [NEW] `src/backend/modules/offerings/repository/offerings.repository.ts`

Operaciones Prisma:
- `createOffering(data)` — crea TutoringOffering
- `findOfferingById(id)` — con include de slots y enrollments count
- `findOfferingsBySemester(semester)` — lista todas las ofertas del semestre con sus slots
- `updateOffering(id, data)` — actualiza nombre/estado
- `deleteOffering(id)` — elimina en cascada (slots + enrollments)
- `createSlot(data)` — crea TutoringSlot vinculado a una offering
- `deleteSlot(id)` — elimina slot y sus enrollments
- `findSlotsByTutor(tutorId)` — para el dashboard del tutor
- `createEnrollment(data)` — inscribe estudiante
- `createManyEnrollments(data[])` — inscripción masiva (sync Google Form)
- `findEnrollmentsBySlot(slotId)` — lista inscritos de un horario
- `countEnrollmentsBySlot(slotId)` — para verificar cupo

#### [NEW] `src/backend/modules/offerings/service/offerings.service.ts`

Lógica de negocio:
- `createOffering(input, createdById)` → valida input, calcula semestre actual si no se provee, crea en BD
- `getOfferingsBySemester(semester?)` → lista ofertas del semestre (actual por defecto)
- `getOfferingById(id)` → detalle con slots y enrollments
- `closeOffering(id)` → cambia status a CLOSED
- `deleteOffering(id)` → elimina offering y todo lo vinculado
- `addSlot(input)` → valida que el tutor exista y tenga perfil, verifica que no haya conflicto de horario para el tutor, crea slot
- `removeSlot(slotId)` → elimina slot
- `getSlotsByTutor(userId)` → busca Tutor por userId, luego sus slots
- `getEnrolledStudents(slotId)` → lista inscritos

#### [NEW] `src/backend/modules/offerings/resolvers/offerings.resolver.ts`

Schema GraphQL:
```graphql
type TutoringOffering {
  id: ID!
  name: String!
  semester: String!
  status: String!
  slots: [TutoringSlot!]!
  createdAt: String!
}

type TutoringSlot {
  id: ID!
  offeringId: String!
  offeringName: String!
  tutorName: String!
  tutorEmail: String!
  roomName: String
  dayOfWeek: String!
  startTime: String!
  endTime: String!
  maxCapacity: Int!
  enrolledCount: Int!
}

type EnrollmentRecord {
  id: ID!
  studentEmail: String!
  studentName: String!
  studentPhone: String
  source: String!
  enrolledAt: String!
}

input CreateOfferingInput {
  name: String!
  semester: String
}

input AddSlotInput {
  offeringId: ID!
  tutorId: String!
  roomId: String
  dayOfWeek: String!
  startTime: String!
  endTime: String!
  maxCapacity: Int
}

extend type Query {
  offerings(semester: String): [TutoringOffering!]!
  offering(id: ID!): TutoringOffering
  myTutoringSlots: [TutoringSlot!]!
  enrolledStudents(slotId: ID!): [EnrollmentRecord!]!
}

extend type Mutation {
  createOffering(input: CreateOfferingInput!): TutoringOffering!
  closeOffering(id: ID!): TutoringOffering!
  deleteOffering(id: ID!): Boolean!
  addSlotToOffering(input: AddSlotInput!): TutoringSlot!
  removeSlot(slotId: ID!): Boolean!
}
```

Permisos RBAC:
- `createOffering`, `closeOffering`, `deleteOffering`, `addSlotToOffering`, `removeSlot` → requieren rol `ADMIN`
- `myTutoringSlots` → requiere rol `TUTOR` (usa `currentUser.id` para buscar)
- `enrolledStudents` → requiere usuario autenticado
- `offerings`, `offering` → requieren usuario autenticado

#### [MODIFY] [rbac.model.ts](file:///c:/Users/vjopi/OneDrive/Documentos/GitHub/Zableke/src/backend/modules/roles/model/rbac.model.ts)

Agregar permisos nuevos al array `RBAC_PERMISSIONS`:
- `"MANAGE_OFFERINGS"` — crear/editar/eliminar ofertas y slots

Agregar `"MANAGE_OFFERINGS"` al rol `ADMIN` en `ROLE_PERMISSIONS`.

#### [MODIFY] [route.ts](file:///c:/Users/vjopi/OneDrive/Documentos/GitHub/Zableke/src/app/api/graphql/route.ts)

Importar y registrar `offeringsTypeDefs` + `offeringsResolvers` junto a los demás módulos.

---

## Fase 3 — Frontend: UI de admin para crear tutorías

### Navegación

#### [MODIFY] [AdminDashboardShell.tsx](file:///c:/Users/vjopi/OneDrive/Documentos/GitHub/Zableke/src/frontend/modules/admin-dashboard/AdminDashboardShell.tsx)

Agregar item de navegación "Tutorías" en `mainNavItems`:
```ts
{ href: "/admin/tutorias", label: "Tutorías", icon: ClipboardList }
```

### Página principal de tutorías

#### [NEW] `src/app/(dashboard)/admin/tutorias/page.tsx`

Importa y renderiza `AdminTutoriasPage`.

#### [NEW] `src/frontend/modules/admin-dashboard/AdminTutoriasPage.tsx`

Página con:
- **Header**: "Ofertas de Tutoría — Semestre 2026-1" con botón "Nueva Tutoría"
- **Tabla/cards** de ofertas existentes: nombre, cantidad de horarios, total inscritos, estado (OPEN/CLOSED), acciones (ver/editar/eliminar)
- **Modal "Nueva Tutoría"**: formulario con campo nombre de la asignatura
- Al crear, navega al detalle de la oferta

### Página de detalle de oferta

#### [NEW] `src/app/(dashboard)/admin/tutorias/[id]/page.tsx`

Importa y renderiza `AdminOfferingDetailPage`.

#### [NEW] `src/frontend/modules/admin-dashboard/AdminOfferingDetailPage.tsx`

Página con:
- **Info de la oferta**: nombre, semestre, estado
- **Tabla de horarios** (slots): día, hora, tutor, sala, cupo, inscritos/cupo, botón eliminar
- **Botón "Agregar horario"** → modal con:
  - Selector de tutor (dropdown con tutores del sistema vía query `usersAccess` filtrado por rol TUTOR)
  - Selector de día de la semana
  - Inputs hora inicio / hora fin
  - Cupo máximo
  - Selector de sala (opcional)
- **Sección de inscritos por horario**: expandible, muestra lista de estudiantes inscritos con email, nombre, teléfono, fuente
- **Botón "Generar/Actualizar Formulario"** → llama a la mutación de Fase 4
- Si el form ya existe: mostrar link compartible + botón "Sincronizar respuestas"

---

## Fase 4 — Backend: Integración Google Forms API

> [!WARNING]
> Esta fase requiere un proyecto Google Cloud con la **Forms API** habilitada y credenciales de Service Account. Sin esto, esta fase queda bloqueada. La alternativa temporal es inscripción manual desde la UI del admin.

### Prerequisitos Google Cloud

1. Crear o usar un proyecto en Google Cloud Console
2. Habilitar **Google Forms API** y **Google Drive API**
3. Crear una **Service Account** con permisos de edición en Drive
4. Descargar el JSON de credenciales
5. Agregar al `.env`:
   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL=zableke-forms@project-id.iam.gserviceaccount.com
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
   ```

### Módulo de integración

#### [NEW] `src/backend/modules/offerings/google-forms/forms-client.ts`

Cliente que encapsula la Google Forms API usando `fetch` directo (sin SDK pesado):
- `authenticate()` → genera JWT con la service account, solicita access token
- `createForm(title)` → `POST https://forms.googleapis.com/v1/forms`
- `batchUpdateForm(formId, requests[])` → `POST /v1/forms/{formId}:batchUpdate`
- `getResponses(formId)` → `GET /v1/forms/{formId}/responses`

#### [NEW] `src/backend/modules/offerings/google-forms/form-builder.ts`

Lógica para construir la estructura del formulario:
- **Sección 1**: Datos personales
  - Pregunta texto: "Nombre completo" (required)
  - Pregunta texto: "Correo institucional" (required, validación regex `@alumnos.ucn.cl`)
  - Pregunta texto: "Número de teléfono" (required)
- **Por cada TutoringOffering con status OPEN**:
  - Una sección con el nombre de la tutoría como título
  - Una pregunta tipo **RADIO** (selección única) con opciones:
    - Una opción por cada `TutoringSlot`: `"{DayOfWeek} {startTime}-{endTime} (Tutor: {tutorName})"`
    - Opción final: `"No me interesa"`
  - Almacenar el `questionId` devuelto por la API como `googleFormItemId` en `TutoringOffering`

#### [NEW] `src/backend/modules/offerings/google-forms/response-sync.ts`

Lógica para sincronizar respuestas:
- `syncResponses(semester)`:
  1. Obtener `GoogleFormLink` del semestre
  2. Llamar `getResponses(formId)` 
  3. Para cada respuesta no procesada (filtrar por `googleFormResponseId` ya existentes):
     - Extraer nombre, email, teléfono de las preguntas de datos personales
     - Para cada pregunta de tutoría: mapear la opción seleccionada al `TutoringSlot.id` correspondiente
     - Crear `Enrollment` con `source: GOOGLE_FORM`
     - Verificar cupo antes de inscribir (`enrolledCount < maxCapacity`)
  4. Actualizar `lastSyncedAt` en `GoogleFormLink`

#### Resolvers adicionales

Agregar al resolver de offerings:

```graphql
extend type Mutation {
  generateGoogleForm(semester: String): GoogleFormResult!
  syncFormResponses(semester: String): SyncResult!
}

type GoogleFormResult {
  formUrl: String!
  formEditUrl: String
}

type SyncResult {
  newEnrollments: Int!
  skipped: Int!
  errors: [String!]!
}
```

Ambas mutaciones requieren rol `ADMIN`.

### Variables de entorno

#### [MODIFY] [.env.example](file:///c:/Users/vjopi/OneDrive/Documentos/GitHub/Zableke/.env.example)

Agregar:
```
# Google Forms API (Service Account)
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
```

---

## Fase 5 — Tutor dashboard: alimentar con datos de TutoringSlot

> [!NOTE]
> No se crea una sección nueva. El tutor dashboard ya tiene la sección **"Tus tutorías de hoy"** con `SessionRow` y un botón **"Registrar asistencia"**. Solo hay que cambiar la fuente de datos.

#### [MODIFY] [TutorHomePage.tsx](file:///c:/Users/vjopi/OneDrive/Documentos/GitHub/Zableke/src/frontend/modules/tutor-dashboard/TutorHomePage.tsx)

Cambios:
- Reemplazar (o complementar) la query `MY_SCHEDULES` por `myTutoringSlots` para obtener los slots asignados al tutor desde `TutoringSlot`
- Adaptar la función `toTodaySession()` para mapear `TutoringSlot` al formato `TodaySession` existente que usa `SessionRow` (offeringName como `course`, dayOfWeek + time como `slot`, etc.)
- El botón **"Registrar asistencia"** que ya existe en `SessionRow` debe navegar a la vista de asistencia pasando el `slotId` y la fecha del día
- La sección **"Resumen Semestral"** debe reflejar los conteos desde `myTutoringSlots` (tutorías activas = slots asignados)
- La sección **"Alertas pendientes"** debe usar el conteo real de slots asignados

---

## Fase 6 — Conexión asistencia con inscritos

Cuando el tutor toma asistencia para un `TutoringSlot` en una fecha específica:

#### [NEW] `src/backend/modules/offerings/service/session-generator.ts`

Función `getOrCreateSessionForSlot(slotId, date, userId)`:
1. Buscar si ya existe un `Schedule` con `tutoringSlotId = slotId` y `startsAt` en la fecha dada
2. Si no existe, crear un `Schedule` nuevo:
   - `tutorId` → del slot
   - `roomId` → del slot (si tiene)
   - `title` → nombre de la offering
   - `startsAt/endsAt` → fecha del día + hora del slot
   - `createdById` → userId
   - `tutoringSlotId` → slotId
3. Devolver el `Schedule`

#### Modificar flujo de asistencia

Agregar un nuevo resolver o extender el existente:

```graphql
extend type Query {
  attendanceForSlot(slotId: ID!, date: String!): SlotAttendanceView!
}

type SlotAttendanceView {
  scheduleId: ID!
  students: [StudentAttendanceStatus!]!
}

type StudentAttendanceStatus {
  studentEmail: String!
  studentName: String!
  studentPhone: String
  status: String
}
```

Lógica:
1. Llamar `getOrCreateSessionForSlot(slotId, date)`
2. Obtener enrollments del slot → son los estudiantes esperados
3. Obtener attendance records existentes del schedule (si ya se marcó algo)
4. Combinar: para cada enrolled student, mostrar su status de attendance (o "PENDING" si no se ha marcado)

El tutor ve la lista de inscritos y marca presente/ausente usando la mutación `recordBulkAttendance` existente con el `scheduleId` generado.

---

## Resumen de archivos

### Archivos nuevos (14)
| Archivo | Descripción |
|---------|-------------|
| `src/backend/modules/offerings/dto/offering.dto.ts` | Validación de inputs |
| `src/backend/modules/offerings/model/offering.model.ts` | Tipos de vista |
| `src/backend/modules/offerings/repository/offerings.repository.ts` | Capa Prisma |
| `src/backend/modules/offerings/service/offerings.service.ts` | Lógica CRUD |
| `src/backend/modules/offerings/service/session-generator.ts` | Genera Schedule desde Slot |
| `src/backend/modules/offerings/resolvers/offerings.resolver.ts` | GraphQL typeDefs + resolvers |
| `src/backend/modules/offerings/google-forms/forms-client.ts` | Cliente HTTP Google Forms API |
| `src/backend/modules/offerings/google-forms/form-builder.ts` | Construye estructura del form |
| `src/backend/modules/offerings/google-forms/response-sync.ts` | Sincroniza respuestas → Enrollments |
| `src/frontend/modules/admin-dashboard/AdminTutoriasPage.tsx` | UI lista de ofertas |
| `src/frontend/modules/admin-dashboard/AdminOfferingDetailPage.tsx` | UI detalle + slots + inscritos |
| `src/app/(dashboard)/admin/tutorias/page.tsx` | Route page (lista) |
| `src/app/(dashboard)/admin/tutorias/[id]/page.tsx` | Route page (detalle) |
| `prisma/migrations/XXXXXX_add_tutoring_offerings/` | Migración auto-generada |

### Archivos modificados (6)
| Archivo | Cambio |
|---------|--------|
| `prisma/schema.prisma` | 3 enums + 4 modelos + relaciones inversas |
| `src/app/api/graphql/route.ts` | Importar y registrar offerings resolver |
| `src/backend/modules/roles/model/rbac.model.ts` | Agregar permiso `MANAGE_OFFERINGS` |
| `src/frontend/modules/admin-dashboard/AdminDashboardShell.tsx` | Nav item "Tutorías" |
| `src/frontend/modules/tutor-dashboard/TutorHomePage.tsx` | Sección "Mis tutorías asignadas" |
| `.env.example` | Variables Google Service Account |

---

## Buenas prácticas de implementación

> [!IMPORTANT]
> El agente que implemente este plan debe seguir estas prácticas de forma estricta.

### Arquitectura y código
- **Separación por capas**: Cada módulo sigue el patrón `dto → model → repository → service → resolver`. No mezclar lógica de negocio en resolvers ni acceso a BD en servicios.
- **Validación en DTOs**: Toda entrada `unknown` del usuario debe pasar por un parser tipado en la capa DTO antes de llegar al servicio. No usar `any` ni castear directamente.
- **Errores tipados**: Usar `AuthError` (o crear errores de dominio equivalentes) con códigos de error semánticos (`RESOURCE_NOT_FOUND`, `INVALID_INPUT`, `CAPACITY_EXCEEDED`, etc.). No lanzar errores genéricos.
- **Inyección de dependencias**: Los servicios reciben su repositorio por constructor (como hacen los existentes: `constructor(private readonly repo = new OfferingsRepository())`). Esto facilita testing.

### TypeScript
- **No usar `any`**. Tipar todo explícitamente, incluyendo los parámetros de resolvers.
- **Interfaces para todo tipo de vista** devuelto por la API. Los resolvers devuelven tipos planos (strings para fechas, no `Date`).
- **Enums del schema Prisma** se importan desde `@prisma/client`, no se re-definen manualmente.

### GraphQL
- **Resolvers delgados**: Solo extraen parámetros, llaman al servicio y devuelven. La lógica de negocio va en el servicio.
- **Guards de autorización** se aplican al inicio de cada resolver con `requireUser()`, `requireRole()` o `requirePermission()`.
- **TypeDefs como string template** exportado junto a los resolvers desde el mismo archivo (patrón establecido en el proyecto).

### Prisma
- **Relaciones explícitas** con `onDelete` definido en cada FK.
- **Índices** en campos que se usan frecuentemente para filtrado (`semester`, `offeringId`, `tutorId`, `studentEmail`).
- **Transacciones** cuando se crean múltiples registros que deben ser atómicos (ej: crear offering + slots, sync masiva de enrollments).

### Frontend
- **Componentes `"use client"`** solo donde se necesiten hooks (`useState`, `useQuery`, etc.).
- **Loading states**: Mostrar skeletons o placeholders mientras se cargan datos.
- **Error states**: Manejar el caso de error de la query con un mensaje visible al usuario.
- **Reutilizar componentes existentes** (`DashboardPanel`, `SessionRow`, `StatCard`, `QuickActionCard`) en lugar de crear nuevos cuando la estructura sea compatible.

---

## Orden de ejecución sugerido

```mermaid
flowchart TD
    F1[Fase 1: Schema Prisma + migración] --> F2[Fase 2: Backend CRUD offerings]
    F2 --> F3[Fase 3: Frontend admin UI]
    F2 --> F4[Fase 4: Google Forms API]
    F2 --> F5[Fase 5: Tutor dashboard]
    F3 --> F6[Fase 6: Asistencia con inscritos]
    F4 --> F6
    F5 --> F6
```

- **Fases 3, 4 y 5 pueden ir en paralelo** tras completar Fase 2
- **Fase 4 es independiente** y puede posponerse si no hay acceso a Google Cloud; el resto del sistema funciona con inscripción manual

## Verificación

### Build & migración
```bash
npx prisma migrate dev --name add-tutoring-offerings
npx prisma generate
npm run build
```

### Tests manuales
1. Crear una oferta de tutoría desde admin → verificar que aparece en la lista
2. Agregar slots con tutores diferentes → verificar en detalle
3. Generar Google Form → verificar que el link funciona y las opciones son correctas
4. Responder el form con datos de prueba → sincronizar → verificar enrollments en la BD
5. Entrar como tutor → verificar que sus slots asignados aparecen
6. Tomar asistencia para un slot → verificar que los inscritos aparecen pre-cargados

### Tests automatizados (post-implementación)
- Tests unitarios para `offerings.service.ts` (validaciones, lógica de semestre)
- Tests unitarios para `offering.dto.ts` (parsers)
- Tests de integración para crear offering → agregar slot → inscribir → generar schedule
