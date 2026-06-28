# Flujo del formulario dinámico (MinIO)

## ¿Es funcional?

Sí. El formulario de creación de tutores se comporta **exactamente igual que el original hardcodeado**, con la diferencia de que los campos ahora se leen desde un JSON almacenado en MinIO en lugar de estar escritos directamente en el componente React.

---

## Arquitectura del flujo

```
MinIO (bucket: config)
  └── forms/tutor-form.json
          │
          │  GET /api/forms/tutor
          ▼
  src/app/api/forms/[id]/route.ts   ← API Route de Next.js (server-side)
  src/lib/minio.ts                  ← Cliente MinIO (singleton, server-only)
          │
          │  fetch("/api/forms/tutor")
          ▼
  src/frontend/hooks/useFormConfig.ts   ← Hook React (client-side)
          │
          │  config.rows → render dinámico
          ▼
  src/frontend/modules/admin-dashboard/AdminTutoresPage.tsx
  └── AddTutorModal
```

---

## Paso a paso: cómo se crea el formulario en runtime

### 1. Arranque de Docker Compose

```bash
docker compose up
```

- El servicio `minio` levanta MinIO en el puerto `9000` (API) y `9001` (consola web).
- El servicio `minio-init` espera a que MinIO esté healthy, luego ejecuta `db/scripts/init-minio.sh`:
  - Crea el bucket `config` (si no existe).
  - Sube `config/forms/tutor-form.json` → `local/config/forms/tutor-form.json` en el bucket.
- El servicio `app` (Next.js) arranca **después** de que MinIO esté healthy.

### 2. El admin abre el modal "Agregar Tutor"

El componente `AddTutorModal` (en `AdminTutoresPage.tsx:246`) llama al hook:

```ts
const { config, loading: configLoading } = useFormConfig("tutor");
```

### 3. El hook hace fetch a la API

`useFormConfig.ts:42` lanza:

```
GET /api/forms/tutor
```

Mientras espera, el modal muestra un spinner (`Loader2`).

### 4. La API Route lee de MinIO

`src/app/api/forms/[id]/route.ts` recibe el request, construye la ruta `forms/tutor.json` y llama a `getMinioClient().getObject("config", "forms/tutor.json")`. Devuelve el JSON con header:

```
Cache-Control: s-maxage=60, stale-while-revalidate=300
```

_(La respuesta se cachea 60 s en el servidor y se sirve hasta 5 min como stale mientras revalida en background.)_

### 5. El hook recibe el config y el modal renderiza los campos

`config.rows` tiene esta forma:

```json
[
  [ { "key": "firstName", ... }, { "key": "lastName", ... } ],
  [ { "key": "rut", ... } ],
  [ { "key": "email", ... } ],
  [ { "key": "career", "type": "career" } ],
  [ { "key": "entryYear", "type": "number", "min": 1990, "max": 2026 } ]
]
```

El render loop en `AdminTutoresPage.tsx:309`:

- Cada elemento de `rows` es una **fila**.
- Si la fila tiene más de un campo → se aplica `grid grid-cols-2 gap-3` (por eso Nombre y Apellido salen en dos columnas).
- Si el campo tiene `type: "career"` → se renderiza el dropdown personalizado con grupos por escuela, estado `careerOpen`, y toda su lógica original.
- Cualquier otro tipo → se renderiza un `<input>` estándar con los atributos `autoFocus`, `placeholder`, `min`, `max` del JSON.

---

## ¿Qué se conservó igual respecto al form original?

| Detalle | Conservado |
|---|---|
| Grid 2 columnas Nombre / Apellido | ✅ (fila con 2 items → `grid-cols-2`) |
| Dropdown de carreras agrupado por escuela | ✅ (rama `type === "career"` preserva JSX completo) |
| `autoFocus` en campo Nombre | ✅ (`def.autoFocus` se pasa al `<input>`) |
| Estilos Tailwind exactos (bordes, focus ring, colores) | ✅ (clases idénticas al original) |
| Validación (RUT, email regex, año 1990–hoy) | ✅ (lógica en `validate()` no fue tocada) |
| Nota de contraseña inicial (`tutor1234`) | ✅ (hardcodeada debajo del loop, intencional) |
| Spinner mientras carga | ✅ (nuevo — antes no existía porque era síncrono) |

