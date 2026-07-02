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

## Historial del flujo

| Versión | Cómo se creaba el form |
|---|---|
| v1 (manual) | Admin creaba el Google Form vacío a mano y pegaba el ID en un `window.prompt` |
| v2 (service account puro) | El backend intentaba crear el form vía `POST forms.googleapis.com` autenticado solo con service account — **siempre fallaba con 500 opaco**, porque un service account sin domain-wide delegation no tiene Drive propio y `forms.create` requiere un Drive real detrás |
| **v3 (actual, 01-jul-2026)** | El **admin autoriza con su propia cuenta de Google** (popup OAuth) solo para el paso de creación; el form se crea con Drive real del admin y luego se comparte con el service account para que el resto del pipeline siga automático |

---

## Arquitectura del flujo (v3)

```
Admin (clic "Generar Form")
        │
        │  1. Popup Google Identity Services (oauth2.initTokenClient)
        │     scope: forms.body + drive.file
        ▼
src/frontend/modules/admin-dashboard/AdminTutoriasPage.tsx
        │  requestGoogleFormsAccessToken(clientId) → access_token del ADMIN
        │
        │  2. GraphQL mutation: generateGoogleForm(semester, googleAccessToken)
        ▼
src/backend/modules/offerings/resolvers/offerings.resolver.ts
        │  requirePermission(MANAGE_OFFERINGS) — solo rol ADMIN
        ▼
src/backend/modules/offerings/service/offerings.service.ts
  ├── si no hay existingFormId:
  │     ├── sin googleAccessToken → AuthError("GOOGLE_AUTHORIZATION_REQUIRED", 401)
  │     ├── createFormWithUserToken(title, token) → crea el form CON el Drive del admin
  │     └── shareFormWithServiceAccount(formId, token) → comparte el archivo con el service account (writer)
  ├── Fase 1: batchUpdate — preguntas personales + carrera + sección por carrera
  ├── Fase 2: batchUpdate — routing (saltos de sección por carrera)
  └── Fase 3: eliminar ítems iniciales vacíos (solo si el form tenía ítems previos)
        │
        │  returns { formUrl, formEditUrl }
        ▼
src/backend/modules/offerings/google-forms/forms-client.ts
  ├── createFormWithUserToken / shareFormWithServiceAccount — usan el token del ADMIN (una sola vez, no se persiste)
  └── ServiceAccountFormsClient — sigue haciendo batchUpdate/get/getResponses con JWT propio,
      ya que quedó como colaborador ("writer") del archivo de Drive
```

**Por qué este diseño y no domain-wide delegation:** domain-wide delegation requeriría acceso de administrador de un Google Workspace real, que no está disponible. El flujo OAuth de usuario funciona con **cualquier cuenta de Google** que el admin use para autorizar (no tiene que ser la cuenta institucional del login de Zableke) — la mutation sigue protegida por el permiso `MANAGE_OFFERINGS` (solo ADMIN).

---

## Paso a paso en runtime

### 1. Admin hace clic en "Generar Form"

`AdminTutoriasPage.tsx` primero pide el `googleClientId` a `/api/config`, luego dispara `requestGoogleFormsAccessToken(clientId)`, que carga Google Identity Services y abre el popup de consentimiento (`prompt: "consent"`) pidiendo los scopes `forms.body` y `drive.file`.

```ts
const googleAccessToken = await requestGoogleFormsAccessToken(googleClientId);
const result = await generateForm({ variables: { semester, googleAccessToken } });
```

### 2. El resolver recibe la mutación

`offerings.resolver.ts` llama a:

```ts
offeringsService.generateGoogleForm(args.semester, args.existingFormId, args.googleAccessToken)
```

### 3. El service crea el form con el token del admin y lo comparte

