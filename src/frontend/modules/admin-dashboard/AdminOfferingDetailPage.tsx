"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState, useEffect } from "react";
import { AlertTriangle, Plus, RefreshCw, Trash2, UserPlus, ArrowLeft, Pencil } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
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
      studentRut
      studentCareer
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

const UPDATE_SLOT = gql`
  mutation UpdateSlot($slotId: ID!, $input: UpdateSlotInput!) {
    updateSlot(slotId: $slotId, input: $input) {
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

const REMOVE_ENROLLMENT = gql`
  mutation RemoveEnrollment($enrollmentId: ID!) {
    removeEnrollment(enrollmentId: $enrollmentId)
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
  studentRut: string | null;
  studentCareer: string | null;
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
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [editSlotForm, setEditSlotForm] = useState({
    tutorId: "",
    dayOfWeek: "MONDAY",
    block: "A",
    maxCapacity: "",
    roomName: "",
  });
  const [editSlotError, setEditSlotError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const [slotForm, setSlotForm] = useState({
    tutorId: "",
    dayOfWeek: "MONDAY",
    block: "A",
    maxCapacity: "",
    roomName: "",
  });
  const [enrollmentForm, setEnrollmentForm] = useState({
    studentName: "",
    studentRut: "",
    studentEmail: "",
    studentCareer: "",
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
  const [updateSlotMutation, { loading: updatingSlot }] = useMutation(UPDATE_SLOT, { refetchQueries: refetchDetail });
  const [removeSlot] = useMutation(REMOVE_SLOT, { refetchQueries: refetchDetail });
  const [deleteOffering, { loading: deletingOffering }] = useMutation(DELETE_OFFERING);
  const [createEnrollment, { loading: creatingEnrollment }] = useMutation(CREATE_ENROLLMENT, {
    refetchQueries: refetchDetail,
  });
  const [removeEnrollment] = useMutation(REMOVE_ENROLLMENT, {
    refetchQueries: refetchDetail,
  });
  const [syncForm] = useMutation(SYNC_FORM, { refetchQueries: refetchDetail });

  const handleRemoveEnrollment = async (enrollmentId: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este estudiante del paralelo? Esta acción no se puede deshacer.")) return;
    try {
      await removeEnrollment({ variables: { enrollmentId } });
      refetchEnrollments();
    } catch (err) {
      console.error(err);
      alert("No se pudo eliminar al estudiante.");
    }
  };

  const offering = data?.offering ?? null;
  const tutors = data?.tutorOptions ?? [];
  const selectedSlot = useMemo(
    () => offering?.slots.find((slot) => slot.id === selectedSlotId) ?? null,
    [offering, selectedSlotId]
  );
  const enrollments = enrolledData?.enrolledStudents ?? [];

  useEffect(() => {
    if (!selectedSlotId && offering && offering.slots.length > 0) {
      setSelectedSlotId(offering.slots[0].id);
    }
  }, [offering, selectedSlotId]);

  const handleAddSlot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setSlotError(null);
    const parsedCapacity = Number(slotForm.maxCapacity);
    if (!slotForm.maxCapacity || !Number.isInteger(parsedCapacity) || parsedCapacity < 1) {
      setSlotError("El cupo máximo debe ser un número entero mayor a 0.");
      return;
    }
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
            maxCapacity: parsedCapacity,
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

  const openEditSlot = (slot: Slot) => {
    const matchedBlock = blockOptions.find(
      (b) => b.startTime === slot.startTime && b.endTime === slot.endTime
    );
    setEditSlotForm({
      tutorId: slot.tutorId,
      dayOfWeek: slot.dayOfWeek,
      block: matchedBlock?.label ?? "A",
      maxCapacity: String(slot.maxCapacity),
      roomName: slot.roomName ?? "",
    });
    setEditSlotError(null);
    setEditingSlot(slot);
  };

  const handleUpdateSlot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingSlot) return;
    setEditSlotError(null);
    const parsedCapacity = Number(editSlotForm.maxCapacity);
    if (!editSlotForm.maxCapacity || !Number.isInteger(parsedCapacity) || parsedCapacity < 1) {
      setEditSlotError("El cupo máximo debe ser un número entero mayor a 0.");
      return;
    }
    if (parsedCapacity < editingSlot.enrolledCount) {
      setEditSlotError(`El cupo no puede ser menor a los inscritos actuales (${editingSlot.enrolledCount}).`);
      return;
    }
    const selectedBlock = blockByLabel(editSlotForm.block);
    try {
      await updateSlotMutation({
        variables: {
          slotId: editingSlot.id,
          input: {
            tutorId: editSlotForm.tutorId,
            dayOfWeek: editSlotForm.dayOfWeek,
            startTime: selectedBlock.startTime,
            endTime: selectedBlock.endTime,
            maxCapacity: parsedCapacity,
            roomName: editSlotForm.roomName || null,
          },
        },
      });
      setEditingSlot(null);
      setMessage("Paralelo actualizado correctamente.");
    } catch (err: unknown) {
      const gqlMsg =
        (err as { graphQLErrors?: { message: string }[] })?.graphQLErrors?.[0]?.message ??
        (err instanceof Error ? err.message : null);
      if (gqlMsg?.includes("TUTOR_SCHEDULE_CONFLICT") || gqlMsg?.toLowerCase().includes("tutor")) {
        setEditSlotError(`⚠️ Conflicto de tutor: ${gqlMsg}`);
      } else if (gqlMsg?.includes("ROOM_SCHEDULE_CONFLICT") || gqlMsg?.toLowerCase().includes("sala")) {
        setEditSlotError(`⚠️ Conflicto de sala: ${gqlMsg}`);
      } else {
        setEditSlotError(gqlMsg ?? "No fue posible actualizar el paralelo.");
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
            studentRut: enrollmentForm.studentRut || null,
            studentEmail: enrollmentForm.studentEmail,
            studentCareer: enrollmentForm.studentCareer || null,
            studentPhone: enrollmentForm.studentPhone || null,
            source: "MANUAL",
          },
        },
      });
      setEnrollmentForm({ studentName: "", studentRut: "", studentEmail: "", studentCareer: "", studentPhone: "" });
      setEnrollmentFormOpen(false);
      await refetchEnrollments();
    } catch (err: unknown) {
      const gqlMsg =
        (err as { graphQLErrors?: { message: string }[] })?.graphQLErrors?.[0]?.message ??
        (err instanceof Error ? err.message : null);
      setEnrollmentError(gqlMsg ?? "No fue posible inscribir al estudiante.");
    }
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

  const totalCapacity = offering.slots.reduce((sum, slot) => sum + slot.maxCapacity, 0);
  const occupancy = totalCapacity > 0 ? Math.round((offering.enrollmentsCount / totalCapacity) * 100) : 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin/tutorias" className="inline-flex items-center gap-1.5 text-base font-semibold text-[#23415B] hover:text-[#1a3146] hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Volver a tutorías
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{offering.name}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Semestre {offering.semester} · {offering.status === "OPEN" ? "ABIERTA" : "CERRADA"}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => setSlotFormOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#23415B] px-4 text-sm font-medium text-white hover:bg-[#1a3146]"
          >
            <Plus className="h-4 w-4" />
            Agregar paralelo
          </button>
          <button
            onClick={() => setConfirmDeleteOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar tutoría
          </button>
        </div>
      </header>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Paralelos</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{offering.slotsCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cupos Totales</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalCapacity}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Inscritos</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{offering.enrollmentsCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ocupación</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{occupancy}%</p>
        </div>
      </div>

      {message && (
        <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm h-full">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Paralelos</h2>
            </div>
            {offering.slots.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">Agrega al menos un paralelo para publicar esta tutoría.</div>
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
                    {offering.slots.map((slot) => {
                      const isSelected = selectedSlotId === slot.id;
                      return (
                        <tr key={slot.id} className={`${isSelected ? "bg-sky-50 border-l-4 border-l-sky-500" : "hover:bg-slate-50/70 border-l-4 border-l-transparent"}`}>
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
                              className={`mr-2 rounded-md border px-2.5 py-1 text-xs font-medium ${isSelected ? "border-sky-500 bg-sky-100 text-sky-800" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}
                            >
                              {isSelected ? "Visualizando" : "Ver Inscritos"}
                            </button>
                            <button
                              onClick={() => openEditSlot(slot)}
                              className="mr-2 inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-col">
          <section className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm h-full">
            <h2 className="text-sm font-semibold text-slate-900 text-center mb-2">Asistencia Promedio (Simulada)</h2>
            <div className="flex-1 flex flex-col items-center justify-center min-h-50">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Asistieron", value: 85, color: "#10b981" },
                      { name: "Ausentes", value: 15, color: "#f43f5e" }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {[
                      { name: "Asistieron", value: 85, color: "#10b981" },
                      { name: "Ausentes", value: 15, color: "#f43f5e" }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value) => [value != null ? `${value}%` : "", undefined]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2 text-xs">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 block"></span>
                  <span className="text-slate-600 font-medium">85% Asistieron</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-rose-500 block"></span>
                  <span className="text-slate-600 font-medium">15% Ausentes</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Lista de Inscritos</h2>
            <p className="text-sm text-slate-500">
              {selectedSlot ? `${dayLabel[selectedSlot.dayOfWeek] ?? selectedSlot.dayOfWeek} · ${labelForBlock(selectedSlot.startTime, selectedSlot.endTime)}` : "Selecciona un paralelo en la tabla de arriba."}
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

        {!selectedSlot ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-slate-50/50">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <UserPlus className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-slate-600">No has seleccionado ningún paralelo</p>
            <p className="text-xs text-slate-500 mt-1">Haz clic en el botón &ldquo;Ver Inscritos&rdquo; de la tabla superior para visualizar la lista.</p>
          </div>
        ) : enrollments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-slate-50/50">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <UserPlus className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-slate-600">Este paralelo todavía no tiene inscritos</p>
            <p className="text-xs text-slate-500 mt-1">Comparte el link del formulario o inscribe a alguien manualmente.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Alumno</th>
                  <th className="px-4 py-3 text-left">Contacto</th>
                  <th className="px-4 py-3 text-left">Carrera</th>
                  <th className="px-4 py-3 text-left">Origen</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrollments.map((student, index) => (
                  <tr 
                    key={student.id} 
                    className="hover:bg-slate-50/70 animate-fade-in-row"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{student.studentName}</p>
                      <p className="text-xs text-slate-500">RUT: {student.studentRut || "No especificado"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900">{student.studentEmail}</p>
                      <p className="text-xs text-slate-500">{student.studentPhone || "Sin teléfono"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {student.studentCareer || "No especificada"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${student.source === "GOOGLE_FORM" ? "bg-emerald-100 text-emerald-700" : "bg-purple-100 text-purple-700"
                        }`}>
                        {student.source === "GOOGLE_FORM" ? "FORMULARIO" : "MANUAL"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemoveEnrollment(student.id)}
                        className="text-xs font-medium text-rose-600 hover:text-rose-800 focus:outline-none focus:underline"
                      >
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

      {slotFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form onSubmit={handleAddSlot} className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-slate-900">Agregar Paralelo</h2>
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
                <input type="number" min={1} placeholder="Ej: 30" value={slotForm.maxCapacity} onChange={(event) => setSlotForm((prev) => ({ ...prev, maxCapacity: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
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
              <input placeholder="RUT (Ej: 12.345.678-9)" value={enrollmentForm.studentRut} onChange={(event) => setEnrollmentForm((prev) => ({ ...prev, studentRut: event.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input required type="email" placeholder="correo@alumnos.ucn.cl" value={enrollmentForm.studentEmail} onChange={(event) => setEnrollmentForm((prev) => ({ ...prev, studentEmail: event.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input placeholder="Carrera" value={enrollmentForm.studentCareer} onChange={(event) => setEnrollmentForm((prev) => ({ ...prev, studentCareer: event.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
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
              Se eliminará la tutoría, sus paralelos e inscripciones. Esta acción no se puede deshacer.
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

      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form onSubmit={handleUpdateSlot} className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-slate-900">Editar Paralelo</h2>
            <p className="mt-1 text-xs text-slate-500">
              {dayLabel[editingSlot.dayOfWeek] ?? editingSlot.dayOfWeek} · {labelForBlock(editingSlot.startTime, editingSlot.endTime)} · {editingSlot.tutorName}
            </p>
            {editSlotError && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{editSlotError}</p>
              </div>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                Tutor
                <select
                  required
                  value={editSlotForm.tutorId}
                  onChange={(e) => setEditSlotForm((prev) => ({ ...prev, tutorId: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar tutor</option>
                  {tutors.map((t) => (
                    <option key={t.tutorId} value={t.tutorId}>{t.name} · {t.email}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Día
                <select
                  value={editSlotForm.dayOfWeek}
                  onChange={(e) => setEditSlotForm((prev) => ({ ...prev, dayOfWeek: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  {dayOptions.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Bloque
                <select
                  value={editSlotForm.block}
                  onChange={(e) => setEditSlotForm((prev) => ({ ...prev, block: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  {blockOptions.map((b) => (
                    <option key={b.label} value={b.label}>
                      Bloque {b.label} · {b.startTime}–{b.endTime}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Sala
                <input
                  value={editSlotForm.roomName}
                  onChange={(e) => setEditSlotForm((prev) => ({ ...prev, roomName: e.target.value }))}
                  placeholder="207"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                Cupo máximo
                <input
                  type="number"
                  min={editingSlot.enrolledCount > 0 ? editingSlot.enrolledCount : 1}
                  value={editSlotForm.maxCapacity}
                  onChange={(e) => setEditSlotForm((prev) => ({ ...prev, maxCapacity: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                {editingSlot.enrolledCount > 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    ⚠️ Hay {editingSlot.enrolledCount} estudiante(s) ya inscritos. El cupo mínimo es {editingSlot.enrolledCount}.
                  </p>
                )}
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setEditingSlot(null); setEditSlotError(null); }}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                disabled={updatingSlot}
                className="inline-flex items-center gap-2 rounded-md bg-[#23415B] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a3146] disabled:opacity-60"
              >
                {updatingSlot && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Guardar cambios
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
