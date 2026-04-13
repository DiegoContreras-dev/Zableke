# Aspectos Críticos a Corregir en Tecnologías.md

Documento de referencia: `docs/arquitectura/Tecnologías.md`  
Fecha de revisión: 13 de abril de 2026

---

## 1. `@apollo/client` marcado como "pendiente" — ya está implementado

**Sección afectada:** tabla de librerías GraphQL y lista "Planificado (aún no implementado completamente)"

**Problema:** El documento marca `@apollo/client` como `Frontend (pendiente)`. En realidad está instalado (`package.json`: `"@apollo/client": "^4.1.7"`) y hay código funcional que lo usa:

- `src/frontend/lib/apollo-client.ts` — instancia `ApolloClient` con `HttpLink` + `InMemoryCache`
- `src/frontend/components/shared/ApolloWrapper.tsx` — usa `ApolloProvider`

**Corrección necesaria:** Mover `@apollo/client` de "Planificado" a "Implementado actualmente". Agregar versión objetivo (4.x) en la tabla de versiones.

---

## 2. Autenticación: el documento dice Google OAuth — el código usa email institucional propio

**Sección afectada:** "Decisiones cerradas del stack", punto 4: *"Autenticación: Google (Auth.js/NextAuth)"* y "Recomendaciones adicionales"

**Problema:** La implementación real **no usa Google ni Auth.js/NextAuth** en ninguna forma. El sistema de autenticación es completamente propio:

- `src/backend/modules/auth/service/auth.service.ts` — autenticación por email con validación de dominio institucional, sin OAuth
- `src/backend/config/auth.config.ts` — configura dominios permitidos (`@alumnos.ucn.cl`, `@ucn.cl`)
- `src/backend/modules/auth/resolvers/auth.resolver.ts` — mutation `authenticateWithEmail`
- **No existe `next-auth` en `package.json`**

**Corrección necesaria:** Actualizar la decisión cerrada #4 para reflejar autenticación por email institucional propio. Eliminar referencias a Google OAuth y Auth.js/NextAuth hasta que se decida incorporarlos. Añadir la aclaración de la mutación GraphQL `authenticateWithEmail` como mecanismo actual.

---

## 3. Jest mencionado como herramienta de testing — no está instalado ni es la herramienta elegida

**Sección afectada:** "Recomendaciones adicionales" → *"Testing: Jest (unitarias/integración) + Playwright (E2E)"*

**Problema:** El documento recomienda Jest, pero la decisión cerrada #6 ya establece `node:test` (Node test runner). Jest no está en `package.json` y los scripts `test:backend` y `test:backend:integration` usan `node --test`. La recomendación de Jest contradice la decisión cerrada.

**Corrección necesaria:** Actualizar "Recomendaciones adicionales" para que Testing diga `node:test` (unitarias/integración), alineando con la decisión cerrada #6. Eliminar la mención de Jest.

---

## 4. Pino no está instalado

**Sección afectada:** "Recomendaciones adicionales" → *"Logs y auditoría: Pino + tabla `audit_logs`"*

**Problema:** `pino` no figura en `package.json`. No hay evidencia de implementación de logging estructurado. La recomendación da a entender que ya es parte del stack cuando no lo es.

**Corrección necesaria:** Mover Pino a la sección "Planificado (aún no implementado)" o aclarar explícitamente que es una recomendación pendiente de adoptar.

---

## 5. Zod no está instalado

**Sección afectada:** "Planificado" y "Recomendaciones adicionales" → *"Validación de datos: Zod"*

**Problema:** `zod` no está en `package.json`. El código de validación actual usa implementaciones propias (ej: `parseLoginWithEmailInput` en DTOs, `validateInstitutionalEmail`). No hay integración con Zod real.

**Corrección necesaria:** Dejar Zod en "Planificado" pero aclarar que la validación actual es manual/custom. Decidir si se adoptará Zod y cuándo.

---

## 6. React Hook Form no está instalado

**Sección afectada:** "Planificado" y "Recomendaciones adicionales" → *"Formularios: React Hook Form + Zod Resolver"*

**Problema:** `react-hook-form` no está en `package.json`.

**Corrección necesaria:** Mantener en "Planificado" sin ambigüedad, indicando que ningún formulario del frontend lo usa aún.

---

## 7. Herramientas de calidad de código no instaladas (Prettier, Husky, lint-staged)

**Sección afectada:** "Planificado" y "Recomendaciones adicionales" → *"Calidad de código: ESLint + Prettier + Husky + lint-staged"*

**Problema:** Solo `eslint` está en `devDependencies`. Ni `prettier`, `husky`, ni `lint-staged` están instalados.

**Corrección necesaria:** Dejar esto claramente en "Planificado". No mezclar herramientas activas (ESLint) con las pendientes (las demás) en la misma línea de recomendación sin distinguirlas.

---

## 8. Playwright no está instalado

**Sección afectada:** "Planificado" → *"Playwright (si se define estrategia E2E)"*

**Problema:** Menor, pero debe quedar explícito: `playwright` no está en el proyecto. La condición "si se define estrategia E2E" hace la entrada ambigua.

**Corrección necesaria:** Reformular para dejar claro que E2E no tiene herramienta ni estrategia definida aún.

---

## 9. `@types/node` apunta a v20 pero el objetivo es Node.js 22+

**Sección afectada:** "Versiones objetivo del repositorio" → `Node.js 22+`

**Problema:** En `package.json`, `"@types/node": "^20"` no cubre los tipos de la API de Node 22. Puede causar que funciones/APIs de Node 22 no tengan tipado correcto en desarrollo.

