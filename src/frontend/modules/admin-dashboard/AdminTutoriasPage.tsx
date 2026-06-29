"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ClipboardList, ExternalLink, LoaderCircle, Plus, Search, BookOpen, Clock, Users, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { CareersManagerModal } from "./CareersManagerModal";
import { SemesterSelect } from "./components/SemesterSelect";

const OFFERINGS = gql`
  query AdminOfferings($semester: String) {
    offerings(semester: $semester) {
      id
      name
      semester
      status
      slotsCount
      enrollmentsCount
    }
    tutorOptions {
      tutorId
      name
      email
    }
    careers {
      id
      name
      schoolName
    }
  }
`;

const CREATE_OFFERING = gql`
  mutation CreateOffering($input: CreateOfferingInput!) {
    createOffering(input: $input) {
      id
    }
  }
`;

const ADD_SLOT = gql`
  mutation AddInitialSlot($input: AddSlotInput!) {
    addSlotToOffering(input: $input) {
      id
    }
  }
`;

const GENERATE_FORM = gql`
  mutation GenerateGlobalForm($semester: String, $existingFormId: String) {
    generateGoogleForm(semester: $semester, existingFormId: $existingFormId) {
      formUrl
      formEditUrl
    }
  }
`;

const SYNC_FORM = gql`
  mutation SyncForm($semester: String) {
    syncFormResponses(semester: $semester) {
      newEnrollments
      skipped
      errors
    }
  }
`;

interface OfferingRow {
  id: string;
  name: string;
  semester: string;
  status: string;
  slotsCount: number;
  enrollmentsCount: number;
}

interface TutorOption {
  tutorId: string;
  name: string;
  email: string;
}

interface CareerOption {
  id: string;
  name: string;
  schoolName: string;
}

