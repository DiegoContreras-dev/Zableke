"use client";

import { type FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, LoaderCircle } from "lucide-react";

import {
  attendanceDefaults,
  attendanceStudents,
  type StudentAttendance,
} from "./data";
import { DashboardPanel } from "./components/DashboardPanel";
import { StudentAttendanceItem } from "./components/StudentAttendanceItem";

type SaveState = "idle" | "saving" | "success" | "error";

type FormState = {
  tutorName: string;
  sessionType: string;
  subject: string;
  section: string;
  slot: string;
  room: string;
  modality: string;
  date: string;
  objectives: string;
  appreciation: string;
};

type FormErrors = Partial<Record<keyof FormState | "students", string>>;

const fieldClassName =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-150 focus:border-[#23415B] focus:ring-1 focus:ring-[#23415B]";

function RequiredLabel({ text }: { text: string }) {
  return (
    <label className="mb-1 block text-sm font-medium text-slate-700">
      {text} <span className="text-rose-500">*</span>
    </label>
  );
}

function getStatusMessage(state: SaveState) {
  if (state === "saving") {
    return {
      className: "border-blue-200 bg-blue-50 text-blue-800",
      icon: <LoaderCircle className="size-4 animate-spin" />,
      text: "Guardando asistencia y registrando trazabilidad...",
    };
  }

  if (state === "success") {
    return {
      className: "border-green-200 bg-green-50 text-green-800",
      icon: <CheckCircle2 className="size-4" />,
      text: "Asistencia guardada correctamente. Notificaciones enviadas.",
    };
  }

  if (state === "error") {
    return {
      className: "border-red-200 bg-red-50 text-red-800",
      icon: <AlertTriangle className="size-4" />,
      text: "No se pudo guardar. Revisa los campos obligatorios e intenta de nuevo.",
    };
  }

  return null;
}

export function TutorAttendancePage() {
  const [form, setForm] = useState<FormState>({
    ...attendanceDefaults,
    date: "",
    objectives: "",
    appreciation: "",
  });
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isStudentLoading, setIsStudentLoading] = useState(false);
  const [forceSaveError, setForceSaveError] = useState(false);

  const selectedCount = selectedStudents.size;

  const statusInfo = useMemo(() => getStatusMessage(saveState), [saveState]);

  const updateField = <T extends keyof FormState>(field: T, value: FormState[T]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const toggleStudent = (student: StudentAttendance) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);

      if (next.has(student.id)) {
        next.delete(student.id);
      } else {
        next.add(student.id);
      }

      return next;
    });

    setErrors((prev) => ({ ...prev, students: undefined }));
  };

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!form.date.trim()) {
      nextErrors.date = "Debes indicar la fecha de realizacion.";
    }

    if (!form.objectives.trim()) {
      nextErrors.objectives = "Describe los objetivos de aprendizaje.";
    }

    if (!form.appreciation.trim()) {
      nextErrors.appreciation = "Incluye una apreciacion breve de la sesion.";
    }

    if (selectedStudents.size === 0) {
      nextErrors.students = "Selecciona al menos un estudiante asistente.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate()) {
      setSaveState("error");
      return;
    }

    setSaveState("saving");

    setTimeout(() => {
      if (forceSaveError) {
        setSaveState("error");
        return;
      }

      setSaveState("success");
    }, 900);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm lg:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
              Rellenar asistencia
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Registro digital por bloque con validación obligatoria y trazabilidad.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700 hidden">
            {/* hidden developer tools to simplify UI for the user */}
            <button
              type="button"
              onClick={() => setIsStudentLoading((prev) => !prev)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium transition-colors hover:bg-slate-50 hover:text-[#23415B]"
            >
              {isStudentLoading ? "Quitar carga" : "Simular carga"}
            </button>

            <label className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium">
              <input
                type="checkbox"
                checked={forceSaveError}
                onChange={(event) => setForceSaveError(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#23415B] focus:ring-[#23415B]"
              />
              Forzar error
            </label>
          </div>
        </div>

        {statusInfo ? (
          <div
            className={`mt-4 flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${statusInfo.className}`}
          >
            {statusInfo.icon}
            <p>{statusInfo.text}</p>
          </div>
        ) : null}
      </header>

      <section className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1.05fr_1fr]">
        <form onSubmit={handleSubmit} className="min-h-0">
          <DashboardPanel
            title="Datos de la sesion"
            subtitle="Campos obligatorios para respaldar el registro"
            className="flex h-full min-h-0 flex-col"
          >
            <div className="space-y-4 overflow-y-auto p-3 lg:p-4">
              <div>
                <RequiredLabel text="Selecciona tu nombre" />
                <select
                  value={form.tutorName}
                  onChange={(event) => updateField("tutorName", event.target.value)}
                  className={fieldClassName}
                >
                  <option>{attendanceDefaults.tutorName}</option>
                </select>
              </div>

              <div>
                <RequiredLabel text="Tipo de sesion" />
                <select
                  value={form.sessionType}
                  onChange={(event) => updateField("sessionType", event.target.value)}
                  className={fieldClassName}
                >
                  <option>Programada</option>
                  <option>Recuperativa</option>
                  <option>Suspendida</option>
                  <option>Sin asistentes</option>
                </select>
                <p className="mt-1 text-xs font-semibold text-cyan-700">
                  &quot;Suspendida&quot; aplica en feriado, paro o fuerza mayor.
                </p>
              </div>

              <div>
                <RequiredLabel text="Asignatura" />
                <select
                  value={form.subject}
                  onChange={(event) => updateField("subject", event.target.value)}
                  className={fieldClassName}
                >
                  <option>{attendanceDefaults.subject}</option>
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <RequiredLabel text="Paralelo" />
                  <select
                    value={form.section}
                    onChange={(event) => updateField("section", event.target.value)}
                    className={fieldClassName}
                  >
                    <option>P1</option>
                    <option>P2</option>
                    <option>P3</option>
                    <option>P4</option>
                  </select>
                </div>
                <div>
                  <RequiredLabel text="Modalidad" />
                  <select
                    value={form.modality}
                    onChange={(event) => updateField("modality", event.target.value)}
                    className={fieldClassName}
                  >
                    <option>Presencial</option>
                    <option>Online</option>
                    <option>Hibrida</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-800">Horario</label>
                  <input
                    value={form.slot}
                    onChange={(event) => updateField("slot", event.target.value)}
                    className={fieldClassName}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-800">Sala</label>
                  <input
                    value={form.room}
                    onChange={(event) => updateField("room", event.target.value)}
                    className={fieldClassName}
                  />
                </div>
              </div>

              <div>
                <RequiredLabel text="Fecha realizacion tutoria" />
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => updateField("date", event.target.value)}
                  className={`${fieldClassName} ${errors.date ? "border-rose-400 ring-2 ring-rose-200" : ""}`}
                />
                {errors.date ? <p className="mt-1 text-xs font-semibold text-rose-700">{errors.date}</p> : null}
              </div>

              <div>
                <RequiredLabel text="Objetivos de aprendizaje" />
                <textarea
                  value={form.objectives}
                  onChange={(event) => updateField("objectives", event.target.value)}
                  rows={4}
                  placeholder="Describe el contenido abordado"
                  className={`${fieldClassName} ${errors.objectives ? "border-rose-400 ring-2 ring-rose-200" : ""}`}
                />
                {errors.objectives ? (
                  <p className="mt-1 text-xs font-semibold text-rose-700">{errors.objectives}</p>
                ) : null}
              </div>

              <div>
                <RequiredLabel text="Breve apreciacion de la sesion" />
                <textarea
                  value={form.appreciation}
                  onChange={(event) => updateField("appreciation", event.target.value)}
                  rows={3}
                  placeholder="Resumen de participacion y observaciones"
                  className={`${fieldClassName} ${errors.appreciation ? "border-rose-400 ring-2 ring-rose-200" : ""}`}
                />
                {errors.appreciation ? (
                  <p className="mt-1 text-xs font-semibold text-rose-700">{errors.appreciation}</p>
                ) : null}
              </div>
            </div>

            <div className="border-t border-slate-100 p-4 bg-slate-50 rounded-b-lg">
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="submit"
                  disabled={saveState === "saving"}
                  className="inline-flex items-center justify-center rounded-md bg-[#23415B] px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#1d354c] disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-[#23415B] focus:ring-offset-2"
                >
                  {saveState === "saving" ? "Registrando..." : "Registrar Asistencia"}
                </button>
                <Link
                  href="/tutor/historial"
                  className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors duration-150 hover:border-[#23415B] hover:text-[#23415B] focus:outline-none focus:ring-2 focus:ring-[#23415B] focus:ring-offset-2"
                >
                  Ver Historial
                </Link>
              </div>
            </div>
          </DashboardPanel>
        </form>

        <DashboardPanel
          title="Estudiantes del bloque"
          subtitle={`Total: ${attendanceStudents.length} | Presentes: ${selectedCount}`}
          className="flex min-h-0 flex-col"
        >
          <div className="space-y-2 overflow-y-auto p-4 bg-slate-50/50">
            {isStudentLoading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`student-skeleton-${index}`}
                    className="h-[76px] animate-pulse rounded-md border border-slate-200 bg-slate-100"
                  />
                ))
              : null}

            {!isStudentLoading
              ? attendanceStudents.map((student) => (
                  <StudentAttendanceItem
                    key={student.id}
                    student={student}
                    checked={selectedStudents.has(student.id)}
                    onChange={() => toggleStudent(student)}
                  />
                ))
              : null}
          </div>

          <footer className="border-t border-slate-100 bg-white p-4 rounded-b-lg">
            {errors.students ? (
              <p className="mb-2 text-xs font-semibold text-rose-700">{errors.students}</p>
            ) : null}
            <p className="text-xs text-slate-500">
              Marca solo estudiantes presentes. El registro será auditado.
            </p>
          </footer>
        </DashboardPanel>
      </section>
    </div>
  );
}
