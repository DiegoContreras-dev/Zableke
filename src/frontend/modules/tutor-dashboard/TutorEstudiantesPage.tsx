"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BookOpen, ChevronDown, ChevronRight, Loader2, Mail, Phone, Search, Users } from "lucide-react";
import { gql } from "@apollo/client";
import { useLazyQuery, useQuery } from "@apollo/client/react";

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const MY_SLOTS = gql`
  query MyTutoringSlotsForStudents {
    myTutoringSlots {
      id
      offeringName
      dayOfWeek
      startTime
      endTime
      enrolledCount
      maxCapacity
      roomName
    }
  }
`;

const ENROLLED_STUDENTS = gql`
  query EnrolledStudentsForSlot($slotId: ID!) {
    enrolledStudents(slotId: $slotId) {
      id
      studentEmail
      studentName
      studentRut
      studentCareer
      studentPhone
      enrolledAt
    }
  }
`;

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface TutoringSlot {
  id: string;
  offeringName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  enrolledCount: number;
  maxCapacity: number;
  roomName: string | null;
}

interface EnrolledStudent {
  id: string;
  studentEmail: string;
  studentName: string;
  studentRut: string | null;
  studentCareer: string | null;
  studentPhone: string | null;
  enrolledAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// ─── Componente de slot expandible ───────────────────────────────────────────

function SlotCard({ slot }: { slot: TutoringSlot }) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");

  const [loadStudents, { data, loading, error, called }] = useLazyQuery<{
    enrolledStudents: EnrolledStudent[];
  }>(ENROLLED_STUDENTS, {
    fetchPolicy: "cache-and-network",
  });

  const handleToggle = () => {
    if (!expanded && !called) {
      loadStudents({ variables: { slotId: slot.id } });
    }
    setExpanded((v) => !v);
  };

  const students = data?.enrolledStudents ?? [];
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return students;
    return students.filter(
      (s) =>
        s.studentName.toLowerCase().includes(needle) ||
        s.studentEmail.toLowerCase().includes(needle) ||
        (s.studentRut ?? "").toLowerCase().includes(needle) ||
        (s.studentCareer ?? "").toLowerCase().includes(needle)
    );
  }, [students, search]);

  const fillPct = slot.maxCapacity > 0 ? Math.round((slot.enrolledCount / slot.maxCapacity) * 100) : 0;
  const fillColor = fillPct >= 90 ? "bg-rose-500" : fillPct >= 60 ? "bg-amber-400" : "bg-emerald-500";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header del slot */}
      <button
        onClick={handleToggle}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#23415B]/10">
          <BookOpen className="h-5 w-5 text-[#23415B]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{slot.offeringName}</p>
          <p className="text-xs text-slate-500">
            {DAY_LABELS[slot.dayOfWeek] ?? slot.dayOfWeek} · {slot.startTime}–{slot.endTime}
            {slot.roomName ? ` · ${slot.roomName}` : ""}
          </p>
        </div>
        {/* Barra de ocupación */}
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
        <div className="shrink-0 text-slate-400">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>

      {/* Panel de estudiantes */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              No se pudieron cargar los estudiantes.
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="mb-2 h-8 w-8 text-slate-200" />
              <p className="text-sm text-slate-500">Sin estudiantes inscritos aún.</p>
            </div>
          ) : (
            <>
              {/* Buscador */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, correo, RUT o carrera…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#23415B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#23415B]/20"
                />
              </div>

              {/* Tabla */}
              <div className="overflow-x-auto rounded-lg border border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Estudiante</th>
                      <th className="hidden px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:table-cell">RUT</th>
                      <th className="hidden px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 sm:table-cell">Carrera</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Contacto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((s) => (
                      <tr key={s.id} className="transition-colors hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#23415B]/10 text-xs font-bold text-[#23415B]">
                              {initials(s.studentName)}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{s.studentName}</p>
                              <p className="text-xs text-slate-400">{s.studentEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                          {s.studentRut ?? <span className="text-slate-300">—</span>}
                        </td>
                        <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                          {s.studentCareer ?? <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <a
                              href={`mailto:${s.studentEmail}`}
                              className="inline-flex items-center gap-1 text-xs text-[#23415B] hover:underline"
                            >
                              <Mail className="h-3 w-3" />
                              {s.studentEmail}
                            </a>
                            {s.studentPhone && (
                              <a
                                href={`tel:${s.studentPhone}`}
                                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:underline"
                              >
                                <Phone className="h-3 w-3" />
                                {s.studentPhone}
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length < students.length && (
                <p className="mt-2 text-xs text-slate-400">
                  Mostrando {filtered.length} de {students.length} estudiantes
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function TutorEstudiantesPage() {
  const { data, loading, error } = useQuery<{ myTutoringSlots: TutoringSlot[] }>(MY_SLOTS, {
    fetchPolicy: "cache-and-network",
  });

  const slots = data?.myTutoringSlots ?? [];
  const totalStudents = slots.reduce((s, sl) => s + sl.enrolledCount, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mis tutorías</h1>
          <p className="mt-1 text-sm text-slate-500">
            Revisa los estudiantes inscritos a tus tutoría.
          </p>
        </div>
        {!loading && slots.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
            <Users className="h-4 w-4 text-[#23415B]" />
            <span className="font-semibold text-slate-900">{totalStudents}</span> estudiante{totalStudents !== 1 ? "s" : ""} en total
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          No fue posible cargar los ramos. Revisa tu conexión.
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && slots.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No tienes ramos asignados</p>
          <p className="mt-1 text-xs text-slate-400">
            Cuando el administrador te asigne un slot de tutoría, aparecerá aquí.
          </p>
        </div>
      )}

      {/* Slots */}
      {!loading && slots.map((slot) => (
        <SlotCard key={slot.id} slot={slot} />
      ))}
    </div>
  );
}
