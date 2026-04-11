# Convencion de tests backend

Por cada archivo TypeScript del backend (`*.ts`), crear su test en una ruta espejo dentro de esta carpeta.

- `test-nombrearchivo.ts`

Ejemplos:

- Si existe `src/backend/modules/users/service/user.service.ts`, crear `src/backend/test/modules/users/service/test-user.service.ts`.
- Si existe `src/backend/modules/schedules/repository/schedule.repository.ts`, crear `src/backend/test/modules/schedules/repository/test-schedule.repository.ts`.
- Si existe `src/backend/common/validators/institutional-email.validator.ts`, crear `src/backend/test/common/validators/test-institutional-email.validator.ts`.

La carpeta `src/backend/test` debe mantener todas las carpetas principales de `src/backend` para organizar la cobertura por modulo.
