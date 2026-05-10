"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, LoaderCircle } from "lucide-react";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";

import { type StudentAttendance } from "./data";
import { DashboardPanel } from "./components/DashboardPanel";
import { StudentAttendanceItem } from "./components/StudentAttendanceItem";

// â”€â”€â”€ GraphQL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MY_TUTORING_SLOTS = gql`
  query AttendanceMyTutoringSlots {
    myTutoringSlots {
      id
      offeringName
      roomName
      dayOfWeek
      startTime
      endTime
      enrolledCount
      maxCapacity
    }
  }
`;

const ATTENDANCE_FOR_SLOT = gql`
  query AttendanceForSlot($slotId: ID!, $date: String!) {
    attendanceForSlot(slotId: $slotId, date: $date) {
      scheduleId
      students {
        studentEmail
        studentName
        studentPhone
        status
      }
    }
  }
`;

const RECORD_BULK_ATTENDANCE = gql`
  mutation RecordBulkAttendance($input: BulkAttendanceInput!) {
    recordBulkAttendance(input: $input) {
      id
      scheduleId
      studentEmail
      status
    }
  }
`;

interface SlotOption {
  id: string;
  offeringName: string;
  roomName: string | null;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  enrolledCount: number;
  maxCapacity: number;
}

interface SlotAttendanceStudent {
  studentEmail: string;
  studentName: string;
  studentPhone: string | null;
  status: string;
}

// â”€â”€â”€ Estado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type SaveState = "idle" | "saving" | "success" | "error";

type FormState = {
  scheduleId: string;
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

const FORM_DEFAULTS: FormState = {
  scheduleId: "",
  tutorName: "",
  sessionType: "Programada",
  subject: "",
  section: "",
  slot: "",
  room: "",
  modality: "Presencial",
  date: "",
  objectives: "",
  appreciation: "",
};

const fieldClassName =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-150 focus:border-[#23415B] focus:ring-1 focus:ring-[#23415B]";

function RequiredLabel({ text }: { text: string }) {
  return (
    <label className="mb-1 block text-sm font-medium text-slate-700">
      {text} <span className="text-rose-500">*</span>
    </label>
  );
}

function getStatusMessage(state: SaveState, savedCount: number) {
  if (state === "saving") {
    return {
      className: "border-blue-200 bg-blue-50 text-blue-800",
      icon: <LoaderCircle className="size-4 animate-spin" />,
      text: "Guardando asistencia en la base de datos...",
    };
  }
  if (state === "success") {
    return {
      className: "border-green-200 bg-green-50 text-green-800",
      icon: <CheckCircle2 className="size-4" />,
      text: `Asistencia guardada correctamente (${savedCount} presentes registrados).`,
    };
  }
  if (state === "error") {
    return {
      className: "border-red-200 bg-red-50 text-red-800",
      icon: <AlertTriangle className="size-4" />,
      text: "No se pudo guardar. Revisa los campos e intenta de nuevo.",
    };
  }
  return null;
}

function todayDateInput(): string {
  return new Date().toISOString().split("T")[0] ?? "";
}

function slotToStudent(student: SlotAttendanceStudent): StudentAttendance {
  return {
    id: student.studentEmail,
    fullName: student.studentName,
    email: student.studentEmail,
    phone: student.studentPhone ?? "",
    program: "Inscrito en tutoría",
    historicalAttendance: 0,
    attendedClasses: 0,
    totalClasses: 0,
  };
}

// â”€â”€â”€ Componente â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function TutorAttendancePage() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState<FormState>(FORM_DEFAULTS);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [generatedScheduleId, setGeneratedScheduleId] = useState<string>("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedCount, setSavedCount] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});

  const selectedCount = selectedStudents.size;
  const statusInfo = useMemo(
    () => getStatusMessage(saveState, savedCount),
    [saveState, savedCount]
  );

  const { data: slotsData, loading: schedulesLoading } = useQuery<{
    myTutoringSlots: SlotOption[];
  }>(MY_TUTORING_SLOTS, { fetchPolicy: "cache-and-network" });

  const { data: attendanceData, loading: attendanceLoading } = useQuery<{
    attendanceForSlot: { scheduleId: string; students: SlotAttendanceStudent[] };
  }>(ATTENDANCE_FOR_SLOT, {
    variables: { slotId: form.scheduleId, date: form.date || todayDateInput() },
    skip: !form.scheduleId,
    fetchPolicy: "cache-and-network",
  });

  const [recordBulkAttendance] = useMutation(RECORD_BULK_ATTENDANCE);

  const scheduleOptions = useMemo(() => slotsData?.myTutoringSlots ?? [], [slotsData?.myTutoringSlots]);
  const attendanceStudents = useMemo(
    () => (attendanceData?.attendanceForSlot.students ?? []).map(slotToStudent),
    [attendanceData]
  );

  useEffect(() => {
    const slotId = searchParams.get("slot");
    const date = searchParams.get("date") ?? todayDateInput();
    if (!slotId || scheduleOptions.length === 0) return;
    const slot = scheduleOptions.find((item) => item.id === slotId);
    if (!slot) return;
    const timeoutId = window.setTimeout(() => {
      setForm((prev) => ({
        ...prev,
        scheduleId: slot.id,
        subject: slot.offeringName,
        section: `${slot.enrolledCount}/${slot.maxCapacity} inscritos`,
        room: slot.roomName ?? "",
        slot: `${slot.startTime} - ${slot.endTime}`,
        date,
      }));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [scheduleOptions, searchParams]);

  useEffect(() => {
    const present = attendanceData?.attendanceForSlot.students
      .filter((student) => student.status === "PRESENT")
      .map((student) => student.studentEmail);
    const scheduleId = attendanceData?.attendanceForSlot.scheduleId;
    const timeoutId = window.setTimeout(() => {
      if (present) setSelectedStudents(new Set(present));
      if (scheduleId) setGeneratedScheduleId(scheduleId);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [attendanceData]);

  const updateField = <T extends keyof FormState>(field: T, value: FormState[T]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleScheduleSelect = (slotId: string) => {
    const slot = scheduleOptions.find((s) => s.id === slotId);
    if (!slot) {
      updateField("scheduleId", "");
      return;
    }
    setForm((prev) => ({
      ...prev,
      scheduleId: slot.id,
      subject: slot.offeringName,
      section: `${slot.enrolledCount}/${slot.maxCapacity} inscritos`,
      room: slot.roomName ?? prev.room,
      slot: `${slot.startTime} - ${slot.endTime}`,
      date: prev.date || todayDateInput(),
    }));
    setErrors({});
  };

  const toggleStudent = (student: StudentAttendance) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(student.id)) next.delete(student.id);
      else next.add(student.id);
      return next;
    });
    setErrors((prev) => ({ ...prev, students: undefined }));
  };

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!form.scheduleId) nextErrors.scheduleId = "Selecciona una tutoría.";
    if (form.scheduleId && !generatedScheduleId) nextErrors.scheduleId = "Espera a que se carguen los inscritos.";
    if (!form.date.trim()) nextErrors.date = "Debes indicar la fecha de realización.";
    if (!form.objectives.trim()) nextErrors.objectives = "Describe los objetivos de aprendizaje.";
    if (!form.appreciation.trim()) nextErrors.appreciation = "Incluye una apreciación breve.";
    if (attendanceStudents.length === 0) nextErrors.students = "Este horario no tiene estudiantes inscritos.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      setSaveState("error");
      return;
    }

    setSaveState("saving");

    const notes = [
      form.objectives.trim() ? `Objetivos: ${form.objectives.trim()}` : "",
      form.appreciation.trim() ? `Apreciación: ${form.appreciation.trim()}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const attendances = attendanceStudents.map((student) => ({
      studentEmail: student.email,
      studentName: student.fullName,
      status: selectedStudents.has(student.id) ? "PRESENT" : "ABSENT",
      notes: notes || undefined,
    }));

    try {
      const result = await recordBulkAttendance({
        variables: {
          input: { scheduleId: generatedScheduleId || form.scheduleId, attendances },
        },
      });
      const records = ((result.data as Record<string, unknown>)?.["recordBulkAttendance"] ?? []) as Array<{ status: string }>;
      setSavedCount(records.filter((r) => r.status === "PRESENT").length);
      setSaveState("success");
    } catch (err) {
      console.error("Error al guardar asistencia:", err);
      setSaveState("error");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm lg:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
              Asistencia
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Registro digital por bloque con validación obligatoria y trazabilidad.
            </p>
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
            title="Datos de la sesión"
            subtitle="Campos obligatorios para respaldar el registro"
            className="flex h-full min-h-0 flex-col"
          >
            <div className="space-y-4 overflow-y-auto p-3 lg:p-4">

              {/* Selector de sesión */}
              <div>
                <RequiredLabel text="Sesión a registrar" />
                {schedulesLoading ? (
                  <div className="h-9 w-full animate-pulse rounded-md bg-slate-100" />
                ) : (
                  <select
                    value={form.scheduleId}
                    onChange={(e) => handleScheduleSelect(e.target.value)}
                    className={`${fieldClassName} ${errors.scheduleId ? "border-rose-400 ring-2 ring-rose-200" : ""}`}
                  >
                    <option value="">— Seleccionar tutoría —</option>
                    {scheduleOptions.map((s) => {
                      const label = `${s.offeringName} · ${s.dayOfWeek} ${s.startTime}-${s.endTime}`;
                      return (
                        <option key={s.id} value={s.id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                )}
                {errors.scheduleId ? (
                  <p className="mt-1 text-xs font-semibold text-rose-700">{errors.scheduleId}</p>
                ) : null}
                {!schedulesLoading && scheduleOptions.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-500">
                    No tienes tutorías activas. Contacta a tu coordinador para crearlas.
                  </p>
                ) : null}
              </div>

              <div>
                <RequiredLabel text="Tutor:" />
                <input
                  type="text"
                  readOnly
                  disabled
                  value={form.tutorName || "Tutor autenticado"}
                  className={`${fieldClassName} cursor-not-allowed bg-slate-50 font-medium text-slate-700`}
                />
              </div>

              <div>
                <RequiredLabel text="Tipo de sesión" />
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
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => updateField("subject", e.target.value)}
                  placeholder="Se rellena al seleccionar una sesión"
                  className={fieldClassName}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <RequiredLabel text="Paralelo" />
                  <input
                    type="text"
                    value={form.section}
                    onChange={(e) => updateField("section", e.target.value)}
                    placeholder="Ej: P1"
                    className={fieldClassName}
                  />
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
                    <option>Híbrida</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-800">Horario</label>
                  <input
                    value={form.slot}
                    onChange={(event) => updateField("slot", event.target.value)}
                    placeholder="Ej: 10:20 - 11:50"
                    className={fieldClassName}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-800">Sala</label>
                  <input
                    value={form.room}
                    onChange={(event) => updateField("room", event.target.value)}
                    placeholder="Ej: Lab 207"
                    className={fieldClassName}
                  />
                </div>
              </div>

              <div>
                <RequiredLabel text="Fecha realización tutoría" />
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
                <RequiredLabel text="Breve apreciación de la sesión" />
                <textarea
                  value={form.appreciation}
                  onChange={(event) => updateField("appreciation", event.target.value)}
                  rows={3}
                  placeholder="Resumen de participación y observaciones"
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
            {attendanceLoading ? (
              <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
            ) : null}
            {!attendanceLoading && attendanceStudents.map((student) => (
              <StudentAttendanceItem
                key={student.id}
                student={student}
                checked={selectedStudents.has(student.id)}
                onChange={() => toggleStudent(student)}
              />
            ))}
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
