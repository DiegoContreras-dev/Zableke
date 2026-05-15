"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  GraduationCap,
  LoaderCircle,
  Mail,
  MapPin,
  Search,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { DashboardPanel } from "@/frontend/modules/tutor-dashboard/components/DashboardPanel";
import { StudentAttendanceItem } from "@/frontend/modules/tutor-dashboard/components/StudentAttendanceItem";
import type { StudentAttendance } from "@/frontend/modules/tutor-dashboard/data";

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const TUTOR_STATS = gql`
  query AuditoriaTutorStats {
    tutorStats {
      tutorId
      userId
      name
      email
      totalSlots
      totalStudents
      totalCapacity
      fillRate
      grade
    }
  }
`;

const SLOTS_BY_TUTOR = gql`
  query AuditoriaTutoringSlots($tutorUserId: ID!) {
    tutoringSlotsByTutor(tutorUserId: $tutorUserId) {
      id
      offeringId
      offeringName
      tutorId
      tutorName
      roomName
      dayOfWeek
      startTime
      endTime
      maxCapacity
      enrolledCount
    }
  }
`;

const ATTENDANCE_FOR_SLOT = gql`
  query AuditoriaAttendanceForSlot($slotId: ID!, $date: String!) {
    attendanceForSlot(slotId: $slotId, date: $date) {
      scheduleId
      students {
        studentEmail
        studentName
        studentCareer
        studentPhone
        status
      }
    }
  }
`;

const RECORD_BULK_ATTENDANCE = gql`
  mutation AuditoriaRecordBulkAttendance($input: BulkAttendanceInput!) {
    recordBulkAttendance(input: $input) {
      id
      scheduleId
      studentEmail
      status
    }
  }
`;

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface TutorStat {
  tutorId: string;
  userId: string;
  name: string;
  email: string;
  totalSlots: number;
  totalStudents: number;
  totalCapacity: number;
  fillRate: number;
  grade: number;
}

interface TutoringSlot {
  id: string;
  offeringId: string;
  offeringName: string;
  tutorId: string;
  tutorName: string;
  roomName: string | null;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  enrolledCount: number;
}

interface SlotAttendanceStudent {
  studentEmail: string;
  studentName: string;
  studentCareer: string | null;
  studentPhone: string | null;
  status: string;
}

type SaveState = "idle" | "saving" | "success" | "error";