```ts
let resolvedFormId = existingFormId?.trim();
if (!resolvedFormId) {
  if (!googleAccessToken) {
    throw new AuthError("Se requiere autorización de tu cuenta de Google...", "GOOGLE_AUTHORIZATION_REQUIRED", 401);
  }
  const created = await createFormWithUserToken(`Tutoría ${targetSemester}`, googleAccessToken);
  resolvedFormId = created.formId;
  await shareFormWithServiceAccount(resolvedFormId, googleAccessToken);
}
```

Si no se pasa `googleAccessToken` al crear un form nuevo, el backend responde con el error tipado `GOOGLE_AUTHORIZATION_REQUIRED` en vez del 500 opaco de la versión anterior.

### 4. El service popula el form en 3 fases (sin cambios respecto a v2)

- **Fase 1**: `batchUpdateForm` — crea preguntas de nombre, RUT, teléfono, email, carrera (dropdown), y secciones por carrera.
- **Fase 2**: `batchUpdateForm` — configura routing (saltos entre secciones según carrera seleccionada).
- **Fase 3**: `batchUpdateForm` — elimina los ítems vacíos que Google crea por defecto. Se omite si el form no tenía ítems previos.

Estas 3 fases siguen usando `ServiceAccountFormsClient`, que ahora puede operar sobre el archivo porque quedó como "writer" (paso 3 de la sección anterior).

### 5. El service retorna las URLs y el frontend muestra el modal

Igual que antes: `formUrl` (vista estudiante) y `formEditUrl` (edición), con el modal de "Editar formulario" / "Ver formulario" / "Cerrar".

### 6. Sync de respuestas — sin cambios

`syncGoogleFormResponses` sigue usando `ServiceAccountFormsClient` sin necesitar un nuevo token del admin — el service account conserva el acceso compartido de forma persistente.

---

## Autenticación con Google (v3)

Dos identidades distintas entran en juego:

- **Token del admin** (`createFormWithUserToken`, `shareFormWithServiceAccount` en `forms-client.ts`): OAuth2 implícito vía Google Identity Services, scope `forms.body` + `drive.file`, **no se persiste** — vive solo en memoria del navegador durante la generación.
- **Service account** (`ServiceAccountFormsClient`): JWT server-to-server como antes, usado para todo lo demás (batchUpdate, get, sync de respuestas) una vez que tiene acceso compartido al archivo.

**Requisito de Google Cloud Console:** mientras el proyecto OAuth esté en modo *Testing* (no verificado por Google), solo las cuentas agregadas explícitamente en **APIs & Services → OAuth consent screen → Test users** pueden completar el popup de consentimiento — cualquier otra cuenta recibe `Error 403: access_denied`. Agregar ahí cada cuenta admin que vaya a generar formularios.

---

## Archivos involucrados (Google Forms)

| Archivo | Rol |
|---|---|
| [src/backend/modules/offerings/google-forms/forms-client.ts](src/backend/modules/offerings/google-forms/forms-client.ts) | `createFormWithUserToken` + `shareFormWithServiceAccount` (token del admin) y `ServiceAccountFormsClient` (`batchUpdateForm`, `getForm`, `getResponses`, JWT propio) |
| [src/backend/modules/offerings/service/offerings.service.ts](src/backend/modules/offerings/service/offerings.service.ts) | Orquesta creación con token del admin + reparto al service account + las 3 fases de construcción del form |
| [src/backend/modules/offerings/resolvers/offerings.resolver.ts](src/backend/modules/offerings/resolvers/offerings.resolver.ts) | GraphQL schema y resolver — `generateGoogleForm(semester, existingFormId, googleAccessToken)`, `existingFormId` y `googleAccessToken` opcionales |
| [src/frontend/modules/admin-dashboard/AdminTutoriasPage.tsx](src/frontend/modules/admin-dashboard/AdminTutoriasPage.tsx) | Botón "Generar Form", popup OAuth (`requestGoogleFormsAccessToken`), mutation `GENERATE_FORM`, modal post-generación |
| [src/backend/common/errors/auth.error.ts](src/backend/common/errors/auth.error.ts) | Código de error `GOOGLE_AUTHORIZATION_REQUIRED` |
