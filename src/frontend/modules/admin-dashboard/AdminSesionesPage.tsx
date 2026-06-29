"use client";

import { useState } from "react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { SemesterSelect } from "./components/SemesterSelect";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  RefreshCw,
  Users,
} from "lucide-react";

const SESIONES = gql`
  query AdminSesiones($semester: String) {
    offerings(semester: $semester) {
      id
      name
      status
      slotsCount
      enrollmentsCount
      slots {
        id
        tutorName
        dayOfWeek
        startTime
        endTime
        maxCapacity
        enrolledCount
        roomName
      }
    }
  }
`;

interface SlotRow {
  id: string;
  tutorName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  enrolledCount: number;
  roomName: string | null;
}

interface OfferingRow {
  id: string;
  name: string;
  status: string;
  slotsCount: number;
  enrollmentsCount: number;
  slots: SlotRow[];
}

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sábado",
};

function currentSemester() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() <= 6 ? 1 : 2}`;
}

export function AdminSesionesPage() {
  const [semester, setSemester] = useState(currentSemester());
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const { data, loading, error, refetch } = useQuery<{ offerings: OfferingRow[] }>(SESIONES, {
    variables: { semester },
    fetchPolicy: "cache-and-network",
    pollInterval: 30_000,
  });

  const offerings = data?.offerings ?? [];

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allOpen = offerings.length > 0 && offerings.every((o) => openIds.has(o.id));
  const toggleAll = () =>
    setOpenIds(allOpen ? new Set() : new Set(offerings.map((o) => o.id)));

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Semestre {semester}</p>
          <h1 className="text-2xl font-bold text-slate-900">Sesiones por Tutoría</h1>
          <p className="mt-1 text-sm text-slate-600">
            Expande cada oferta para ver sus paralelos programados. Sincronización automática cada 30 s.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SemesterSelect
            value={semester}
            onChange={setSemester}
            className="h-10 w-28 rounded-md border border-slate-300 px-3 text-sm"
          />
          {offerings.length > 0 && (
            <button
              onClick={toggleAll}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {allOpen ? (
                <><ChevronsDownUp className="h-4 w-4" /> Colapsar todo</>
              ) : (
                <><ChevronsUpDown className="h-4 w-4" /> Expandir todo</>
              )}
            </button>
          )}
          <button
            onClick={() => refetch()}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>No fue posible cargar las sesiones.</p>
        </div>
      )}

      {loading && !data ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : offerings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <CalendarDays className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No hay tutorías para este semestre.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {offerings.map((offering) => {
            const isOpen = openIds.has(offering.id);
            return (
              <div
                key={offering.id}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
              >
                <button
                  onClick={() => toggle(offering.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  )}
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-900">
                    {offering.name}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      offering.status === "OPEN"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {offering.status === "OPEN" ? "ABIERTA" : "CERRADA"}
                  </span>
                  <span className="hidden shrink-0 items-center gap-1 text-sm text-slate-500 sm:flex">
                    <CalendarDays className="h-4 w-4" />
                    {offering.slotsCount} paralelo(s)
                  </span>
                  <span className="hidden shrink-0 items-center gap-1 text-sm text-slate-500 sm:flex">
                    <Users className="h-4 w-4" />
                    {offering.enrollmentsCount} inscrito(s)
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100">
                    {offering.slots.length === 0 ? (
                      <p className="px-6 py-4 text-sm text-slate-500">
                        Sin paralelos registrados.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-150 text-sm">
                          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                            <tr>
                              <th className="px-4 py-2 text-left">Día / Horario</th>
                              <th className="px-4 py-2 text-left">Tutor</th>
                              <th className="px-4 py-2 text-left">Sala</th>
                              <th className="px-4 py-2 text-right">Inscritos</th>
                              <th className="px-4 py-2 text-right">Cupos disponibles</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {offering.slots.map((slot) => {
                              const available = slot.maxCapacity - slot.enrolledCount;
                              return (
                                <tr key={slot.id} className="hover:bg-slate-50/70">
                                  <td className="px-4 py-3 font-medium text-slate-800">
                                    {DAY_LABELS[slot.dayOfWeek] ?? slot.dayOfWeek}{" "}
                                    <span className="font-normal text-slate-500">
                                      {slot.startTime}–{slot.endTime}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-slate-700">{slot.tutorName}</td>
                                  <td className="px-4 py-3 text-slate-600">
                                    {slot.roomName ?? "—"}
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-700">
                                    {slot.enrolledCount}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span
                                      className={`font-semibold ${
                                        available === 0
                                          ? "text-rose-600"
                                          : available <= 5
                                          ? "text-amber-600"
                                          : "text-emerald-600"
                                      }`}
                                    >
                                      {available}
                                    </span>
                                    <span className="ml-1 text-slate-400">/ {slot.maxCapacity}</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