---

## Cómo cambiar el formulario sin redesplegar

1. Abre la consola MinIO: `http://localhost:9001`
2. Credenciales: `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` (ver `.env`).
3. Navega a `config` → `forms` → `tutor-form.json`.
4. Descarga, edita, y vuelve a subir el archivo.
5. La próxima petición (después de 60 s de caché) usará el nuevo config.

Para agregar un campo nuevo, ejemplo un teléfono:

```json
[{ "key": "phone", "label": "Teléfono", "type": "text", "placeholder": "Ej. +56 9 1234 5678" }]
```

> **Nota:** si se agrega un campo nuevo cuya `key` no existe en el estado del form (`firstName`, `lastName`, `rut`, `email`, `career`, `entryYear`), también hay que agregarlo al `useState` y a la función `validate()` en `AdminTutoresPage.tsx`.

---

## Archivos involucrados

| Archivo | Rol |
|---|---|
| [config/forms/tutor-form.json](config/forms/tutor-form.json) | Fuente de verdad del form — se sube a MinIO al arrancar |
| [db/scripts/init-minio.sh](db/scripts/init-minio.sh) | Seed inicial: crea bucket y sube el JSON |
| [compose.yaml](compose.yaml) | Servicios `minio` y `minio-init` |
| [src/lib/minio.ts](src/lib/minio.ts) | Cliente MinIO singleton (server-only) |
| [src/app/api/forms/[id]/route.ts](src/app/api/forms/[id]/route.ts) | Lee el JSON de MinIO y lo sirve como API |
| [src/frontend/hooks/useFormConfig.ts](src/frontend/hooks/useFormConfig.ts) | Fetcha la config desde el cliente React |
| [src/frontend/modules/admin-dashboard/AdminTutoresPage.tsx](src/frontend/modules/admin-dashboard/AdminTutoresPage.tsx) | `AddTutorModal` — renderiza el form dinámicamente |

---

# Flujo de generación automática de Google Forms

## ¿Qué cambió respecto al flujo anterior?

| Flujo anterior | Flujo nuevo |
|---|---|
| Admin crea un Google Form vacío manualmente en forms.google.com | El sistema lo crea automáticamente vía API |
| Admin copia el ID del form y lo pega en un `window.prompt` | No se requiere ninguna acción manual |
| El backend recibe el ID y popula el form | El backend crea Y popula el form en un solo paso |
| No hay confirmación visual | Aparece un modal con opciones de editar / ver |

---

## Arquitectura del flujo

```
Admin (clic "Generar Form")
        │
        │  GraphQL mutation: generateGoogleForm(semester)
        ▼
src/frontend/modules/admin-dashboard/AdminTutoriasPage.tsx
        │
        │  Apollo useMutation → POST /api/graphql
        ▼
src/backend/modules/offerings/resolvers/offerings.resolver.ts
        │  generateGoogleForm(semester?, existingFormId?)
        ▼
src/backend/modules/offerings/service/offerings.service.ts
  ├── si no hay existingFormId → client.createForm("Tutoría 2026-1")
  ├── Fase 1: batchUpdate — preguntas personales + carrera + sección por carrera
  ├── Fase 2: batchUpdate — routing (saltos de sección por carrera)
  └── Fase 3: eliminar ítems iniciales vacíos (solo si el form tenía ítems previos)
        │
        │  returns { formUrl, formEditUrl }
        ▼
src/backend/modules/offerings/google-forms/forms-client.ts
  └── ServiceAccountFormsClient — auth JWT con service account de Google
```

