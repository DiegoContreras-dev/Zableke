"use client";

import { useMemo, useState } from "react";
import { gql } from "@apollo/client";
import { useLazyQuery, useQuery } from "@apollo/client/react";
import { SemesterSelect } from "./components/SemesterSelect";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Download,
  GraduationCap,
  RefreshCw,
  Users,
} from "lucide-react";

const REPORT_DATA = gql`
  query AdminReportData($semester: String) {
    offerings(semester: $semester) {
      id
      name
      status
      enrollmentsCount
      slots {
        id
        tutorName
        dayOfWeek
        startTime
        endTime
        enrolledCount
        maxCapacity
      }
    }
    reportStats(semester: $semester) {
      careerBreakdown {
        career
        count
      }
    }
  }
`;

const ENROLLMENTS_CAREER = gql`
  query EnrollmentsCareer($semester: String) {
    allEnrollments(semester: $semester) {
      id
      offeringId
      studentCareer
    }
  }
`;

const FULL_EXPORT = gql`
  query FullExport($semester: String) {
    allEnrollments(semester: $semester) {
      id
      studentName
      studentEmail
      studentRut
      studentCareer
      studentPhone
      source
      enrolledAt
    }
    offerings(semester: $semester) {
      id
      name
      status
      slotsCount
      enrollmentsCount
      targetCareers
    }
    tutorStats {
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

interface SlotRow {
  id: string;
  tutorName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  enrolledCount: number;
  maxCapacity: number;
}

interface OfferingRow {
  id: string;
  name: string;
  status: string;
  enrollmentsCount: number;
  slots: SlotRow[];
}

interface CareerCount {
  career: string;
  count: number;
}

interface EnrollmentCareer {
  id: string;
  offeringId: string;
  studentCareer: string | null;
}

interface EnrollmentExport {
  id: string;
  studentName: string;
  studentEmail: string;
  studentRut: string | null;
  studentCareer: string | null;
  studentPhone: string | null;
  source: string;
  enrolledAt: string;
}

interface OfferingExport {
  id: string;
  name: string;
  status: string;
  slotsCount: number;
  enrollmentsCount: number;
  targetCareers: string[];
}

interface TutorStat {
  name: string;
  email: string;
  totalSlots: number;
  totalStudents: number;
  totalCapacity: number;
  fillRate: number;
  grade: number;
}

function currentSemester() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() <= 6 ? 1 : 2}`;
}

function styledHeader(ws: import("exceljs").Worksheet, colCount: number) {
  const row = ws.getRow(1);
  row.height = 22;
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF23415B" } };
    cell.font      = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border    = { bottom: { style: "thin", color: { argb: "FF1a3048" } } };
  }
}

function addDataRows(
  ws: import("exceljs").Worksheet,
  data: Record<string, string | number>[],
  centerCols: number[] = [],
  wrapCols: number[] = [],
) {
  data.forEach((record, i) => {
    const row = ws.addRow(record);
    if (wrapCols.length === 0) row.height = 18;
    if (i % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      });
    }
    row.eachCell((cell, colNumber) => {
      cell.alignment = {
        vertical: "middle",
        horizontal: centerCols.includes(colNumber) ? "center" : "left",
        wrapText: wrapCols.includes(colNumber),
      };
    });
  });
}

function fmtDate(iso: string) {
  return iso ? new Date(iso).toLocaleDateString("es-CL") : "—";
}

