"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ClipboardList, ExternalLink, LoaderCircle, Plus, Search } from "lucide-react";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";

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
  mutation GenerateGlobalForm($semester: String) {
    generateGoogleForm(semester: $semester) {
      formUrl
      formEditUrl
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
  const [name, setName] = useState("");
  const [initialSlot, setInitialSlot] = useState({
    tutorId: "",
    dayOfWeek: "MONDAY",
    block: "A",
    maxCapacity: 30,
    roomName: "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const { data, loading, error } = useQuery<{
    offerings: OfferingRow[];
    tutorOptions: TutorOption[];
  }>(OFFERINGS, {
    variables: { semester },
    fetchPolicy: "cache-and-network",
  });
  const [createOffering, { loading: creating }] = useMutation(CREATE_OFFERING, {
    refetchQueries: ["AdminOfferings"],
  });
  const [addSlot] = useMutation(ADD_SLOT);
  const [generateForm, { loading: generatingForm }] = useMutation(GENERATE_FORM);

  const offerings = useMemo(() => data?.offerings ?? [], [data?.offerings]);
  const filteredOfferings = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return offerings;
    return offerings.filter((offering) => offering.name.toLowerCase().includes(needle));
  }, [offerings, searchTerm]);
  const tutors = data?.tutorOptions ?? [];
  const totalEnrollments = useMemo(
    () => filteredOfferings.reduce((sum, offering) => sum + offering.enrollmentsCount, 0),
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
    const selectedBlock = blockByLabel(initialSlot.block);
    try {
      const result = await createOffering({ variables: { input: { name: name.trim(), semester } } });
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
    const result = await generateForm({ variables: { semester } });
    const formUrl = (result.data as { generateGoogleForm?: { formUrl?: string } } | undefined)?.generateGoogleForm?.formUrl;
    setFormMessage(formUrl ?? "Formulario global generado.");
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Semestre {semester}</p>
          <h1 className="text-2xl font-bold text-slate-900">Ofertas de Tutoría</h1>
          <p className="mt-1 text-sm text-slate-600">
            {filteredOfferings.length} oferta(s), {totalEnrollments} estudiante(s) inscrito(s).
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={semester}
            onChange={(event) => setSemester(event.target.value)}
            className="h-10 rounded-md border border-slate-300 px-3 text-sm"
            aria-label="Semestre"
          />
          <button
            onClick={handleGenerateForm}
            disabled={generatingForm}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {generatingForm ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            Generar Form
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#23415B] px-4 text-sm font-medium text-white hover:bg-[#1a3146]"
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

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Tutorías publicables</h2>
          <label className="relative w-full sm:w-80">
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Horarios</th>
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
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        offering.status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {offering.status}
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
        )}
      </section>

      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form onSubmit={handleCreate} className="w-full max-w-xl rounded-lg bg-white p-5 shadow-xl">
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
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setIsCreating(false); setErrorMessage(null); }}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-md bg-[#23415B] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a3146] disabled:opacity-60"
              >
                {creating && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Crear
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
