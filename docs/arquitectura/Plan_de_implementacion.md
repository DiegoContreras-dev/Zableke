# Plan de Implementacion - Zableke

## Objetivo
Pasar de arquitectura definida a MVP funcional y desplegable en VM, alineado a las epicas ZAB y con trazabilidad tecnica completa.

## Estado Actual (inicio de implementacion)
- Baseline de proyecto Next.js activo.
- Modelo Prisma inicial implementado para entidades core.
- Endpoint GraphQL base operativo con Apollo Server.
- Scripts de base de datos agregados para generar, migrar y seed.

## Fase 0 - Cierre de decisiones bloqueantes
1. Definir regla exacta de conflicto de horario:
   - Solape por tutor.
   - Solape por sala.
   - Tolerancia de minutos entre bloques.
2. Definir criterio medible de "tiempo real" para validacion.
3. Confirmar politica de notificaciones MVP:
   - Envio sincrono con reintento simple.
4. Confirmar alcance de auditoria MVP:
   - Acciones obligatorias a registrar.

## Fase 1 - Datos y contratos (en curso)
1. Completar ajustes de schema Prisma con reglas de negocio finales.
2. Crear primera migracion versionada.
3. Definir schema GraphQL por dominios:
   - Auth
   - Users/Roles
   - Schedules
   - Attendance
   - Notifications
   - Audit
4. Crear resolvers iniciales y servicios por modulo.

## Fase 2 - MVP funcional
1. Autenticacion institucional (dominios ucn).
2. RBAC Admin/Tutor en backend y vistas.
3. CRUD de horarios con bloqueo de conflictos.
4. Asistencia digital por sesion.
5. Notificaciones automaticas por cambios.
6. Auditoria inmutable de operaciones criticas.

## Fase 3 - Calidad y despliegue
1. Pruebas unitarias e integracion del flujo principal.
2. Pruebas E2E por rol (Admin/Tutor).
3. Pipeline de calidad en PR (lint, typecheck, test).
4. Validacion de despliegue Docker en VM.
5. Verificacion de backup/restore de BD.

## Trazabilidad con epicas
- ZAB-19: Arquitectura e infraestructura base.
- ZAB-20: Autenticacion y acceso seguro.
- ZAB-21: RBAC.
- ZAB-22: Horarios y prevencion de conflictos.
- ZAB-44: Asistencia digital.
- ZAB-23: Notificaciones automaticas.
- ZAB-24: Auditoria y estabilizacion.

## Definicion de Hecho del MVP
1. Usuario no institucional no puede acceder.
2. No se puede crear horario con solape valido por reglas.
3. Toda accion critica queda auditada.
4. Notificaciones se disparan en crear/editar/cancelar.
5. Flujo principal cubierto por pruebas automatizadas.
6. App desplegada por Docker y funcional en VM.

## Proximo bloque de implementacion
1. Ejecutar migracion inicial Prisma.
2. Definir schema GraphQL de Users/Roles/Schedules.
3. Implementar primera mutation de horarios con validacion de conflicto.
4. Crear pruebas de integracion para esa mutation.
