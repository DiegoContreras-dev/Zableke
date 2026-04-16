"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
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

// ─── Bloques horarios ─────────────────────────────────────────────────────────

const BLOCKS = [
  { label: "A", start: "08:10", end: "09:40" },
  { label: "B", start: "09:55", end: "11:25" },
  { label: "C", start: "11:40", end: "13:10" },
  { label: "D", start: "14:30", end: "16:00" },
  { label: "E", start: "16:15", end: "17:45" },
  { label: "F", start: "18:00", end: "19:30" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

function matchesBlock(
  session: ScheduleItem,
  block: { start: string; end: string }
): boolean {
  const d = new Date(session.startsAt);
  const mins = d.getHours() * 60 + d.getMinutes();
  return mins >= toMinutes(block.start) && mins <= toMinutes(block.end);
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Dom
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function TutorCalendarioPage() {
  const today = new Date();

  const { data, loading, error } = useQuery<{ mySchedules: ScheduleItem[] }>(
    MY_SCHEDULES,
    { fetchPolicy: "cache-and-network" }
  );

  const [weekStart, setWeekStart] = useState(() => getMonday(today));

  const schedules = data?.mySchedules ?? [];

  // Lunes a Sábado de la semana actual
  const weekDays = useMemo(
    () => Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const weekLabel = useMemo(() => {
    const end = addDays(weekStart, 5);
    if (weekStart.getMonth() === end.getMonth()) {
      return `${weekStart.getDate()}–${end.getDate()} de ${MONTHS_ES[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
    }
    return `${weekStart.getDate()} ${MONTHS_ES[weekStart.getMonth()]} – ${end.getDate()} ${MONTHS_ES[end.getMonth()]} ${end.getFullYear()}`;
  }, [weekStart]);

  const prevWeek = () => setWeekStart((d) => addDays(d, -7));
  const nextWeek = () => setWeekStart((d) => addDays(d, 7));
  const goToday = () => setWeekStart(getMonday(today));

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Header */}
      <header className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm lg:px-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
          Mi Calendario
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Vista semanal de tus tutorías por bloque horario.
        </p>
      </header>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="size-4 shrink-0" />
          No fue posible cargar tus sesiones. Revisa la conexión e intenta de nuevo.
        </div>
      )}

      {/* Grilla semanal */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {/* Navegación semana */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={prevWeek}
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-slate-900">
              {weekLabel}
            </span>
            <button
              type="button"
              onClick={goToday}
              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Hoy
            </button>
          </div>
          <button
            type="button"
            onClick={nextWeek}
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="size-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#23415B]" />
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {/* Columna bloque */}
                  <th className="w-28 border-b border-r border-slate-100 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Bloque
                  </th>
                  {weekDays.map((day, i) => {
                    const isToday = isSameDay(day, today);
                    return (
                      <th
                        key={i}
                        className={`min-w-[130px] border-b border-r border-slate-100 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider ${
                          isToday
                            ? "bg-[#23415B] text-white"
                            : "bg-slate-50 text-slate-500"
                        }`}
                      >
                        <div>{DAYS_ES[i]}</div>
                        <div
                          className={`text-base font-bold ${
                            isToday ? "text-white" : "text-slate-700"
                          }`}
                        >
                          {day.getDate()}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {BLOCKS.map((block) => (
                  <tr key={block.label}>
                    {/* Etiqueta bloque */}
                    <td className="border-b border-r border-slate-100 bg-slate-50 px-3 py-3 align-top">
                      <div className="text-sm font-bold text-[#23415B]">
                        Bloque {block.label}
                      </div>
                      <div className="whitespace-nowrap text-[11px] text-slate-400">
                        {block.start}–{block.end}
                      </div>
                    </td>
                    {weekDays.map((day, di) => {
                      const sessions = schedules.filter(
                        (s) =>
                          isSameDay(new Date(s.startsAt), day) &&
                          matchesBlock(s, block)
                      );
                      return (
                        <td
                          key={di}
                          className="border-b border-r border-slate-100 px-2 py-2 align-top"
                        >
                          {sessions.length === 0 ? (
                            <span className="text-xs text-slate-200">—</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {sessions.map((s) => {
                                const colorClass =
                                  STATUS_COLORS[s.status] ??
                                  STATUS_COLORS["ACTIVE"]!;
                                return (
                                  <div
                                    key={s.id}
                                    className={`rounded p-1.5 text-xs ${colorClass}`}
                                  >
                                    <div className="truncate font-semibold leading-tight">
                                      {s.title}
                                    </div>
                                    {s.roomName && (
                                      <div className="text-[10px] opacity-80">
                                        {s.roomName}
                                      </div>
                                    )}
                                    <div className="text-[10px] opacity-70">
                                      {s.status === "ACTIVE"
                                        ? "Activa"
                                        : s.status === "COMPLETED"
                                        ? "Completada"
                                        : "Cancelada"}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
