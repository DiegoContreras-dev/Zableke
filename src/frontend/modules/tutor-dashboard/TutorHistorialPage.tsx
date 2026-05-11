"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, XCircle, MinusCircle } from "lucide-react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { DashboardPanel } from "./components/DashboardPanel";

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const MY_ATTENDANCE_HISTORY = gql`
  query MyAttendanceHistory {
    myAttendanceHistory {
      id
      scheduleId
      scheduleTitle
      scheduleDescription
      scheduleStartsAt
      scheduleEndsAt
      scheduleStatus
      roomName
      studentEmail
      studentName
      status
      markedAt
      notes
    }
  }
`;

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface HistoryItem {
  id: string;
  scheduleId: string;
  scheduleTitle: string;
  scheduleDescription: string | null;
  scheduleStartsAt: string;
  scheduleEndsAt: string;
  scheduleStatus: string;
  roomName: string | null;
  studentEmail: string;
  studentName: string | null;
  status: string;
  markedAt: string;
  notes: string | null;
}

interface GroupedSession {
  scheduleId: string;
  scheduleTitle: string;
  scheduleDescription: string | null;
  scheduleStartsAt: string;
  scheduleEndsAt: string;
  scheduleStatus: string;
  roomName: string | null;
  records: HistoryItem[];
  presentCount: number;
  absentCount: number;
  justifiedCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  PRESENT: {
    label: "Presente",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="size-3.5" />,
  },
  ABSENT: {
    label: "Ausente",
    className: "bg-rose-50 text-rose-700 border-rose-200",
    icon: <XCircle className="size-3.5" />,
  },
  JUSTIFIED: {
    label: "Justificado",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <MinusCircle className="size-3.5" />,
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["ABSENT"]!;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.className}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatSlot(startsAt: string, endsAt: string) {
  const f = (iso: string) =>
    new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  const date = new Date(startsAt).toLocaleDateString("es-CL", { dateStyle: "long" });
  return `${date} · ${f(startsAt)} – ${f(endsAt)}`;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function TutorHistorialPage() {
  const { data, loading, error } = useQuery<{ myAttendanceHistory: HistoryItem[] }>(
    MY_ATTENDANCE_HISTORY,
    { fetchPolicy: "cache-and-network" }
  );

  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const grouped = useMemo<GroupedSession[]>(() => {
    const items = data?.myAttendanceHistory ?? [];
    const map = new Map<string, GroupedSession>();
    for (const item of items) {
      if (!map.has(item.scheduleId)) {
        map.set(item.scheduleId, {
          scheduleId: item.scheduleId,
          scheduleTitle: item.scheduleTitle,
          scheduleDescription: item.scheduleDescription,
          scheduleStartsAt: item.scheduleStartsAt,
          scheduleEndsAt: item.scheduleEndsAt,
          scheduleStatus: item.scheduleStatus,
          roomName: item.roomName,
          records: [],
          presentCount: 0,
          absentCount: 0,
          justifiedCount: 0,
        });
      }
      const group = map.get(item.scheduleId)!;
      group.records.push(item);
      if (item.status === "PRESENT") group.presentCount++;
      else if (item.status === "ABSENT") group.absentCount++;
      else if (item.status === "JUSTIFIED") group.justifiedCount++;
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.scheduleStartsAt).getTime() - new Date(a.scheduleStartsAt).getTime()
    );
  }, [data]);

  const totalSessions = grouped.length;
  const totalPresent = grouped.reduce((s, g) => s + g.presentCount, 0);
  const totalStudents = grouped.reduce((s, g) => s + g.records.length, 0);

  const toggleSession = (scheduleId: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(scheduleId)) next.delete(scheduleId);
      else next.add(scheduleId);
      return next;
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Header */}
      <header className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm lg:px-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
          Historial de asistencias
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Registro completo de todas las asistencias marcadas en tus sesiones.
        </p>
      </header>

      {/* KPIs */}
      {!loading && !error && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Sesiones registradas
            </p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{totalSessions}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Total estudiantes
            </p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{totalStudents}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Presentes totales
            </p>
            <p className="mt-1 text-3xl font-bold text-emerald-600">{totalPresent}</p>
          </div>
        </div>
      )}

      {/* Filtro */}
      {!loading && !error && grouped.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Filtrar por estado:</span>
          {["ALL", "PRESENT", "ABSENT", "JUSTIFIED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                statusFilter === s
                  ? "border-[#23415B] bg-[#23415B] text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:border-[#23415B]/40"
              }`}
            >
              {s === "ALL"
                ? "Todos"
                : s === "PRESENT"
                ? "Presentes"
                : s === "ABSENT"
                ? "Ausentes"
                : "Justificados"}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 space-y-3">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-lg border border-slate-200 bg-slate-100"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="size-4 shrink-0" />
            No fue posible cargar el historial. Revisa la conexión e intenta de nuevo.
          </div>
        )}

        {!loading && !error && grouped.length === 0 && (
          <DashboardPanel title="" subtitle="">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Clock3 className="mb-3 size-10 text-slate-300" />
              <p className="font-medium text-slate-600">Aún no tienes registros de asistencia</p>
              <p className="mt-1 text-sm text-slate-400">
                Los registros aparecerán aquí después de marcar asistencia en tus sesiones.
              </p>
            </div>
          </DashboardPanel>
        )}

        {!loading &&
          !error &&
          grouped.map((session) => {
            const isExpanded = expandedSessions.has(session.scheduleId);
            const filteredRecords =
              statusFilter === "ALL"
                ? session.records
                : session.records.filter((r) => r.status === statusFilter);
            const attendanceRate =
              session.records.length > 0
                ? Math.round((session.presentCount / session.records.length) * 100)
                : 0;

            return (
              <div
                key={session.scheduleId}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
              >
                {/* Session header — clickable */}
                <button
                  type="button"
                  onClick={() => toggleSession(session.scheduleId)}
                  className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50 lg:px-5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {session.scheduleTitle}
                      </span>
                      {session.scheduleDescription && (
                        <span className="text-sm text-slate-500">
                          · {session.scheduleDescription}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatSlot(session.scheduleStartsAt, session.scheduleEndsAt)}
                      {session.roomName ? ` · ${session.roomName}` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    {/* mini stats */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-emerald-600">
                        {session.presentCount} pres.
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500">{session.records.length} total</span>
                      <span className="text-slate-400">·</span>
                      <span
                        className={`font-semibold ${
                          attendanceRate >= 70 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {attendanceRate}%
                      </span>
                    </div>
                    <span
                      className={`text-slate-400 transition-transform duration-200 ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    >
                      ▶
                    </span>
                  </div>
                </button>

                {/* Session records — expandable */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-2 lg:px-5">
                    {filteredRecords.length === 0 ? (
                      <p className="py-4 text-center text-sm text-slate-400">
                        Sin registros con ese filtro.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {filteredRecords.map((rec) => (
                          <div
                            key={rec.id}
                            className="flex items-center gap-3 py-2.5"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900">
                                {rec.studentName ?? rec.studentEmail}
                              </p>
                              <p className="text-xs text-slate-400">{rec.studentEmail}</p>
                              {rec.notes && (
                                <p className="mt-0.5 text-xs text-slate-500 italic">
                                  {rec.notes}
                                </p>
                              )}
                            </div>
                            <div className="shrink-0 flex flex-col items-end gap-1">
                              <StatusBadge status={rec.status} />
                              <span className="text-xs text-slate-400">
                                {formatDateTime(rec.markedAt)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