async function downloadXlsx(
  enrollments: EnrollmentExport[],
  offerings: OfferingExport[],
  tutors: TutorStat[],
  semester: string,
) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Zableke";
  wb.created = new Date();

  /* ── Hoja 1: Estudiantes ── */
  const wsEst = wb.addWorksheet("Estudiantes");
  wsEst.columns = [
    { header: "Nombre",            key: "name",       width: 30 },
    { header: "Email",             key: "email",      width: 34 },
    { header: "RUT",               key: "rut",        width: 16 },
    { header: "Carrera",           key: "career",     width: 26 },
    { header: "Teléfono",          key: "phone",      width: 18 },
    { header: "Fuente",            key: "source",     width: 12 },
    { header: "Fecha inscripción", key: "enrolledAt", width: 20 },
  ];
  styledHeader(wsEst, 7);
  addDataRows(wsEst, enrollments.map((r) => ({
    name:       r.studentName,
    email:      r.studentEmail,
    rut:        r.studentRut    ?? "—",
    career:     r.studentCareer ?? "Sin carrera",
    phone:      r.studentPhone  ?? "—",
    source:     r.source,
    enrolledAt: fmtDate(r.enrolledAt),
  })));

  const STATUS_LABEL: Record<string, string> = {
    OPEN: "Abierta", CLOSED: "Cerrada", DRAFT: "Borrador", ARCHIVED: "Archivada",
  };

  /* ── Hoja 2: Tutorías ── */
  const wsTut = wb.addWorksheet("Tutorías");
  wsTut.columns = [
    { header: "Nombre de la Tutoría",  key: "name",     width: 40 },
    { header: "Estado",                key: "status",   width: 14 },
    { header: "Sesiones semanales",    key: "slots",    width: 20 },
    { header: "Estudiantes inscritos", key: "enrolled", width: 22 },
    { header: "Carreras objetivo",     key: "careers",  width: 44 },
  ];
  styledHeader(wsTut, 5);
  addDataRows(
    wsTut,
    offerings.map((o) => ({
      name:    o.name,
      status:  STATUS_LABEL[o.status] ?? o.status,
      slots:   o.slotsCount,
      enrolled:o.enrollmentsCount,
      careers: o.targetCareers.length > 0 ? o.targetCareers.join(", ") : "Todas las carreras",
    })),
    [3, 4],
    [5],
  );

  /* ── Hoja 3: Tutores ── */
  const wsTutores = wb.addWorksheet("Tutores");
  wsTutores.columns = [
    { header: "Nombre",             key: "name",     width: 28 },
    { header: "Email",              key: "email",    width: 32 },
    { header: "Ses/semana",         key: "slots",    width: 14 },
    { header: "Estudiantes",        key: "students", width: 14 },
    { header: "Capacidad total",    key: "capacity", width: 16 },
    { header: "Tasa de llenado",    key: "fillRate", width: 16 },
    { header: "Nota",               key: "grade",    width: 10 },
  ];
  styledHeader(wsTutores, 7);
  addDataRows(
    wsTutores,
    tutors.map((t) => ({
      name:     t.name,
      email:    t.email,
      slots:    t.totalSlots,
      students: t.totalStudents,
      capacity: t.totalCapacity,
      fillRate: `${Math.round(t.fillRate * 100)}%`,
      grade:    t.grade.toFixed(1),
    })),
    [3, 4, 5, 6, 7],
  );

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reporte-${semester}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminReportesPage() {
  const [semester, setSemester] = useState(currentSemester());
  const [openTutors, setOpenTutors] = useState<Set<string>>(new Set());

  const { data, loading, error, refetch } = useQuery<{
    offerings: OfferingRow[];
    reportStats: { careerBreakdown: CareerCount[] };
  }>(REPORT_DATA, {
    variables: { semester },
    fetchPolicy: "cache-and-network",
    pollInterval: 30_000,
  });

  const { data: careerData } = useQuery<{ allEnrollments: EnrollmentCareer[] }>(
    ENROLLMENTS_CAREER,
    { variables: { semester }, fetchPolicy: "cache-and-network", pollInterval: 30_000 }
  );

  const [fetchExport, { loading: exporting }] = useLazyQuery<{
    allEnrollments: EnrollmentExport[];
    offerings: OfferingExport[];
    tutorStats: TutorStat[];
  }>(FULL_EXPORT);

  const offerings = data?.offerings ?? [];

  const activeOfferings = useMemo(
    () => offerings.filter((o) => o.status === "OPEN"),
    [offerings]
  );

  const totalStudents = useMemo(
    () => offerings.reduce((s, o) => s + o.enrollmentsCount, 0),
    [offerings]
  );

  // Group slots by tutor: { name, totalSlots, offeringList: [{name, count}] }
  const tutors = useMemo(() => {
    const map = new Map<
      string,
      { name: string; offeringSlots: Map<string, { name: string; count: number }> }
    >();
    for (const offering of offerings) {
      for (const slot of offering.slots) {
        if (!map.has(slot.tutorName)) {
          map.set(slot.tutorName, { name: slot.tutorName, offeringSlots: new Map() });
        }
        const entry = map.get(slot.tutorName)!;
        const prev = entry.offeringSlots.get(offering.id);
        entry.offeringSlots.set(offering.id, {
          name: offering.name,
          count: (prev?.count ?? 0) + 1,
        });
      }
    }
    return Array.from(map.values())
      .map((t) => ({
        name: t.name,
        totalSlots: Array.from(t.offeringSlots.values()).reduce((s, o) => s + o.count, 0),
        offeringList: Array.from(t.offeringSlots.values()),
      }))
      .sort((a, b) => b.totalSlots - a.totalSlots);
  }, [offerings]);

  // Per-offering career breakdown from allEnrollments
  const offeringCareers = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const e of careerData?.allEnrollments ?? []) {
      const career = e.studentCareer?.trim() || "Sin carrera";
      if (!map.has(e.offeringId)) map.set(e.offeringId, new Map());
      const cm = map.get(e.offeringId)!;
      cm.set(career, (cm.get(career) ?? 0) + 1);
    }
    return map;
  }, [careerData]);

  const toggleTutor = (name: string) =>
    setOpenTutors((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const handleExport = async () => {
    const result = await fetchExport({ variables: { semester } });
    const enrollments = result.data?.allEnrollments ?? [];
    const offeringsData = result.data?.offerings ?? [];
    const tutorsData = result.data?.tutorStats ?? [];
    if (enrollments.length === 0 && offeringsData.length === 0 && tutorsData.length === 0) {
      alert("No hay datos para exportar en este semestre.");
      return;
    }
    await downloadXlsx(enrollments, offeringsData, tutorsData, semester);
  };

  const skeletonLoading = loading && !data;
  const careerBreakdown = data?.reportStats?.careerBreakdown ?? [];

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Semestre {semester}</p>
          <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
          <p className="mt-1 text-sm text-slate-600">
            Estadísticas globales del programa de tutorías. Auto-sync cada 30 s.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SemesterSelect
            value={semester}
            onChange={setSemester}
            className="h-10 w-28 rounded-md border border-slate-300 px-3 text-sm"
          />
          <button
            onClick={() => refetch()}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[#23415B] px-3 text-sm font-medium text-white hover:bg-[#1a3048] disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {exporting ? "Exportando…" : "Exportar Excel"}
          </button>
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>No fue posible cargar los reportes.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Card: Tutorías Activas */}
        <section className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Tutorías Activas
              </p>
              {skeletonLoading ? (
                <div className="mt-0.5 h-6 w-8 animate-pulse rounded bg-slate-100" />
              ) : (
                <p className="text-xl font-bold text-slate-900">{activeOfferings.length}</p>
              )}
            </div>
          </div>
          {skeletonLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          ) : activeOfferings.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-10 text-sm text-slate-400">
              Sin tutorías activas.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {activeOfferings.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                    {o.name}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      <Users className="h-3 w-3" />
                      {o.enrollmentsCount}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      {o.slots.length} paralelo(s)
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Card: Estudiantes por Tutoría con carrera */}
        <section className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Estudiantes por Tutoría
              </p>
              {skeletonLoading ? (
                <div className="mt-0.5 h-6 w-10 animate-pulse rounded bg-slate-100" />
              ) : (
                <p className="text-xl font-bold text-slate-900">{totalStudents} total</p>
              )}
            </div>
          </div>
          {skeletonLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          ) : offerings.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-10 text-sm text-slate-400">
              Sin datos para este semestre.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {offerings.map((o) => {
                const careers = offeringCareers.get(o.id);
                return (
                  <li key={o.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                        {o.name}
                      </span>
                      <span className="shrink-0 text-sm font-bold text-slate-900">
                        {o.enrollmentsCount}
                        <span className="ml-1 text-xs font-normal text-slate-400">inscritos</span>
                      </span>
                    </div>
                    {careers && careers.size > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Array.from(careers.entries()).map(([career, count]) => (
                          <span
                            key={career}
                            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                          >
                            <GraduationCap className="h-3 w-3" />
                            {career}
                            <span className="font-semibold">({count})</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-slate-400">Sin datos de carrera</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Card: Sesiones por Tutor — full width, accordion */}
        <section className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <CalendarDays className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Sesiones por Tutor
              </p>
              <p className="text-xs text-slate-400">
                Haz clic en un tutor para ver sus tutorías
              </p>
            </div>
          </div>
          {skeletonLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          ) : tutors.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-slate-400">
              Sin tutores con paralelos asignados.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {tutors.map((tutor) => {
                const isOpen = openTutors.has(tutor.name);
                const perMonth = Math.round(tutor.totalSlots * 4.3);
                return (
                  <li key={tutor.name}>
                    <button
                      onClick={() => toggleTutor(tutor.name)}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50"
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                      )}
                      <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900">
                        {tutor.name}
                      </span>
                      <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                        {tutor.totalSlots} ses/semana
                      </span>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                        ~{perMonth} ses/mes
                      </span>
                    </button>
                    {isOpen && (
                      <ul className="border-t border-slate-100 bg-slate-50/70">
                        {tutor.offeringList.map((o) => (
                          <li
                            key={o.name}
                            className="flex items-center justify-between gap-3 px-12 py-2.5 text-sm"
                          >
                            <span className="text-slate-700">{o.name}</span>
                            <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 shadow-sm ring-1 ring-slate-200">
                              {o.count} paralelo(s)
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Distribución global por carrera */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Distribución global por Carrera</h2>
        {skeletonLoading ? (
          <div className="h-64 animate-pulse rounded-md bg-slate-100" />
        ) : careerBreakdown.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-slate-400">
            Sin datos de carrera disponibles.
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={careerBreakdown}
                margin={{ top: 0, right: 4, left: -20, bottom: 64 }}
              >
                <XAxis
                  dataKey="career"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar
                  dataKey="count"
                  name="Estudiantes"
                  fill="#23415B"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