**Corrección necesaria:** Actualizar `@types/node` a `^22` en `devDependencies`.

---

---

## 10. No existe JWT — la "sesión" es una cookie sin valor verificable (crítico de seguridad)

**Sección afectada:** Es consecuencia directa de las decisiones de autenticación descritas.

**Problema:** El servidor retorna un `AuthSession` con `{ user, issuedAt, expiresAt }` como objeto JSON plano. No hay ningún token firmado (JWT ni similar). El frontend **ignora completamente ese objeto** y en su lugar escribe una cookie con valor literal `"active"`:

```ts
// session.ts
document.cookie = `zableke_tutor_session=active; Path=/; SameSite=Lax`;
```

Esto significa:
- Cualquier usuario puede crear esa cookie manualmente en el navegador y quedar "autenticado".
- El backend no valida ningún token en requests posteriores.
- El contexto GraphQL (`src/graphql/context.ts`) resuelve el usuario leyendo el header `x-user-email`, que **cualquier cliente puede inyectar libremente**.

**Corrección necesaria:** Implementar JWT firmado (ej: `jose` o `jsonwebtoken`):
1. El server genera y firma el token al autenticar.
2. El frontend lo almacena de forma segura (cookie `HttpOnly`).
3. El contexto GraphQL verifica la firma del token en cada request, no un header libre.

---

## 11. El campo `password` del formulario nunca se envía (crítico de seguridad)

**Sección afectada:** Flujo de login — `src/frontend/login/App.tsx`

**Problema:** El formulario recoge un campo `password` en estado React pero **nunca lo incluye** en la mutación GraphQL. La mutación solo envía el `email`:

```ts
const [password, setPassword] = useState(''); // ← se recoge

authenticateWithEmail({ variables: { email } }); // ← password nunca se manda
```

El documento no menciona que el sistema sea "login sin contraseña" (passwordless) de forma intencional. Si es passwordless por diseño, debe documentarse explícitamente. Si no lo es, el campo es un engaño visual y es un vector de confusión para el usuario.

**Corrección necesaria (dos caminos):**
- **Si es passwordless**: eliminar el campo `password` del formulario y documentarlo como decisión de diseño.
- **Si requiere contraseña**: implementar hash+verificación en backend y enviar la contraseña en la mutación.

---

## 12. El botón de Google login es un `console.log` sin implementación

**Sección afectada:** `src/frontend/login/App.tsx` — función `handleGoogleLogin`

**Problema:** El botón de login con Google ejecuta únicamente:

```ts
const handleGoogleLogin = () => {
  console.log('Google institutional login');
};
```

No hay integración con Google OAuth. El documento menciona Google como proveedor de autenticación (decisión cerrada #4) pero no existe ninguna implementación.

**Corrección necesaria:** Implementar el flujo OAuth con Google (Auth.js/NextAuth u otro) o eliminar el botón del formulario hasta que esté listo. No dejar código muerto que aparenta funcionalidad.

---

## 13. Contexto GraphQL autentica con header `x-user-email` — completamente inseguro

**Sección afectada:** `src/graphql/context.ts`

**Problema:** El servidor resuelve el usuario actual leyendo `x-user-email` del header HTTP entrante:

```ts
const currentUserEmailHeader = request?.headers?.get("x-user-email")?.trim().toLowerCase() ?? null;
```

Cualquier cliente (curl, Postman, script) puede enviar `x-user-email: admin@ucn.cl` y el servidor lo aceptará como usuario autenticado sin ninguna verificación. Esto anula totalmente la autenticación.

**Corrección necesaria:** Reemplazar este mecanismo por validación de un JWT firmado en el header `Authorization: Bearer <token>`. El contexto debe verificar la firma del token y extraer el usuario del payload, nunca confiar en un header libre.

---

## Resumen de correcciones por prioridad

| # | Problema | Impacto | Prioridad |
|---|----------|---------|-----------|
| 13 | Header `x-user-email` como autenticación — cualquier cliente puede suplantar identidad | **Vulnerabilidad crítica de seguridad** | **Urgente** |
| 10 | Sin JWT — cookie `"active"` sin valor verificable | **Vulnerabilidad crítica de seguridad** | **Urgente** |
| 11 | Campo `password` nunca se envía — login sin verificación de identidad o formulario engañoso | **Vulnerabilidad crítica / UX falsa** | **Urgente** |
| 12 | Botón Google login es `console.log` — funcionalidad prometida sin implementar | Código muerto, confusión de usuario | **Alta** |
| 2 | Autenticación documentada como Google OAuth pero es email propio | Implementación desconectada de la doc oficial | **Alta** |
| 1 | `@apollo/client` marcado como pendiente — ya instalado y en uso | Documentación desactualizada activamente engañosa | **Alta** |
| 3 | Jest recomendado pero `node:test` es la decisión cerrada | Contradicción interna en el documento | **Alta** |
| 9 | `@types/node` v20 vs Node 22+ objetivo | Tipado incorrecto en desarrollo | **Media** |
| 4 | Pino presentado como stack activo sin estar instalado | Expectativa incorrecta | **Media** |
| 5 | Zod sin instalar pero presentado en recomendaciones | Expectativa incorrecta | **Media** |
| 6 | React Hook Form sin instalar | Menor, está en "Planificado" | **Baja** |
| 7 | Prettier/Husky/lint-staged sin instalar | Menor, están en "Planificado" | **Baja** |
| 8 | Playwright sin estrategia definida | Menor, condicionado | **Baja** |
