"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const MY_SCHEDULES = gql`
  query CalendarioMySchedules {
    mySchedules {
      id
      title
      description
      roomName
      startsAt
      endsAt
      status
    }
  }
`;

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ScheduleItem {
  id: string;
  title: string;
  description: string | null;
  roomName: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-[#23415B] text-white",
  COMPLETED: "bg-emerald-600 text-white",
  CANCELLED: "bg-slate-400 text-white",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function TutorCalendarioPage() {
  const today = new Date();

  const { data, loading, error } = useQuery<{ mySchedules: ScheduleItem[] }>(
    MY_SCHEDULES,
    { fetchPolicy: "cache-and-network" }
  );

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDay, setSelectedDay] = useState<Date | null>(today);

  const schedules = data?.mySchedules ?? [];

  // Días del mes para la grilla (incluyendo padding inicio/fin)
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Dom
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    // Rellenar hasta completar fila (múltiplo de 7)
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [currentMonth]);

  // Sesiones del mes
  const schedulesInMonth = useMemo(() => {
    return schedules.filter((s) => {
      const d = new Date(s.startsAt);
      return (
        d.getFullYear() === currentMonth.getFullYear() &&
        d.getMonth() === currentMonth.getMonth()
      );
    });
  }, [schedules, currentMonth]);

  // Sesiones del día seleccionado
  const schedulesForSelected = useMemo(() => {
    if (!selectedDay) return [];
    return schedules
      .filter((s) => isSameDay(new Date(s.startsAt), selectedDay))
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      );
  }, [schedules, selectedDay]);

  // Mapa día → nº de sesiones (para los dots)
  const dayCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of schedulesInMonth) {
      const key = new Date(s.startsAt).toDateString();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [schedulesInMonth]);

  const prevMonth = () =>
    setCurrentMonth(
      (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1)
    );
  const nextMonth = () =>
    setCurrentMonth(
      (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1)
    );

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Header */}
      <header className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm lg:px-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
          Mi Calendario
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Vista mensual de todas tus sesiones programadas.
        </p>
      </header>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="size-4 shrink-0" />
          No fue posible cargar tus sesiones. Revisa la conexión e intenta de nuevo.
        </div>
      )}

      <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_320px]">
        {/* ── Grilla del mes ─────────────────────────────────────────── */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          {/* Navegación mes */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
            >
              <ChevronLeft className="size-5" />
            </button>
            <span className="text-base font-semibold text-slate-900">
              {MONTHS_ES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          {/* Cabecera días */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {DAYS_ES.map((d) => (
              <div
                key={d}
                className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Días */}
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="size-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#23415B]" />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                if (!day) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[72px] border-b border-r border-slate-50 bg-slate-50"
                    />
                  );
                }
                const isToday = isSameDay(day, today);
                const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                const count = dayCountMap.get(day.toDateString()) ?? 0;

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[72px] flex flex-col items-start gap-1 border-b border-r border-slate-100 p-2 text-left transition-colors hover:bg-slate-50 ${
                      isSelected ? "bg-blue-50" : ""
                    }`}
                  >
                    <span
                      className={`flex size-6 items-center justify-center rounded-full text-sm font-medium ${
                        isToday
                          ? "bg-[#23415B] text-white"
                          : isSelected
                          ? "bg-blue-100 text-[#23415B]"
                          : "text-slate-700"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {count > 0 && (
                      <span className="rounded-full bg-[#23415B]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#23415B]">
                        {count} ses.
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Panel del día seleccionado ──────────────────────────────── */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">
              {selectedDay
                ? selectedDay.toLocaleDateString("es-CL", { dateStyle: "long" })
                : "Selecciona un día"}
            </p>
            <p className="text-xs text-slate-400">
              {schedulesForSelected.length === 0
                ? "Sin sesiones"
                : `${schedulesForSelected.length} sesión${schedulesForSelected.length > 1 ? "es" : ""}`}
            </p>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto">
            {schedulesForSelected.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarDays className="mb-2 size-8 text-slate-200" />
                <p className="text-sm text-slate-400">Sin sesiones este día</p>
              </div>
            )}

            {schedulesForSelected.map((s) => {
              const colorClass = STATUS_COLORS[s.status] ?? STATUS_COLORS["ACTIVE"]!;
              return (
                <div key={s.id} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${colorClass}`}
                    >
                      {s.status === "ACTIVE"
                        ? "Activa"
                        : s.status === "COMPLETED"
                        ? "Completada"
                        : "Cancelada"}
                    </span>
                  </div>
                  <p className="mt-1 font-medium text-slate-900">{s.title}</p>
                  {s.description && (
                    <p className="text-xs text-slate-500">{s.description}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                    <span>
                      {formatTime(s.startsAt)} – {formatTime(s.endsAt)}
                    </span>
                    {s.roomName && <span>{s.roomName}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
