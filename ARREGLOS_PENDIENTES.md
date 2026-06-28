# Arreglos Pendientes

## 🔴 Crítico — Seguridad

**1. Admin puede entrar sin contraseña**
`src/backend/modules/auth/service/auth.service.ts:99` tiene un TODO que desactivó la verificación bcrypt para cuentas `@ce.ucn.cl`. Cualquier email admin registrado puede autenticarse sin contraseña.
- Fix: agregar campo `password` al form de login, enviarlo en `authenticateWithEmail`, y reactivar `bcrypt.compare()` en el service para dominios admin.

**2. Tutores no pueden cambiar su contraseña**
Se crean con `"tutor1234"` hardcodeado en `src/frontend/modules/admin-dashboard/AdminTutoresPage.tsx:367`. No existe mutation ni UI para cambiarla.
- Fix: agregar mutation `changePassword(currentPassword, newPassword)` en users module + formulario en perfil del tutor.

**3. Credenciales de Google en `.env` deben ser cambiadas**
Las variables `GOOGLE_CLIENT_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` y `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` del `.env` son las de desarrollo/prueba y deben reemplazarse por las credenciales reales de producción antes del despliegue.

---

## 🟠 Alto — Funcionalidad rota o engañosa

**4. Botón "Descartar" en perfil tutor no hace nada**
`src/frontend/modules/tutor-dashboard/TutorProfilePage.tsx:366` — el botón existe pero no tiene `onClick`.
- Fix: `onClick={() => setFormData({ phone: me?.phone ?? '', bio: me?.bio ?? '', linkedin: me?.linkedinUrl ?? '' })}`.

**5. Validación de teléfono bloquea guardar cuando está vacío**
`TutorProfilePage.tsx:118-119` — la regex `/^\+?[0-9\s\-]{8,15}$/` rechaza cadena vacía, impidiendo guardar bio/LinkedIn si no se ingresa teléfono.
- Fix: `const isPhoneValid = !formData.phone || phoneRegex.test(formData.phone)`.

**6. TutorHomePage muestra datos de demo si no hay sesiones hoy**
`src/frontend/modules/tutor-dashboard/TutorHomePage.tsx:78-85` — cae a `todaySessions` estáticos en lugar de mostrar "No hay sesiones hoy".
- Fix: reemplazar el fallback con un estado vacío real.

**7. TutorCalendarioPage usa el modelo Schedule antiguo**
Usa `mySchedules` (sesiones históricas) en lugar de `myTutoringSlots` (horario semanal). Un tutor nuevo con slots asignados verá el calendario vacío.
- Fix: complementar o reemplazar `mySchedules` con `myTutoringSlots`.

**8. Avatar del tutor solo en localStorage**
`TutorProfilePage.tsx:152-163` — la foto no se sube a ningún servidor; se pierde al limpiar el navegador.
- Fix: subir imagen a MinIO vía API route y guardar la URL en `User.avatarUrl`.

---

## 🟡 Medio — Modelos en schema sin implementar

**9. `Notification` existe en Prisma pero no se envían emails**
Ningún resolver ni service llama a un servicio de correo. La tabla siempre estará vacía.

**10. `AuditLog` existe en Prisma pero nunca se llena**
No hay middleware ni llamadas a `prisma.auditLog.create()` en ningún service.

**11. Campus y carrera del tutor están hardcodeados**
`TutorProfilePage.tsx:63-66` muestra "Campus Guayacán - Coquimbo" e "ICI" fijo, sin leer `User.career`.

---

## 🟢 Bajo — Detalles de calidad

**12. Pie chart en AdminOfferingDetailPage muestra datos hardcodeados**
`src/frontend/modules/admin-dashboard/AdminOfferingDetailPage.tsx` — gráfico con valores 85/15 estáticos, etiquetado "Asistencia Promedio (Simulada)".

**13. TutorEstudiantesPage sin datos reales**
Verificar si muestra datos reales de estudiantes inscritos o es un placeholder.

**14. AdminHomePage usa stats del modelo Schedule legacy**
El dashboard home cuenta `allSchedules` en lugar de offerings/enrollments actuales, por lo que los números pueden no reflejar la actividad real del semestre.
