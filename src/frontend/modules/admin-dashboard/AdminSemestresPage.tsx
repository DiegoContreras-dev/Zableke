"use client";

import { useMemo, useState } from "react";
import { CalendarRange, CheckCircle2, Loader2, Plus } from "lucide-react";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";

type Semester = {
  code: string;
  startDate: string;
  endDate: string;
  status: "PLANNING" | "ACTIVE" | "CLOSED";
  months: number[];
};

const SEMESTERS = gql`
  query AdminSemesters {
    semesters { code startDate endDate status months }
  }
`;
const CREATE = gql`
  mutation CreateSemester($input: CreateAcademicSemesterInput!) {
    createSemester(input: $input) { code }
  }
`;
const ACTIVATE = gql`
  mutation ActivateSemester($code: String!) {
    activateSemester(code: $code) { code status }
  }
`;

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function suggestedCode() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() <= 6 ? 1 : 2}`;
}

export function AdminSemestresPage() {
  const { data, loading, refetch } = useQuery<{ semesters: Semester[] }>(SEMESTERS, {
    fetchPolicy: "cache-and-network",
  });
  const [createSemester, { loading: creating }] = useMutation(CREATE);
  const [activateSemester, { loading: activating }] = useMutation(ACTIVATE);
  const [showCreate, setShowCreate] = useState(false);
  const [code, setCode] = useState(suggestedCode());
  const [message, setMessage] = useState<string | null>(null);
  const semesters = useMemo(() => data?.semesters ?? [], [data?.semesters]);

  const create = async () => {
    setMessage(null);
    try {
      await createSemester({ variables: { input: { code } } });
      await refetch();
      setShowCreate(false);
      setMessage(`Semestre ${code} creado en planificación.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible crear el semestre.");
    }
  };

  const activate = async (semester: Semester) => {
    if (!window.confirm(`¿Activar ${semester.code}? El semestre activo actual quedará cerrado.`)) return;
    setMessage(null);
    try {
      await activateSemester({ variables: { code: semester.code } });
      await refetch();
      setMessage(`Semestre ${semester.code} activado.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible activar el semestre.");
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Semestres</h1>
          <p className="mt-1 text-sm text-slate-500">Planifica y controla el período académico visible para tutores.</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1B3A52] px-4 py-2.5 text-sm font-medium text-white">
          <Plus className="h-4 w-4" /> Nuevo semestre
        </button>
      </header>

      {message && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div>}

      {showCreate && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Crear semestre en planificación</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="2026-2"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button onClick={create} disabled={creating}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1B3A52] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {creating && <Loader2 className="h-4 w-4 animate-spin" />} Crear
            </button>
            <button onClick={() => setShowCreate(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancelar</button>
          </div>
          <p className="mt-2 text-xs text-slate-500">Primer semestre: marzo–julio. Segundo semestre: agosto–diciembre.</p>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading && semesters.length === 0 ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {semesters.map((semester) => (
              <div key={semester.code} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600"><CalendarRange className="h-5 w-5" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-slate-900">{semester.code}</h2>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        semester.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700"
                          : semester.status === "PLANNING" ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-500"
                      }`}>
                        {semester.status === "ACTIVE" ? "Activo" : semester.status === "PLANNING" ? "Planificación" : "Cerrado"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {new Date(semester.startDate).toLocaleDateString("es-CL")} – {new Date(semester.endDate).toLocaleDateString("es-CL")}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{semester.months.map((month) => MONTHS[month - 1]).join(", ")}</p>
                  </div>
                </div>
                {semester.status === "PLANNING" && (
                  <button onClick={() => activate(semester)} disabled={activating}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                    <CheckCircle2 className="h-4 w-4" /> Activar semestre
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