function currentSemester(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() <= 6 ? 1 : 2}`;
}

const dayOptions = [
  ["MONDAY", "Lunes"],
  ["TUESDAY", "Martes"],
  ["WEDNESDAY", "Miércoles"],
  ["THURSDAY", "Jueves"],
  ["FRIDAY", "Viernes"],
  ["SATURDAY", "Sábado"],
] as const;

const blockOptions = [
  { label: "A", startTime: "08:10", endTime: "09:40" },
  { label: "B", startTime: "09:55", endTime: "11:25" },
  { label: "C", startTime: "11:40", endTime: "13:10" },
  { label: "D", startTime: "14:30", endTime: "16:00" },
  { label: "E", startTime: "16:15", endTime: "17:45" },
  { label: "F", startTime: "18:00", endTime: "19:30" },
] as const;



function blockByLabel(label: string) {
  return blockOptions.find((block) => block.label === label) ?? blockOptions[0];
}

export function AdminTutoriasPage() {
  const router = useRouter();
  const [semester, setSemester] = useState(currentSemester());
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isManagingCareers, setIsManagingCareers] = useState(false);
  const [name, setName] = useState("");
  const [initialSlot, setInitialSlot] = useState({
    tutorId: "",
    dayOfWeek: "MONDAY",
    block: "A",
    maxCapacity: 30,
    roomName: "",
  });
  const [targetCareers, setTargetCareers] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [generatedForm, setGeneratedForm] = useState<{ formUrl: string; formEditUrl: string } | null>(null);

  const { data, loading, error } = useQuery<{
    offerings: OfferingRow[];
    tutorOptions: TutorOption[];
    careers: CareerOption[];
  }>(OFFERINGS, {
    variables: { semester },
    fetchPolicy: "cache-and-network",
  });
  const [createOffering, { loading: creating }] = useMutation(CREATE_OFFERING, {
    refetchQueries: ["AdminOfferings"],
  });
  const [addSlot] = useMutation(ADD_SLOT);
  const [generateForm, { loading: generatingForm }] = useMutation(GENERATE_FORM);
  const [syncForm, { loading: syncingForm }] = useMutation(SYNC_FORM, {
    refetchQueries: ["AdminOfferings"],
  });

  const offerings = useMemo(() => data?.offerings ?? [], [data?.offerings]);
  const filteredOfferings = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return offerings;
    return offerings.filter((offering) => offering.name.toLowerCase().includes(needle));
  }, [offerings, searchTerm]);
  const tutors = data?.tutorOptions ?? [];
  const careerOptions = data?.careers ?? [];
  const totalEnrollments = useMemo(
    () => filteredOfferings.reduce((sum, offering) => sum + offering.enrollmentsCount, 0),
    [filteredOfferings]
  );
  const totalSlots = useMemo(
    () => filteredOfferings.reduce((sum, offering) => sum + offering.slotsCount, 0),
    [filteredOfferings]
  );

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    if (!name.trim()) {
      setErrorMessage("Ingresa el nombre de la tutoría.");
      return;
    }
    if (!initialSlot.tutorId) {
      setErrorMessage("Selecciona el tutor que realizará la tutoría.");
      return;
    }
    if (targetCareers.length === 0) {
      setErrorMessage("Debes seleccionar al menos una carrera objetivo para la tutoría.");
      return;
    }
    const selectedBlock = blockByLabel(initialSlot.block);
    try {
      const result = await createOffering({ variables: { input: { name: name.trim(), semester, targetCareers } } });
      const offeringId = (result.data as { createOffering?: { id: string } } | undefined)?.createOffering?.id;
      if (!offeringId) {
        setErrorMessage("La tutoría se creó, pero no fue posible leer su identificador.");
        return;
      }
      await addSlot({
        variables: {
          input: {
            offeringId,
            tutorId: initialSlot.tutorId,
            dayOfWeek: initialSlot.dayOfWeek,
            startTime: selectedBlock.startTime,
            endTime: selectedBlock.endTime,
            maxCapacity: Number(initialSlot.maxCapacity),
            roomName: initialSlot.roomName || null,
          },
        },
      });
      setName("");
      setTargetCareers([]);
      setIsCreating(false);
      router.push(`/admin/tutorias/${offeringId}`);
    } catch (err: unknown) {
      const gqlMsg =
        (err as { graphQLErrors?: { message: string }[] })?.graphQLErrors?.[0]?.message ??
        (err instanceof Error ? err.message : null);
      if (gqlMsg?.includes("TUTOR_SCHEDULE_CONFLICT") || gqlMsg?.toLowerCase().includes("tutor")) {
        setErrorMessage(`⚠️ Conflicto de tutor: ${gqlMsg}`);
      } else if (gqlMsg?.includes("ROOM_SCHEDULE_CONFLICT") || gqlMsg?.toLowerCase().includes("sala")) {
        setErrorMessage(`⚠️ Conflicto de sala: ${gqlMsg}`);
      } else {
        setErrorMessage(gqlMsg ?? "Ocurrió un error al crear la tutoría.");
      }
    }
  };

  const handleGenerateForm = async () => {
    setErrorMessage(null);
    setFormMessage(null);
    try {
      const result = await generateForm({ variables: { semester } });
      const urls = (result.data as { generateGoogleForm?: { formUrl?: string; formEditUrl?: string } } | undefined)?.generateGoogleForm;
      if (urls?.formUrl && urls?.formEditUrl) {
        setGeneratedForm({ formUrl: urls.formUrl, formEditUrl: urls.formEditUrl });
      } else {
        setFormMessage("Formulario global generado exitosamente.");
      }
    } catch (err: unknown) {
      const gqlMsg = (err as { graphQLErrors?: { message: string }[] })?.graphQLErrors?.[0]?.message ?? (err instanceof Error ? err.message : null);
      setErrorMessage(`Error al generar formulario: ${gqlMsg ?? "Desconocido"}`);
    }
  };

  const handleGlobalSync = async () => {
    setErrorMessage(null);
    setFormMessage(null);
    try {
      const result = await syncForm({ variables: { semester } });
      const sync = (result.data as { syncFormResponses?: { newEnrollments: number; skipped: number } } | undefined)?.syncFormResponses;
      setFormMessage(sync ? `Sincronización global lista: ${sync.newEnrollments} nuevas, ${sync.skipped} omitidas.` : "Sincronización global lista.");
    } catch (err: unknown) {
      const gqlMsg = (err as { graphQLErrors?: { message: string }[] })?.graphQLErrors?.[0]?.message ?? (err instanceof Error ? err.message : null);
      setErrorMessage(`Error al sincronizar: ${gqlMsg ?? "Desconocido"}`);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {generatedForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-emerald-100 p-2.5">
                <ExternalLink className="h-5 w-5 text-emerald-600" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">Formulario generado</h2>
              <button onClick={() => setGeneratedForm(null)} className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <ClipboardList className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              El formulario de inscripción para el semestre <strong>{semester}</strong> fue creado y configurado correctamente.
            </p>
            <div className="flex flex-col gap-2">
              <a
                href={generatedForm.formEditUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg bg-[#23415B] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1a3048]"
              >
                <ExternalLink className="h-4 w-4" />
                Editar formulario
              </a>
              <a
                href={generatedForm.formUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink className="h-4 w-4" />
                Ver formulario (vista estudiante)
              </a>
              <button
                onClick={() => setGeneratedForm(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">Semestre {semester}</p>
          <h1 className="text-2xl font-bold text-slate-900">Ofertas de Tutoría</h1>
          <p className="mt-1 text-sm text-slate-600">
            {filteredOfferings.length} oferta(s), {totalEnrollments} estudiante(s) inscrito(s).
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5 xl:w-auto">
          <SemesterSelect
            value={semester}
            onChange={setSemester}
            className="h-10 min-w-0 rounded-md border border-slate-300 px-3 text-sm sm:col-span-2 lg:col-span-1 lg:w-28"
          />
          <button
            onClick={handleGlobalSync}
            disabled={syncingForm}
            className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${syncingForm ? "animate-spin" : ""}`} />
            Sincronizar Respuestas
          </button>
          <button
            onClick={handleGenerateForm}
            disabled={generatingForm}
            className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {generatingForm ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            Generar Form
          </button>
          <button
            onClick={() => setIsManagingCareers(true)}
            className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <BookOpen className="h-4 w-4" />
            Carreras Ofertadas
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-md bg-[#23415B] px-3 text-sm font-medium text-white hover:bg-[#1a3146]"
          >
            <Plus className="h-4 w-4" />
            Nueva Tutoría
          </button>
        </div>
      </header>

      {(error || errorMessage) && (
        <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{errorMessage ?? "No fue posible cargar las tutorías."}</p>
        </div>
      )}

      {formMessage && (
        <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
          {formMessage.startsWith("http") ? (
            <a href={formMessage} target="_blank" rel="noreferrer" className="font-medium underline">
              Abrir formulario global generado
            </a>
          ) : (
            formMessage
          )}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="flex min-w-0 items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <BookOpen className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">Total Tutorías</p>
            <p className="text-2xl font-bold text-slate-900">{filteredOfferings.length}</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Clock className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">Paralelos Abiertos</p>
            <p className="text-2xl font-bold text-slate-900">{totalSlots}</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2 xl:col-span-1">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Users className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">Alumnos Inscritos</p>
            <p className="text-2xl font-bold text-slate-900">{totalEnrollments}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Tutorías publicables</h2>
              <label className="relative w-full md:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nombre"
                  className="h-9 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-[#23415B] focus:ring-1 focus:ring-[#23415B]"
                />
              </label>
            </div>
            {loading && !data ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-12 animate-pulse rounded-md bg-slate-100" />
                ))}
              </div>
            ) : filteredOfferings.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
                <ClipboardList className="mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">No hay tutorías que coincidan con la búsqueda.</p>
              </div>
            ) : (
              <>
              <div className="divide-y divide-slate-100 md:hidden">
                {filteredOfferings.map((offering) => (
                  <article key={offering.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/admin/tutorias/${offering.id}`} className="min-w-0 flex-1 font-semibold text-slate-900 hover:text-[#23415B] hover:underline">
                        {offering.name}
                      </Link>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${offering.status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                        }`}>
                        {offering.status === "OPEN" ? "ABIERTA" : "CERRADA"}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-md bg-slate-50 px-3 py-2">
                        <p className="text-xs font-medium text-slate-500">Paralelos</p>
                        <p className="font-semibold text-slate-900">{offering.slotsCount}</p>
                      </div>
                      <div className="rounded-md bg-slate-50 px-3 py-2">
                        <p className="text-xs font-medium text-slate-500">Inscritos</p>
                        <p className="font-semibold text-slate-900">{offering.enrollmentsCount}</p>
                      </div>
                    </div>
                    <Link
                      href={`/admin/tutorias/${offering.id}`}
                      className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-md bg-[#23415B] px-3 text-xs font-medium text-white hover:bg-[#1a3146]"
                    >
                      Ver detalles
                    </Link>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Nombre</th>
                      <th className="px-4 py-3 text-left">Paralelos</th>
                      <th className="px-4 py-3 text-left">Inscritos</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOfferings.map((offering) => (
                      <tr key={offering.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <Link href={`/admin/tutorias/${offering.id}`} className="hover:text-[#23415B] hover:underline">
                            {offering.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{offering.slotsCount}</td>
                        <td className="px-4 py-3 text-slate-600">{offering.enrollmentsCount}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${offering.status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                            }`}>
                            {offering.status === "OPEN" ? "ABIERTA" : "CERRADA"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/tutorias/${offering.id}`}
                            className="inline-flex items-center rounded-md bg-[#23415B] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1a3146]"
                          >
                            Ver detalles
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <section className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Demanda por Tutoría</h2>
            {filteredOfferings.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                Sin datos suficientes
              </div>
            ) : (
              <div className="h-56 w-full sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredOfferings} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="enrollmentsCount" name="Inscritos" fill="#23415B" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        </div>
      </div>

      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:items-center sm:p-4">
          <form onSubmit={handleCreate} className="my-4 w-full max-w-xl rounded-lg bg-white p-5 shadow-xl sm:my-0 sm:max-h-[calc(100vh-2rem)] sm:overflow-y-auto">
            <h2 className="text-base font-semibold text-slate-900">Nueva Tutoría</h2>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Nombre de la asignatura
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                autoFocus
              />
            </label>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                Tutor
                <select
                  required
                  value={initialSlot.tutorId}
                  onChange={(event) => setInitialSlot((prev) => ({ ...prev, tutorId: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar tutor</option>
                  {tutors.map((tutor) => (
                    <option key={tutor.tutorId} value={tutor.tutorId}>
                      {tutor.name} · {tutor.email}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Día de realización
                <select
                  value={initialSlot.dayOfWeek}
                  onChange={(event) => setInitialSlot((prev) => ({ ...prev, dayOfWeek: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  {dayOptions.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Sala
                <input
                  value={initialSlot.roomName}
                  onChange={(event) => setInitialSlot((prev) => ({ ...prev, roomName: event.target.value }))}
                  placeholder="207"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Bloque
                <select
                  value={initialSlot.block}
                  onChange={(event) => setInitialSlot((prev) => ({ ...prev, block: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  {blockOptions.map((block) => (
                    <option key={block.label} value={block.label}>
                      Bloque {block.label} · {block.startTime}-{block.endTime}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Cupo máximo
                <input
                  type="number"
                  min={1}
                  value={initialSlot.maxCapacity}
                  onChange={(event) => setInitialSlot((prev) => ({ ...prev, maxCapacity: Number(event.target.value) }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <div className="sm:col-span-2">
                <span className="block text-sm font-medium text-slate-700">Carreras Objetivo</span>
                <div className="mt-1 flex max-h-40 flex-col gap-2 overflow-y-auto rounded-md border border-slate-300 bg-white p-2">
                  {careerOptions.map((career) => (
                    <label key={career.id} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={targetCareers.includes(career.name)}
                        onChange={(e) => {
                          if (e.target.checked) setTargetCareers((prev) => [...prev, career.name]);
                          else setTargetCareers((prev) => prev.filter((c) => c !== career.name));
                        }}
                        className="rounded border-slate-300 text-[#23415B] focus:ring-[#23415B]"
                      />
                      {career.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {tutors.length === 0 ? (
              <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                No hay tutores activos disponibles. Crea o activa un tutor antes de publicar una tutoría.
              </p>
            ) : null}
            {errorMessage && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{errorMessage}</p>
              </div>
            )}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => { setIsCreating(false); setErrorMessage(null); }}
                className="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                disabled={creating}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#23415B] px-4 text-sm font-medium text-white hover:bg-[#1a3146] disabled:opacity-60"
              >
                {creating && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Crear
              </button>
            </div>
          </form>
        </div>
      )}
      {isManagingCareers && <CareersManagerModal onClose={() => setIsManagingCareers(false)} />}
    </div>
  );
}