---

## Paso a paso en runtime

### 1. Admin hace clic en "Generar Form"

`AdminTutoriasPage.tsx` dispara `handleGenerateForm()`:

```ts
const result = await generateForm({ variables: { semester } });
```

No se pide ningún ID. La mutación GraphQL tiene `existingFormId` como opcional (`String`, no `String!`).

### 2. El resolver recibe la mutación

`offerings.resolver.ts:255` llama a:

```ts
offeringsService.generateGoogleForm(args.semester, args.existingFormId)
```

`args.existingFormId` es `undefined` en este flujo normal.

### 3. El service auto-crea el form

`offerings.service.ts` — lógica clave:

```ts
let resolvedFormId = existingFormId?.trim();
if (!resolvedFormId) {
  const created = await client.createForm(`Tutoría ${targetSemester}`);
  resolvedFormId = created.formId;
}
```

Si no se pasó `existingFormId`, se llama a `createForm()` que hace `POST https://forms.googleapis.com/v1/forms` con auth de service account.

### 4. El service popula el form en 3 fases

- **Fase 1**: `batchUpdateForm` — crea preguntas de nombre, RUT, teléfono, email, carrera (dropdown), y secciones por carrera.
- **Fase 2**: `batchUpdateForm` — configura routing (saltos entre secciones según carrera seleccionada).
- **Fase 3**: `batchUpdateForm` — elimina los ítems vacíos que Google crea por defecto al crear un form nuevo. Esta fase se omite si `initialItemIds.length === 0` (form auto-creado no tiene ítems previos).

### 5. El service retorna las URLs

```ts
return { formUrl: resolvedFormUrl, formEditUrl: resolvedFormEditUrl };
```

`formUrl` → URL pública para estudiantes.
`formEditUrl` → URL de edición en Google Forms (solo accesible con la cuenta del service account o accounts con acceso al form).

### 6. El frontend muestra el modal

`AdminTutoriasPage.tsx` recibe las URLs y setea `generatedForm`:

```ts
setGeneratedForm({ formUrl: urls.formUrl, formEditUrl: urls.formEditUrl });
```

Esto renderiza el modal con tres acciones:

| Botón | Acción |
|---|---|
| "Editar formulario" | Abre `formEditUrl` en nueva pestaña |
| "Ver formulario (vista estudiante)" | Abre `formUrl` en nueva pestaña |
| "Cerrar" | `setGeneratedForm(null)` — cierra el modal |

---

## Autenticación con Google

El cliente `ServiceAccountFormsClient` (`forms-client.ts`) usa un **service account de Google** autenticado vía JWT:

- Las credenciales viven en variables de entorno (o en un archivo JSON referenciado por `GOOGLE_APPLICATION_CREDENTIALS`).
- El scope requerido es `https://www.googleapis.com/auth/forms.body`.
- No requiere interacción del usuario — es server-to-server.

---

## Archivos involucrados (Google Forms)

| Archivo | Rol |
|---|---|
| [src/backend/modules/offerings/google-forms/forms-client.ts](src/backend/modules/offerings/google-forms/forms-client.ts) | Singleton que expone `createForm`, `batchUpdateForm`, `getForm`, `getResponses` |
| [src/backend/modules/offerings/service/offerings.service.ts](src/backend/modules/offerings/service/offerings.service.ts) | Orquesta las 3 fases de construcción del form; auto-crea si no hay `existingFormId` |
| [src/backend/modules/offerings/resolvers/offerings.resolver.ts](src/backend/modules/offerings/resolvers/offerings.resolver.ts) | GraphQL schema y resolver — `existingFormId` es opcional (`String`) |
| [src/frontend/modules/admin-dashboard/AdminTutoriasPage.tsx](src/frontend/modules/admin-dashboard/AdminTutoriasPage.tsx) | Botón "Generar Form", mutation `GENERATE_FORM`, modal post-generación |