type FormState = {
  scheduleId: string;
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

// ─── Constantes ──────────────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayDateInput(): string {
  return new Date().toISOString().split("T")[0] ?? "";
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function gradeColor(grade: number): string {
  if (grade >= 5.5) return "text-emerald-600";
  if (grade >= 4.0) return "text-amber-600";
  return "text-rose-600";
}

function slotToStudent(student: SlotAttendanceStudent): StudentAttendance {
  return {
    id: student.studentEmail,
    fullName: student.studentName,
    email: student.studentEmail,
    phone: student.studentPhone ?? "",
    program: student.studentCareer ?? "Carrera no especificada",
    historicalAttendance: 0,
    attendedClasses: 0,
    totalClasses: 0,
  };
}

const fieldClassName =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-150 focus:border-[#23415B] focus:ring-1 focus:ring-[#23415B]";

function RequiredLabel({ text }: { text: string }) {
  return (
    <label className="mb-1 block text-sm font-medium text-slate-700">
      {text} <span className="text-rose-500">*</span>
    </label>
  );
}

// ─── Vista 1: Lista de tutores ────────────────────────────────────────────────

function TutorGrid({
  tutors,
  onSelect,
}: {
  tutors: TutorStat[];
  onSelect: (tutor: TutorStat) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {tutors.map((tutor) => (
        <button
          key={tutor.tutorId}
          onClick={() => onSelect(tutor)}
          className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-150 hover:border-[#23415B]/40 hover:shadow-md"
        >
          {/* Avatar + nombre */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#23415B]/10 text-sm font-bold text-[#23415B]">
              {initials(tutor.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900">{tutor.name}</p>
              <p className="truncate text-xs text-slate-500">{tutor.email}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#23415B]" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 px-3 py-2.5">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-lg font-bold text-slate-900">{tutor.totalSlots}</span>
              <span className="text-[10px] text-slate-500 text-center">horarios</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 border-x border-slate-200">
              <span className="text-lg font-bold text-slate-900">{tutor.totalStudents}</span>
              <span className="text-[10px] text-slate-500 text-center">estudiantes</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className={`text-lg font-bold ${gradeColor(tutor.grade)}`}>
                {tutor.grade > 0 ? tutor.grade.toFixed(1) : "–"}
              </span>
              <span className="text-[10px] text-slate-500 text-center">nota</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#23415B] font-medium">
            <Eye className="h-3.5 w-3.5" />
            Ver como tutor
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Vista 2: Horarios del tutor ──────────────────────────────────────────────

function SlotsList({
  tutor,
  slots,
  loading,
  onSelectSlot,
  onBack,
}: {
  tutor: TutorStat;
  slots: TutoringSlot[];
  loading: boolean;
  onSelectSlot: (slot: TutoringSlot) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Header del tutor */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-[#23415B]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a tutores
        </button>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#23415B]/10 text-lg font-bold text-[#23415B]">
            {initials(tutor.name)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{tutor.name}</h2>
            <p className="flex items-center gap-1.5 text-sm text-slate-500">
              <Mail className="h-3.5 w-3.5" />
              {tutor.email}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-3 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                <BookOpen className="h-3 w-3" />
                {tutor.totalSlots} horarios activos
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                <Users className="h-3 w-3" />
                {tutor.totalStudents} estudiantes
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${
                tutor.grade >= 5.5
                  ? "bg-emerald-50 text-emerald-700"
                  : tutor.grade >= 4.0
                  ? "bg-amber-50 text-amber-700"
                  : "bg-rose-50 text-rose-700"
              }`}>
                <TrendingUp className="h-3 w-3" />
                Nota {tutor.grade > 0 ? tutor.grade.toFixed(1) : "–"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de horarios */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3">
          <h3 className="font-semibold text-slate-900">Horarios de tutoría</h3>
          <p className="text-sm text-slate-500">Selecciona un horario para registrar o editar asistencia</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <LoaderCircle className="h-6 w-6 animate-spin text-[#23415B]" />
          </div>
        ) : slots.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-12 text-slate-500">
            <BookOpen className="h-8 w-8 text-slate-300" />
            <p className="text-sm">Este tutor no tiene horarios asignados</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {slots.map((slot) => {
              const fillPct =
                slot.maxCapacity > 0
                  ? Math.round((slot.enrolledCount / slot.maxCapacity) * 100)
                  : 0;
              const fillColor =
                fillPct >= 90
                  ? "bg-rose-500"
                  : fillPct >= 60
                  ? "bg-amber-400"
                  : "bg-emerald-500";

              return (
                <button
                  key={slot.id}
                  onClick={() => onSelectSlot(slot)}
                  className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#23415B]/10">
                    <BookOpen className="h-5 w-5 text-[#23415B]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{slot.offeringName}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {DAY_LABELS[slot.dayOfWeek] ?? slot.dayOfWeek}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {slot.startTime}–{slot.endTime}
                      </span>
                      {slot.roomName ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {slot.roomName}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs font-medium text-slate-600">
                      {slot.enrolledCount}/{slot.maxCapacity} inscritos
                    </span>
                    <div className="h-1.5 w-24 rounded-full bg-slate-100">
                      <div
                        className={`h-1.5 rounded-full ${fillColor} transition-all`}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#23415B]" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Vista 3: Formulario de asistencia ───────────────────────────────────────

function AttendanceView({
  tutor,
  slot,
  onBack,
}: {
  tutor: TutorStat;
  slot: TutoringSlot;
  onBack: () => void;
}) {
  const [form, setForm] = useState<FormState>({
    ...FORM_DEFAULTS,
    scheduleId: slot.id,
    subject: slot.offeringName,
    section: `${slot.enrolledCount}/${slot.maxCapacity} inscritos`,
    room: slot.roomName ?? "",
    slot: `${slot.startTime} - ${slot.endTime}`,
    date: todayDateInput(),
  });
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [generatedScheduleId, setGeneratedScheduleId] = useState<string>("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedCount, setSavedCount] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});

  const { data: attendanceData, loading: attendanceLoading } = useQuery<{
    attendanceForSlot: { scheduleId: string; students: SlotAttendanceStudent[] };
  }>(ATTENDANCE_FOR_SLOT, {
    variables: { slotId: slot.id, date: form.date || todayDateInput() },
    fetchPolicy: "cache-and-network",
  });

  const [recordBulkAttendance] = useMutation(RECORD_BULK_ATTENDANCE);

  const attendanceStudents = useMemo(
    () => (attendanceData?.attendanceForSlot.students ?? []).map(slotToStudent),
    [attendanceData]
  );

  useEffect(() => {
    const present = attendanceData?.attendanceForSlot.students
      .filter((s) => s.status === "PRESENT")
      .map((s) => s.studentEmail);
    const scheduleId = attendanceData?.attendanceForSlot.scheduleId;
    const tid = window.setTimeout(() => {
      if (present) setSelectedStudents(new Set(present));
      if (scheduleId) setGeneratedScheduleId(scheduleId);
    }, 0);
    return () => window.clearTimeout(tid);
  }, [attendanceData]);

  const updateField = <T extends keyof FormState>(field: T, value: FormState[T]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const toggleStudent = (student: StudentAttendance) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(student.id)) next.delete(student.id);
      else next.add(student.id);
      return next;
    });
  };

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!form.date.trim()) next.date = "Debes indicar la fecha de realización.";
    if (!form.objectives.trim()) next.objectives = "Describe los objetivos de aprendizaje.";
    if (!form.appreciation.trim()) next.appreciation = "Incluye una apreciación breve.";
    if (attendanceStudents.length === 0) next.students = "Este horario no tiene estudiantes inscritos.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) { setSaveState("error"); return; }
    setSaveState("saving");

    const notes = [
      form.objectives.trim() ? `Objetivos: ${form.objectives.trim()}` : "",
      form.appreciation.trim() ? `Apreciación: ${form.appreciation.trim()}` : "",
    ].filter(Boolean).join(" | ");

    const attendances = attendanceStudents.map((s) => ({
      studentEmail: s.email,
      studentName: s.fullName,
      status: selectedStudents.has(s.id) ? "PRESENT" : "ABSENT",
      notes: notes || undefined,
    }));

    try {
      const result = await recordBulkAttendance({
        variables: { input: { scheduleId: generatedScheduleId || slot.id, attendances } },
      });
      const records = ((result.data as Record<string, unknown>)?.["recordBulkAttendance"] ?? []) as Array<{ status: string }>;
      setSavedCount(records.filter((r) => r.status === "PRESENT").length);
      setSaveState("success");
    } catch (err) {
      console.error("Error al guardar asistencia:", err);
      setSaveState("error");
    }
  };

  const selectedCount = selectedStudents.size;

  return (
    <div className="flex flex-col gap-4">
      {/* Back button */}
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <button
          onClick={onBack}
          className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-[#23415B]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a horarios de {tutor.name}
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#23415B]/10">
            <BookOpen className="h-5 w-5 text-[#23415B]" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">{slot.offeringName}</h2>
            <p className="text-xs text-slate-500">
              {DAY_LABELS[slot.dayOfWeek] ?? slot.dayOfWeek} · {slot.startTime}–{slot.endTime}
              {slot.roomName ? ` · ${slot.roomName}` : ""}
              {" · "}<span className="font-medium text-[#23415B]">Tutor: {tutor.name}</span>
            </p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Shield className="h-3 w-3" />
            Vista administrador
          </span>
        </div>

        {/* Status banner */}
        {saveState === "saving" && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Guardando asistencia…
          </div>
        )}
        {saveState === "success" && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-800">
            <CheckCircle2 className="h-4 w-4" />
            Asistencia guardada correctamente ({savedCount} presentes registrados).
          </div>
        )}
        {saveState === "error" && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
            <AlertTriangle className="h-4 w-4" />
            No se pudo guardar. Revisa los campos e intenta de nuevo.
          </div>
        )}
      </div>

      {/* Form + students */}
      <section className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
        <form onSubmit={handleSubmit}>
          <DashboardPanel
            title="Datos de la sesión"
            subtitle="Campos obligatorios para el registro de asistencia"
            className="flex h-full flex-col"
          >
            <div className="space-y-4 overflow-y-auto p-4">
              <div>
                <RequiredLabel text="Tipo de sesión" />
                <select
                  value={form.sessionType}
                  onChange={(e) => updateField("sessionType", e.target.value)}
                  className={fieldClassName}
                >
                  <option>Programada</option>
                  <option>Recuperativa</option>
                  <option>Suspendida</option>
                  <option>Sin asistentes</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Asignatura</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => updateField("subject", e.target.value)}
                  className={fieldClassName}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Paralelo</label>
                  <input
                    type="text"
                    value={form.section}
                    onChange={(e) => updateField("section", e.target.value)}
                    className={fieldClassName}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Modalidad</label>
                  <select
                    value={form.modality}
                    onChange={(e) => updateField("modality", e.target.value)}
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
                  <label className="mb-1 block text-sm font-medium text-slate-700">Horario</label>
                  <input
                    value={form.slot}
                    onChange={(e) => updateField("slot", e.target.value)}
                    className={fieldClassName}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Sala</label>
                  <input
                    value={form.room}
                    onChange={(e) => updateField("room", e.target.value)}
                    className={fieldClassName}
                  />
                </div>
              </div>

              <div>
                <RequiredLabel text="Fecha realización tutoría" />
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => updateField("date", e.target.value)}
                  className={`${fieldClassName} ${errors.date ? "border-rose-400 ring-2 ring-rose-200" : ""}`}
                />
                {errors.date && <p className="mt-1 text-xs font-semibold text-rose-700">{errors.date}</p>}
              </div>

              <div>
                <RequiredLabel text="Objetivos de aprendizaje" />
                <textarea
                  value={form.objectives}
                  onChange={(e) => updateField("objectives", e.target.value)}
                  rows={4}
                  placeholder="Describe el contenido abordado"
                  className={`${fieldClassName} ${errors.objectives ? "border-rose-400 ring-2 ring-rose-200" : ""}`}
                />
                {errors.objectives && <p className="mt-1 text-xs font-semibold text-rose-700">{errors.objectives}</p>}
              </div>

              <div>
                <RequiredLabel text="Breve apreciación de la sesión" />
                <textarea
                  value={form.appreciation}
                  onChange={(e) => updateField("appreciation", e.target.value)}
                  rows={3}
                  placeholder="Resumen de participación y observaciones"
                  className={`${fieldClassName} ${errors.appreciation ? "border-rose-400 ring-2 ring-rose-200" : ""}`}
                />
                {errors.appreciation && <p className="mt-1 text-xs font-semibold text-rose-700">{errors.appreciation}</p>}
              </div>
            </div>

            <div className="rounded-b-lg border-t border-slate-100 bg-slate-50 p-4">
              <button
                type="submit"
                disabled={saveState === "saving"}
                className="w-full inline-flex items-center justify-center rounded-md bg-[#23415B] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1d354c] disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-[#23415B] focus:ring-offset-2"
              >
                {saveState === "saving" ? "Registrando…" : "Registrar Asistencia"}
              </button>
            </div>
          </DashboardPanel>
        </form>

        <DashboardPanel
          title="Estudiantes del bloque"
          subtitle={`Total: ${attendanceStudents.length} | Presentes: ${selectedCount}`}
          className="flex min-h-0 flex-col"
        >
          {errors.students && (
            <div className="mx-4 mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {errors.students}
            </div>
          )}
          <div className="space-y-2 overflow-y-auto p-4">
            {attendanceLoading ? (
              <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
            ) : attendanceStudents.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-slate-500">
                <GraduationCap className="h-8 w-8 text-slate-300" />
                <p className="text-sm">Sin estudiantes inscritos en este horario</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {attendanceStudents.map((student, idx) => (
                  <div
                    key={student.id}
                    className="animate-fade-in-row"
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <StudentAttendanceItem
                      student={student}
                      checked={selectedStudents.has(student.id)}
                      onChange={() => toggleStudent(student)}
                    />
                  </div>
                ))}
              </ul>
            )}
          </div>
        </DashboardPanel>
      </section>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AdminAuditoriaPage() {
  const [selectedTutor, setSelectedTutor] = useState<TutorStat | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TutoringSlot | null>(null);
  const [tutorSearch, setTutorSearch] = useState("");

  const { data: statsData, loading: statsLoading, error: statsError } = useQuery<{
    tutorStats: TutorStat[];
  }>(TUTOR_STATS, { fetchPolicy: "cache-and-network" });

  const { data: slotsData, loading: slotsLoading } = useQuery<{
    tutoringSlotsByTutor: TutoringSlot[];
  }>(SLOTS_BY_TUTOR, {
    variables: { tutorUserId: selectedTutor?.userId ?? "" },
    skip: !selectedTutor,
    fetchPolicy: "cache-and-network",
  });

  const tutors = useMemo(() => statsData?.tutorStats ?? [], [statsData]);
  const filteredTutors = useMemo(() => {
    const needle = tutorSearch.trim().toLowerCase();
    if (!needle) return tutors;
    return tutors.filter((tutor) => tutor.name.toLowerCase().includes(needle));
  }, [tutors, tutorSearch]);
  const slots = useMemo(() => slotsData?.tutoringSlotsByTutor ?? [], [slotsData]);

  const handleSelectTutor = (tutor: TutorStat) => {
    setSelectedTutor(tutor);
    setSelectedSlot(null);
  };

  const handleBackToTutors = () => {
    setSelectedTutor(null);
    setSelectedSlot(null);
  };

  const handleBackToSlots = () => {
    setSelectedSlot(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const breadcrumb = selectedSlot
    ? [
        { label: "Tutores", onClick: handleBackToTutors },
        { label: selectedTutor!.name, onClick: handleBackToSlots },
        { label: selectedSlot.offeringName },
      ]
    : selectedTutor
    ? [
        { label: "Tutores", onClick: handleBackToTutors },
        { label: selectedTutor.name },
      ]
    : [{ label: "Tutores" }];

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-x-hidden">
      {/* Page header */}
      <header className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm lg:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
              Auditoría de Tutorías
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Accede a la vista de cada tutor, consulta sus horarios y registra asistencia.
            </p>
            {/* Breadcrumb */}
            <nav className="mt-2 flex flex-wrap items-center gap-1 text-xs text-slate-500">
              {breadcrumb.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3 w-3 text-slate-400" />}
                  {crumb.onClick ? (
                    <button
                      onClick={crumb.onClick}
                      className="font-medium text-[#23415B] transition-colors hover:underline"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="font-semibold text-slate-700">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          </div>
          {!selectedTutor && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative block w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={tutorSearch}
                  onChange={(event) => setTutorSearch(event.target.value)}
                  placeholder="Buscar tutor por nombre"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#23415B] focus:ring-1 focus:ring-[#23415B]"
                />
              </label>
              <div className="flex h-10 items-center gap-2 rounded-lg bg-[#23415B]/5 px-3">
                <Shield className="h-4 w-4 text-[#23415B]" />
                <span className="text-sm font-medium text-[#23415B]">
                  {filteredTutors.length} de {tutors.length} tutores
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      {statsLoading && !selectedTutor ? (
        <div className="flex flex-1 items-center justify-center">
          <LoaderCircle className="h-7 w-7 animate-spin text-[#23415B]" />
        </div>
      ) : statsError ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-rose-600">
          <AlertTriangle className="h-5 w-5" />
          Error al cargar los tutores.
        </div>
      ) : selectedSlot && selectedTutor ? (
        <AttendanceView
          tutor={selectedTutor}
          slot={selectedSlot}
          onBack={handleBackToSlots}
        />
      ) : selectedTutor ? (
        <SlotsList
          tutor={selectedTutor}
          slots={slots}
          loading={slotsLoading}
          onSelectSlot={setSelectedSlot}
          onBack={handleBackToTutors}
        />
      ) : (
        filteredTutors.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            <Search className="h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium">No se encontraron tutores con ese nombre.</p>
          </div>
        ) : (
          <TutorGrid tutors={filteredTutors} onSelect={handleSelectTutor} />
        )
      )}
    </div>
  );
}
