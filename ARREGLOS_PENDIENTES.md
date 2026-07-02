# Arreglos Pendientes

_Actualizado 01-jul-2026, verificado contra código real (no contra memoria)._

## 🔴 Crítico — Seguridad

**1. Admin puede entrar sin contraseña**
`src/backend/modules/auth/service/auth.service.ts:99` tiene un TODO que desactivó la verificación bcrypt para cuentas `@ce.ucn.cl`. Cualquier email admin registrado puede autenticarse sin contraseña.
- Trade-off aceptado a propósito: no hay cuentas admin reales en producción todavía, no tiene sentido activar la verificación para un flujo que nadie usa aún. Revisar solo si se crean cuentas admin reales.

**2. Tutores no pueden cambiar su contraseña**
Se crean con `"tutor1234"` hardcodeado en `src/frontend/modules/admin-dashboard/AdminTutoresPage.tsx`. No existe mutation ni UI para cambiarla.
- Mismo contexto que el punto 1: baja prioridad mientras no haya uso en producción con cuentas reales.

**3. Credenciales de Google en `.env` deben ser cambiadas antes de producción**
`GOOGLE_CLIENT_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` son de desarrollo/prueba.
- Además, el proyecto OAuth de `GOOGLE_CLIENT_ID` está en modo **Testing** en Google Cloud Console: solo las cuentas agregadas a "Test users" pueden autorizar el flujo de generación de Google Form (ver punto 4). Falta agregar ahí los emails admin que lo van a usar antes de la presentación del 03-07.

---

## 🟠 Alto — pendiente

**4. Flujo Google Form requiere agregar test users en Google Cloud Console**
El código ya fue arreglado (ver `FLUJOFORM.md`): el admin autoriza con su propia cuenta de Google al generar un form nuevo, en vez de depender del service account puro. Verificado con tests + contra el contenedor Docker de producción.
- **No es un bug de código.** Al probar con una cuenta real se obtuvo `Error 403: access_denied` porque el proyecto OAuth sigue en modo "Testing". Acción pendiente en Google Cloud Console → APIs & Services → OAuth consent screen → Test users → agregar las cuentas admin que generarán formularios.

---

## 🟡 Medio — planificado, no implementado

**5. Notificaciones no se envían**
`src/backend/modules/notifications/` solo tiene `.gitkeep` en cada capa, cero implementación real. No hay recordatorios por correo (ej: tutor que no sube asistencia en una semana).

**6. Diferencia poco clara entre páginas "Sesiones" y "Tutorías" en admin**
`AdminSesionesPage.tsx` y `AdminTutoriasPage.tsx` coexisten; no está verificado si la distinción es clara para el usuario final o si conviene fusionarlas/renombrarlas.

**7. Comportamiento de "Estudiantes por tutoría" en Reportes con muchas tutorías**
No verificado cómo escala visualmente ese cuadro cuando aumenta el número de ofertas activas.

**8. Qué pasa con tutorías/registros al desactivar un tutor**
`isActive` en `roles-management.service.ts` controla el flag, pero no está verificado si sus slots/tutorías asignadas quedan en un estado explícito ("sin tutor") o simplemente huérfanos. Relacionado: si un tutor pierde el rol TUTOR, no debería seguir apareciendo en la sección de tutores.

**9. Admin sin vista consolidada de historial de asistencia por tutor**
No se encontró una página admin que muestre el historial de asistencia agregado de un tutor específico (más allá de Monitoreo/AuditLog).

---

## ✅ Resuelto (verificado contra código, 01-jul-2026)

- Botón "Descartar" en perfil de tutor: resetea el formulario (`handleDiscard`).
- Validación de teléfono en perfil tutor: acepta vacío correctamente.
- `TutorHomePage`: sin fallback a datos demo.
- `TutorCalendarioPage`: usa `myTutoringSlots` real.
- Avatar de tutor: sube a backend (`User.avatarUrl`), ya no vive solo en `localStorage`.
- `AuditLog`: implementado (best-effort) sobre CREATE/UPDATE/CLOSE/DELETE de Offering, Enrollment y Schedule, con actor real.
- Campo `career` en perfil de tutor: ya no hardcodeado, lee `me.career`. (`campus` sigue hardcodeado a propósito — solo existe sede Coquimbo, fuera de alcance.)
- `AdminHomePage`: ya no usa `allSchedules` (legacy), usa `reportStats` + `offerings` del semestre activo.
- Bloque "Panel Admin" eliminado del header desktop.
- Búsqueda sin distinción de tildes en 5 páginas.
- Reset automático del formulario de asistencia tras éxito.
- Canales de soporte WhatsApp vía env vars (`NEXT_PUBLIC_WHATSAPP_*`).
- Colores por carrera (schema + migration + UI).
- Métricas de historial de tutor corregidas (estudiantes únicos + asistencia promedio real).
- Fotos de perfil de tutores visibles en Monitoreo (grid y detalle).
- Gap de RBAC en frontend (usuario con un solo rol podía navegar a la UI del otro panel): corregido.
- Generación de Google Form: causa raíz (500 opaco por falta de Drive del service account) resuelta con flujo OAuth del admin — queda pendiente solo la config de Google Cloud Console (punto 4).

**Why:** Consolidación de `ARREGLOS_PENDIENTES.md` (revisión 28-jun) y `pendientes.md` (notas de Menderin, 30-jun) en un solo documento, verificado contra el código actual línea por línea en vez de confiar en listas previas. `ASPECTOS_CRITICOS.md`, `architecture_review.md`, `implementation_plan.md` y `pendientes.md` se eliminaron por estar superados/implementados y no aportar información que no esté aquí o en `FLUJOFORM.md`/`docs/arquitectura/`.
**How to apply:** Los puntos 1-2 son deuda técnica aceptada, no urgencias. El punto 3-4 (Google) es la única acción bloqueante real antes del 03-07, y es de configuración (Google Cloud Console), no de código. Los puntos 6-9 no fueron verificados a fondo — son candidatos a revisar, no bugs confirmados.
