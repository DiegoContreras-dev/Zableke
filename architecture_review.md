# Revisión de la Arquitectura — Sistema de Tutorías UCN (Zableke)

## Resumen General

El proyecto es un **Greenfield** para reemplazar el sistema actual de tutorías de la UCN sede Coquimbo. Actualmente el repo solo contiene documentación (`docs/`) y un [README.md](file:///c:/Users/vjopi/OneDrive/Documentos/GitHub/Zableke/README.md).

Los tres documentos leídos son:
- [Arquitectura.md](file:///c:/Users/vjopi/OneDrive/Documentos/GitHub/Zableke/docs/arquitectura/Arquitectura.md) — Estructura de carpetas y reglas por capa
- [Tecnologías.md](file:///c:/Users/vjopi/OneDrive/Documentos/GitHub/Zableke/docs/arquitectura/Tecnolog%C3%ADas.md) — Stack y versiones
- [Propuesta_proyecto final.txt](file:///c:/Users/vjopi/OneDrive/Documentos/GitHub/Zableke/docs/propuesta/Propuesta_proyecto%20final.txt) — Contexto, alcance, MVP y sprints

---

## ✅ Puntos Positivos

| Aspecto | Detalle |
|---|---|
| **Arquitectura por capas + modular** | Buena separación: `resolvers → service → repository → model`. Cada módulo tiene su carpeta. |
| **Módulos por dominio** | `auth`, `users`, `roles`, `schedules`, `attendance`, `notifications`, `audit` — mapean 1:1 con las épicas de Jira. |
| **Stack moderno y cohesivo** | TypeScript end-to-end, Next.js 15, React 19, GraphQL (Apollo), Prisma 6, PostgreSQL 16 — todo bien integrado. |
| **Validación dual** | Zod en frontend (React Hook Form) y backend (`common/validators`). Regla explícita: "validación crítica vive en service". |
| **CI/CD definido** | GitHub Actions + Jenkins quality gate (lint, typecheck, jest, playwright). |
| **Docker desde el inicio** | `docker-compose.yml` en raíz. Buen approach para portabilidad. |
| **Auditoría planificada** | Pino + tabla `audit_logs` — trazabilidad inmutable. |
| **RBAC claro** | 2 roles definidos (Admin/Tutor), con entidades `roles` y `user_roles`. |
| **Proyecto unificado** | Un solo proyecto Next.js con API Routes en vez de front + back separados. Simplifica deploy y desarrollo. |

---

## ✅ Decisiones Resueltas

Todas las inconsistencias críticas fueron resueltas:

| # | Decisión | Resolución | Impacto |
|---|---|---|---|
| 1 | REST vs GraphQL | **GraphQL** (Apollo Server/Client + graphql-codegen) | Endpoint único en `app/api/graphql/route.ts` |
| 2 | Backend separado vs Next.js API | **Next.js API Routes** | Sin `App/Back/` separado, todo en un proyecto |
| 3 | pnpm vs npm | **npm** | Unificado en todos los docs |
| 4 | Ubicación de Prisma | **Raíz del proyecto** (`prisma/schema.prisma`) | Sin carpeta `App/BD/` separada |
| 5 | SonarCloud vs Jenkins | **Jenkins** | Quality gate en PRs |
| 6 | Monorepo vs separado | **Proyecto único Next.js** | Derivado de decisión #2 |

---

## ⚠️ Notas de Implementación

### GraphQL con Next.js API Routes

El patrón `controller → service` clásico de REST se adapta a GraphQL así:

| REST | GraphQL |
|---|---|
| Controller | **Resolver** |
| Route/Endpoint | **Query/Mutation en schema** |
| Request validation | **Input types + Zod en service** |

Los resolvers delegan al service; nunca contienen lógica de negocio.

### Generación de Tipos con graphql-codegen

`@graphql-codegen/cli` genera automáticamente los tipos TypeScript desde los archivos `.graphql`, asegurando type-safety end-to-end entre schema, resolvers y queries del frontend.

---

## 🗃️ Modelo de Datos

Las entidades propuestas son sólidas:

```
users ─── user_roles ─── roles
  │
  ├── tutors
  │     └── schedules ─── rooms
  │           └── attendances
  │
  └── notifications
  
audit_logs (transversal)
```

**Sugerencias adicionales:**
- Agregar `departments` para agrupar tutores por departamento (mencionado en la propuesta).
- Considerar `schedule_slots` separado de `schedules` si un horario tiene múltiples bloques recurrentes.
- `attendances` debería vincularse tanto al `schedule` como al `student` (user con rol implícito).

---

## 📋 Alineación Propuesta ↔ Arquitectura

| Épica (Propuesta) | Módulo (Arquitectura) | Estado |
|---|---|---|
| ZAB-19 Infraestructura | Docker, CI, estructura | ✅ Bien cubierto |
| ZAB-20 Autenticación | `modules/auth` + Auth.js | ✅ Definido |
| ZAB-21 RBAC | `modules/roles` + `user_roles` | ✅ Definido |
| ZAB-22 Horarios | `modules/schedules` + `rooms` | ✅ Definido |
| ZAB-23 Notificaciones | `modules/notifications` + email infra | ✅ Definido |
| ZAB-24 Auditoría | `modules/audit` + Pino | ✅ Definido |
| ZAB-44 Asistencia | `modules/attendance` | ✅ Definido |

La cobertura modular es **excelente** — hay 1:1 entre épicas y módulos.

---

## ✅ Estado: Listo para iniciar desarrollo

Todas las decisiones arquitectónicas están resueltas. Los documentos `Arquitectura.md` y `Tecnologías.md` están unificados y sin contradicciones. El equipo puede proceder a implementar la infraestructura base (ZAB-19).
