"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, Plus, RefreshCw, Trash2, UserPlus } from "lucide-react";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";

const OFFERING_DETAIL = gql`
  query AdminOfferingDetail($id: ID!) {
    offering(id: $id) {
      id
      name
      semester
      status
      slotsCount
      enrollmentsCount
      slots {
        id
        tutorId
        tutorName
        tutorEmail
        roomName
        dayOfWeek
        startTime
        endTime
        maxCapacity
        enrolledCount
      }
    }
    tutorOptions {
      tutorId
      name
      email
    }
  }
`;

const ENROLLED_STUDENTS = gql`
  query EnrolledStudents($slotId: ID!) {
    enrolledStudents(slotId: $slotId) {
      id
      studentEmail
      studentName
      studentPhone
      source
      enrolledAt
    }
  }
`;

const ADD_SLOT = gql`
  mutation AddSlot($input: AddSlotInput!) {
    addSlotToOffering(input: $input) {
      id
    }
  }
`;

const REMOVE_SLOT = gql`
  mutation RemoveSlot($slotId: ID!) {
    removeSlot(slotId: $slotId)
  }
`;

const DELETE_OFFERING = gql`
  mutation DeleteOffering($id: ID!) {
    deleteOffering(id: $id)
  }
`;

const CREATE_ENROLLMENT = gql`
  mutation CreateEnrollment($input: CreateEnrollmentInput!) {
    createEnrollment(input: $input) {
      id
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

interface Slot {
  id: string;
  tutorId: string;
  tutorName: string;
  tutorEmail: string;
  roomName: string | null;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  enrolledCount: number;
}

interface Offering {
  id: string;
  name: string;
  semester: string;
  status: string;
  slotsCount: number;
  enrollmentsCount: number;
  slots: Slot[];
}

interface TutorOption {
  tutorId: string;
  name: string;
  email: string;
}

interface Enrollment {
  id: string;
  studentEmail: string;
  studentName: string;
  studentPhone: string | null;
  source: string;
  enrolledAt: string;
}

const dayOptions = [
  ["MONDAY", "Lunes"],
  ["TUESDAY", "Martes"],
  ["WEDNESDAY", "Miércoles"],
  ["THURSDAY", "Jueves"],
  ["FRIDAY", "Viernes"],
  ["SATURDAY", "Sábado"],
] as const;

const dayLabel = Object.fromEntries(dayOptions);

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

function labelForBlock(startTime: string, endTime: string): string {
  const block = blockOptions.find((item) => item.startTime === startTime && item.endTime === endTime);
  return block ? `Bloque ${block.label}` : `${startTime}-${endTime}`;
}

export function AdminOfferingDetailPage({ offeringId }: { offeringId: string }) {
  const [slotFormOpen, setSlotFormOpen] = useState(false);
  const [enrollmentFormOpen, setEnrollmentFormOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const [slotForm, setSlotForm] = useState({
    tutorId: "",
    dayOfWeek: "MONDAY",
    block: "A",
    maxCapacity: 30,
    roomName: "",
  });
  const [enrollmentForm, setEnrollmentForm] = useState({
    studentName: "",
    studentEmail: "",
    studentPhone: "",
  });

  const { data, loading, error } = useQuery<{
    offering: Offering | null;
    tutorOptions: TutorOption[];
  }>(OFFERING_DETAIL, {
    variables: { id: offeringId },
    fetchPolicy: "cache-and-network",
  });

  const { data: enrolledData, refetch: refetchEnrollments } = useQuery<{
    enrolledStudents: Enrollment[];
  }>(ENROLLED_STUDENTS, {
    variables: { slotId: selectedSlotId },
    skip: !selectedSlotId,
    fetchPolicy: "cache-and-network",
  });

  const refetchDetail = () => [{ query: OFFERING_DETAIL, variables: { id: offeringId } }];
  const [addSlot, { loading: addingSlot }] = useMutation(ADD_SLOT, { refetchQueries: refetchDetail });
  const [removeSlot] = useMutation(REMOVE_SLOT, { refetchQueries: refetchDetail });
  const [deleteOffering, { loading: deletingOffering }] = useMutation(DELETE_OFFERING);
  const [createEnrollment, { loading: creatingEnrollment }] = useMutation(CREATE_ENROLLMENT, {
    refetchQueries: refetchDetail,
  });
  const [syncForm, { loading: syncing }] = useMutation(SYNC_FORM, { refetchQueries: refetchDetail });

  const offering = data?.offering ?? null;
  const tutors = data?.tutorOptions ?? [];
  const selectedSlot = useMemo(
    () => offering?.slots.find((slot) => slot.id === selectedSlotId) ?? null,
    [offering, selectedSlotId]
  );
  const enrollments = enrolledData?.enrolledStudents ?? [];

  const handleAddSlot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setSlotError(null);
    const selectedBlock = blockByLabel(slotForm.block);
    try {
      await addSlot({
        variables: {
          input: {
            offeringId,
            tutorId: slotForm.tutorId,
            dayOfWeek: slotForm.dayOfWeek,
            startTime: selectedBlock.startTime,
            endTime: selectedBlock.endTime,
            maxCapacity: Number(slotForm.maxCapacity),
            roomName: slotForm.roomName || null,
          },
        },
      });
      setSlotFormOpen(false);
    } catch (err: unknown) {
      const gqlMsg =
        (err as { graphQLErrors?: { message: string }[] })?.graphQLErrors?.[0]?.message ??
        (err instanceof Error ? err.message : null);
      if (gqlMsg?.includes("TUTOR_SCHEDULE_CONFLICT") || gqlMsg?.toLowerCase().includes("tutor")) {
        setSlotError(`⚠️ Conflicto de tutor: ${gqlMsg}`);
      } else if (gqlMsg?.includes("ROOM_SCHEDULE_CONFLICT") || gqlMsg?.toLowerCase().includes("sala")) {
        setSlotError(`⚠️ Conflicto de sala: ${gqlMsg}`);
      } else {
        setSlotError(gqlMsg ?? "No fue posible guardar el horario.");
      }
    }
  };

  const handleCreateEnrollment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSlotId) return;
    setEnrollmentError(null);
    try {
      await createEnrollment({
        variables: {
          input: {
            slotId: selectedSlotId,
            studentName: enrollmentForm.studentName,
            studentEmail: enrollmentForm.studentEmail,
            studentPhone: enrollmentForm.studentPhone || null,
            source: "MANUAL",
          },
        },
      });
      setEnrollmentForm({ studentName: "", studentEmail: "", studentPhone: "" });
      setEnrollmentFormOpen(false);
      await refetchEnrollments();
    } catch (err: unknown) {
      const gqlMsg =
        (err as { graphQLErrors?: { message: string }[] })?.graphQLErrors?.[0]?.message ??
        (err instanceof Error ? err.message : null);
      setEnrollmentError(gqlMsg ?? "No fue posible inscribir al estudiante.");
    }
  };

  const handleSyncForm = async () => {
    if (!offering) return;
    const result = await syncForm({ variables: { semester: offering.semester } });
    const sync = (result.data as { syncFormResponses?: { newEnrollments: number; skipped: number } } | undefined)?.syncFormResponses;
    setMessage(sync ? `Sync listo: ${sync.newEnrollments} nuevas, ${sync.skipped} omitidas.` : "Sincronización lista.");
  };

  const handleDeleteOffering = async () => {
    await deleteOffering({ variables: { id: offeringId } });
    window.location.href = "/admin/tutorias";
  };

  if (loading && !offering) {
    return <div className="h-40 animate-pulse rounded-lg bg-white" />;
  }

  if (!offering || error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        No fue posible cargar la oferta.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin/tutorias" className="text-sm font-medium text-[#23415B] hover:underline">
            Volver a tutorías
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{offering.name}</h1>
          <p className="text-sm text-slate-600">
            Semestre {offering.semester} · {offering.status} · {offering.enrollmentsCount} inscrito(s)
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => setSlotFormOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#23415B] px-4 text-sm font-medium text-white hover:bg-[#1a3146]"
          >
            <Plus className="h-4 w-4" />
            Agregar horario
          </button>
          <button
            onClick={handleSyncForm}
            disabled={syncing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            Sincronizar
          </button>
          <button
            onClick={() => setConfirmDeleteOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </button>
        </div>
      </header>

      {message && (
        <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
          {message}
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Horarios</h2>
        </div>
        {offering.slots.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">Agrega al menos un horario para publicar esta tutoría.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Día y hora</th>
                  <th className="px-4 py-3 text-left">Tutor</th>
                  <th className="px-4 py-3 text-left">Sala</th>
                  <th className="px-4 py-3 text-left">Cupo</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {offering.slots.map((slot) => (
                  <tr key={slot.id} className={selectedSlotId === slot.id ? "bg-sky-50" : "hover:bg-slate-50/70"}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {dayLabel[slot.dayOfWeek] ?? slot.dayOfWeek} · {labelForBlock(slot.startTime, slot.endTime)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {slot.tutorName}
                      <span className="block text-xs text-slate-400">{slot.tutorEmail}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{slot.roomName ?? "Sin sala"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {slot.enrolledCount}/{slot.maxCapacity}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedSlotId(slot.id)}
                        className="mr-2 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Inscritos
                      </button>
                      <button
                        onClick={() => removeSlot({ variables: { slotId: slot.id } })}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Inscritos</h2>
            <p className="text-sm text-slate-500">
              {selectedSlot ? `${dayLabel[selectedSlot.dayOfWeek] ?? selectedSlot.dayOfWeek} · ${labelForBlock(selectedSlot.startTime, selectedSlot.endTime)}` : "Selecciona un horario."}
            </p>
          </div>
          <button
            onClick={() => setEnrollmentFormOpen(true)}
            disabled={!selectedSlot}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#23415B] px-3 text-sm font-medium text-white hover:bg-[#1a3146] disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            Inscribir estudiante
          </button>
        </div>
        {selectedSlot && enrollments.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
            Este horario todavía no tiene inscritos.
          </p>
        ) : null}
        {enrollments.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-100 rounded-md border border-slate-200">
            {enrollments.map((student) => (
              <li key={student.id} className="flex flex-col gap-1 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-900">{student.studentName}</p>
                  <p className="text-xs text-slate-500">{student.studentEmail} · {student.studentPhone ?? "sin teléfono"}</p>
                </div>
                <span className="text-xs font-semibold text-slate-500">{student.source}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {slotFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form onSubmit={handleAddSlot} className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-slate-900">Agregar horario</h2>
            {tutors.length === 0 && (
              <div className="mt-3 flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                No hay tutores activos disponibles.
              </div>
            )}
            {slotError && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{slotError}</p>
              </div>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                Tutor
                <select
                  required
                  value={slotForm.tutorId}
                  onChange={(event) => setSlotForm((prev) => ({ ...prev, tutorId: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar tutor</option>
                  {tutors.map((tutor) => (
                    <option key={tutor.tutorId} value={tutor.tutorId}>{tutor.name} · {tutor.email}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Día
                <select
                  value={slotForm.dayOfWeek}
                  onChange={(event) => setSlotForm((prev) => ({ ...prev, dayOfWeek: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  {dayOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Sala
                <input
                  value={slotForm.roomName}
                  onChange={(event) => setSlotForm((prev) => ({ ...prev, roomName: event.target.value }))}
                  placeholder="207"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Bloque
                <select
                  value={slotForm.block}
                  onChange={(event) => setSlotForm((prev) => ({ ...prev, block: event.target.value }))}
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
                Cupo
                <input type="number" min={1} value={slotForm.maxCapacity} onChange={(event) => setSlotForm((prev) => ({ ...prev, maxCapacity: Number(event.target.value) }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => { setSlotFormOpen(false); setSlotError(null); }} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button disabled={addingSlot} className="rounded-md bg-[#23415B] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a3146] disabled:opacity-60">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {enrollmentFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form onSubmit={handleCreateEnrollment} className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-slate-900">Inscribir estudiante</h2>
            {enrollmentError && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{enrollmentError}</p>
              </div>
            )}
            <div className="mt-4 space-y-3">
              <input required placeholder="Nombre completo" value={enrollmentForm.studentName} onChange={(event) => setEnrollmentForm((prev) => ({ ...prev, studentName: event.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input required type="email" placeholder="correo@alumnos.ucn.cl" value={enrollmentForm.studentEmail} onChange={(event) => setEnrollmentForm((prev) => ({ ...prev, studentEmail: event.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input placeholder="Teléfono" value={enrollmentForm.studentPhone} onChange={(event) => setEnrollmentForm((prev) => ({ ...prev, studentPhone: event.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => { setEnrollmentFormOpen(false); setEnrollmentError(null); }} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button disabled={creatingEnrollment} className="rounded-md bg-[#23415B] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a3146] disabled:opacity-60">Inscribir</button>
            </div>
          </form>
        </div>
      )}

      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-slate-900">Eliminar tutoría</h2>
            <p className="mt-2 text-sm text-slate-600">
              Se eliminará la tutoría, sus horarios e inscripciones. Esta acción no se puede deshacer.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteOffering}
                disabled={deletingOffering}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletingOffering ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
