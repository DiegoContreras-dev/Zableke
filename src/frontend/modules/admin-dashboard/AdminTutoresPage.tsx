"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  GraduationCap,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";

const TUTORES_QUERY = gql`
  query AdminTutoresAccess {
    usersAccess {
      id
      email
      firstName
      lastName
      phone
      career
      isActive
      roles
    }
    tutorStats {
      tutorId
      userId
      name
      email
      totalSlots
      totalStudents
      totalCapacity
      fillRate
      grade
    }
    careers {
      id
      name
      schoolName
    }
  }
`;

const ASSIGN_ROLE = gql`
  mutation AssignTutorRole($email: String!, $role: String!) {
    assignRoleToUser(email: $email, role: $role) {
      id
      email
      roles
    }
  }
`;

const REMOVE_ROLE = gql`
  mutation RemoveTutorRole($email: String!, $role: String!) {
    removeRoleFromUser(email: $email, role: $role) {
      id
      email
      roles
    }
  }
`;

const ADMIN_UPDATE_USER = gql`
  mutation AdminUpdateTutor($id: ID!, $input: UpdateUserAsAdminInput!) {
    adminUpdateUser(id: $id, input: $input) {
      id
      email
      firstName
      lastName
      phone
      roles
      isActive
    }
  }
`;

const DELETE_USER = gql`
  mutation DeleteTutorUser($id: ID!) {
    deleteUser(id: $id)
  }
`;

const CREATE_TUTOR = gql`
  mutation CreateTutor($input: CreateTutorInput!) {
    createTutor(input: $input) {
      id
      email
      firstName
      lastName
      roles
    }
  }
`;


interface UserAccessRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  career?: string | null;
  isActive: boolean;
  roles: string[];
}

interface CareerOption {
  id: string;
  name: string;
  schoolName: string;
}

function groupCareersBySchool(careers: CareerOption[]) {
  const groups = new Map<string, CareerOption[]>();
  for (const career of careers) {
    const school = career.schoolName || "Carreras";
    groups.set(school, [...(groups.get(school) ?? []), career]);
  }
  return [...groups.entries()].map(([schoolName, items]) => ({
    schoolName,
    careers: items,
  }));
}

interface TutorStat {
  tutorId: string;
  userId: string;
  name: string;
  email: string;
  totalSlots: number;
  totalStudents: number;
  totalCapacity: number;
  fillRate: number;
  grade: number;
}

function gradeLabel(grade: number) {
  if (grade === 0) return { text: "Sin datos", color: "text-slate-400", bg: "bg-slate-50", border: "border-slate-200" };
  if (grade >= 6) return { text: "Cumple", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" };
  if (grade >= 4) return { text: "Regular", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" };
  return { text: "Revisar", color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" };
}

function gradeBarColor(grade: number) {
  return grade >= 6 ? "bg-emerald-500" : grade >= 4 ? "bg-amber-400" : grade > 0 ? "bg-rose-500" : "bg-slate-200";
}

function GradeBar({ grade }: { grade: number }) {
  const pct = grade === 0 ? 0 : ((grade - 1) / 6) * 100;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-slate-100">
        <div className={`h-1.5 rounded-full ${gradeBarColor(grade)} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 tabular-nums">
        {grade === 0 ? "—" : grade.toFixed(1)}
      </span>
    </div>
  );
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function StatCard({ label, value, description, icon: Icon, accent }: {
  label: string; value: number | string; description?: string; icon: React.ElementType; accent: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1.5 text-3xl font-bold text-slate-900">{value}</p>
          {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
        </div>
        <div className={`rounded-lg p-2.5 ${accent}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    ADMIN: "bg-amber-100 text-amber-700 border-amber-200",
    TUTOR: "bg-[#23415B]/10 text-[#23415B] border-[#23415B]/20",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${map[role] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {role}
    </span>
  );
}

function ConfirmRevokeModal({ user, onConfirm, onCancel, loading }: {
  user: UserAccessRow; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-rose-100 p-2.5"><ShieldOff className="h-5 w-5 text-rose-600" /></div>
          <h2 className="text-base font-semibold text-slate-900">Revocar rol Tutor</h2>
          <button onClick={onCancel} className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          ¿Estás seguro de que quieres quitar el rol <strong>TUTOR</strong> a <strong>{user.firstName} {user.lastName}</strong> ({user.email})?
        </p>
        <p className="mt-1 text-xs text-slate-400">El usuario perderá acceso al panel de tutor de forma inmediata.</p>
        <div className="mt-5 flex gap-2">
          <button onClick={onCancel} disabled={loading} className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
          <button onClick={onConfirm} disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}Revocar
          </button>
        </div>
      </div>
    </div>
  );
}

function AddTutorModal({ onCreate, onClose, creating, careers }: {
  onCreate: (data: { firstName: string; lastName: string; rut: string; email: string; career: string; entryYear: number }) => void;
  onClose: () => void;
  creating: boolean;
  careers: CareerOption[];
}) {
  const currentYear = new Date().getFullYear();
  const careerGroups = useMemo(() => groupCareersBySchool(careers), [careers]);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    rut: "",
    email: "",
    career: "",
    entryYear: String(currentYear),
  });
  const [careerOpen, setCareerOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "Requerido";
    if (!form.lastName.trim()) e.lastName = "Requerido";
    if (!form.rut.trim()) e.rut = "Requerido";
    if (!form.email.trim()) e.email = "Requerido";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Correo inválido";
    if (careers.length === 0) e.career = "No hay carreras registradas";
    else if (!form.career.trim()) e.career = "Requerido";
    const year = parseInt(form.entryYear, 10);
    if (isNaN(year) || year < 1990 || year > currentYear) e.entryYear = `Debe ser entre 1990 y ${currentYear}`;

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onCreate({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      rut: form.rut.trim(),
      email: form.email.trim().toLowerCase(),
      career: form.career.trim(),
      entryYear: parseInt(form.entryYear, 10),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="rounded-full bg-[#23415B]/10 p-2"><UserPlus className="h-4 w-4 text-[#23415B]" /></div>
          <h2 className="text-base font-semibold text-slate-900">Agregar Tutor</h2>
          <button onClick={onClose} className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>

        {/* Form */}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5 space-y-4">
          {/* Nombre + Apellido */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Nombre <span className="text-rose-500">*</span></label>
              <input autoFocus type="text" placeholder="Ej. Víctor" value={form.firstName} onChange={(e) => set("firstName", e.target.value)}
                className={`w-full rounded-lg border py-2 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#23415B]/20 ${errors.firstName ? "border-rose-400" : "border-slate-200 focus:border-[#23415B]"}`} />
              {errors.firstName && <p className="mt-0.5 text-xs text-rose-500">{errors.firstName}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Apellido <span className="text-rose-500">*</span></label>
              <input type="text" placeholder="Ej. López" value={form.lastName} onChange={(e) => set("lastName", e.target.value)}
                className={`w-full rounded-lg border py-2 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#23415B]/20 ${errors.lastName ? "border-rose-400" : "border-slate-200 focus:border-[#23415B]"}`} />
              {errors.lastName && <p className="mt-0.5 text-xs text-rose-500">{errors.lastName}</p>}
            </div>
          </div>

          {/* RUT */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">RUT <span className="text-rose-500">*</span></label>
            <input type="text" placeholder="Ej. 12.345.678-9" value={form.rut} onChange={(e) => set("rut", e.target.value)}
              className={`w-full rounded-lg border py-2 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#23415B]/20 ${errors.rut ? "border-rose-400" : "border-slate-200 focus:border-[#23415B]"}`} />
            {errors.rut && <p className="mt-0.5 text-xs text-rose-500">{errors.rut}</p>}
          </div>

          {/* Correo */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Correo institucional <span className="text-rose-500">*</span></label>
            <input type="email" placeholder="Ej. nombre.apellido@alumnos.ucn.cl" value={form.email} onChange={(e) => set("email", e.target.value)}
              className={`w-full rounded-lg border py-2 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#23415B]/20 ${errors.email ? "border-rose-400" : "border-slate-200 focus:border-[#23415B]"}`} />
            {errors.email && <p className="mt-0.5 text-xs text-rose-500">{errors.email}</p>}
          </div>

          {/* Carrera */}
          <div className="relative">
            <label className="mb-1 block text-xs font-semibold text-slate-600">Carrera <span className="text-rose-500">*</span></label>
            <button type="button" onClick={() => setCareerOpen((v) => !v)}
              className={`flex w-full items-center justify-between rounded-lg border py-2.5 px-3 text-sm text-left focus:outline-none focus:ring-2 focus:ring-[#23415B]/20 ${errors.career ? "border-rose-400 text-slate-400" : form.career ? "border-slate-200 text-slate-800 focus:border-[#23415B]" : "border-slate-200 text-slate-400 focus:border-[#23415B]"}`}>
              <span className={form.career ? "text-slate-800 font-medium" : ""}>{form.career || "Seleccionar carrera…"}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${careerOpen ? "rotate-180" : ""}`} />
            </button>
            {errors.career && <p className="mt-0.5 text-xs text-rose-500">{errors.career}</p>}
            {careerOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                {careerGroups.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-slate-500">No hay carreras registradas.</p>
                ) : careerGroups.map((group) => (
                  <div key={group.schoolName}>
                    <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {group.schoolName}
                    </div>
                    {group.careers.map((career) => (
                      <button key={career.id} type="button"
                        onClick={() => { set("career", career.name); setCareerOpen(false); }}
                        className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-[#23415B]/5 ${form.career === career.name ? "bg-[#23415B]/10 text-[#23415B] font-semibold" : "text-slate-700"}`}>
                        <span className="h-2 w-2 rounded-full bg-[#23415B] shrink-0" />{career.name}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Año de ingreso */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Año de ingreso <span className="text-rose-500">*</span></label>
            <input type="number" min={1990} max={currentYear} placeholder={String(currentYear)} value={form.entryYear} onChange={(e) => set("entryYear", e.target.value)}
              className={`w-full rounded-lg border py-2 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#23415B]/20 ${errors.entryYear ? "border-rose-400" : "border-slate-200 focus:border-[#23415B]"}`} />
            {errors.entryYear && <p className="mt-0.5 text-xs text-rose-500">{errors.entryYear}</p>}
          </div>

          {/* Nota contraseña */}
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            La contraseña inicial será <strong>tutor1234</strong>. El tutor podrá cambiarla después.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
          <button onClick={onClose} disabled={creating}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={creating}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#23415B] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a3048] disabled:opacity-50">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            Crear Tutor
          </button>
        </div>
      </div>
    </div>
  );
}

function TutorDetailPanel({ stat, user, onClose, onRevoke, revoking, onDelete, deleting, onSaveEdit, saving, careers }: {
  stat: TutorStat; user?: UserAccessRow; onClose: () => void;
  onRevoke: () => void; revoking: boolean;
  onDelete: () => void; deleting: boolean;
  onSaveEdit: (data: { firstName: string; lastName: string; phone: string; career: string }) => Promise<void>;
  saving: boolean;
  careers: CareerOption[];
}) {
  const careerGroups = useMemo(() => groupCareersBySchool(careers), [careers]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", phone: "", career: "" });
  const [careerDropOpen, setCareerDropOpen] = useState(false);

  function openEdit() {
    setEditForm({
      firstName: user?.firstName ?? stat.name.split(" ")[0] ?? "",
      lastName: user?.lastName ?? stat.name.split(" ").slice(1).join(" ") ?? "",
      phone: user?.phone ?? "",
      career: user?.career ?? "",
    });
    setEditing(true);
    setConfirmingDelete(false);
  }

  async function handleSave() {
    await onSaveEdit(editForm);
    setEditing(false);
  }

  const lbl = gradeLabel(stat.grade);
  const pct = stat.totalCapacity > 0 ? Math.round(stat.fillRate * 100) : 0;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Detalle del tutor</h2>
          <div className="flex items-center gap-1">
            <button onClick={editing ? () => setEditing(false) : openEdit}
              className={`rounded-lg p-1.5 hover:bg-slate-100 ${editing ? "text-slate-500" : "text-[#23415B]"}`}
              title={editing ? "Cancelar edición" : "Editar datos"}>
              {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Avatar + nombre */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#23415B]/10 text-lg font-bold text-[#23415B]">
              {initials(stat.name)}
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">{stat.name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500"><Mail className="h-3 w-3" />{stat.email}</p>
              {user?.phone && (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500"><Phone className="h-3 w-3" />{user.phone}</p>
              )}
              {user?.career && (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500"><GraduationCap className="h-3 w-3" />{user.career}</p>
              )}
              {!user?.phone && !user?.career && !editing && (
                <button onClick={openEdit} className="mt-1 text-xs text-[#23415B] underline underline-offset-2 hover:text-[#1a3048]">
                  + Agregar teléfono y carrera
                </button>
              )}
              {user && (
                <span className={`mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${user.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {user.isActive ? "Activo" : "Inactivo"}
                </span>
              )}
            </div>
          </div>

          {/* Inline edit form */}
          {editing && (
            <div className="rounded-xl border border-[#23415B]/20 bg-[#23415B]/5 p-4 space-y-3">
              <p className="text-xs font-semibold text-[#23415B] uppercase tracking-wider">Editar datos del tutor</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-0.5 block text-xs font-medium text-slate-600">Nombre</label>
                  <input type="text" value={editForm.firstName} onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#23415B]/20 focus:border-[#23415B]" />
                </div>
                <div>
                  <label className="mb-0.5 block text-xs font-medium text-slate-600">Apellido</label>
                  <input type="text" value={editForm.lastName} onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#23415B]/20 focus:border-[#23415B]" />
                </div>
              </div>
              <div>
                <label className="mb-0.5 block text-xs font-medium text-slate-600">Teléfono</label>
                <input type="text" placeholder="Ej. +56 9 1234 5678" value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 py-1.5 px-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#23415B]/20 focus:border-[#23415B]" />
              </div>
              <div className="relative">
                <label className="mb-0.5 block text-xs font-medium text-slate-600">Carrera</label>
                <button type="button" onClick={() => setCareerDropOpen((v) => !v)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 py-1.5 px-2.5 text-xs text-left focus:outline-none focus:ring-2 focus:ring-[#23415B]/20 focus:border-[#23415B]">
                  <span className={editForm.career ? "text-slate-800" : "text-slate-400"}>{editForm.career || "Seleccionar carrera…"}</span>
                  <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${careerDropOpen ? "rotate-180" : ""}`} />
                </button>
                {careerDropOpen && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {careerGroups.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-slate-500">No hay carreras registradas.</p>
                    ) : careerGroups.map((group) => (
                      <div key={group.schoolName}>
                        <div className="bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          {group.schoolName}
                        </div>
                        {group.careers.map((career) => (
                          <button key={career.id} type="button"
                            onClick={() => { setEditForm((f) => ({ ...f, career: career.name })); setCareerDropOpen(false); }}
                            className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-[#23415B]/5 ${editForm.career === career.name ? "bg-[#23415B]/10 text-[#23415B] font-medium" : "text-slate-700"}`}>
                            {career.name}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditing(false)} disabled={saving}
                  className="flex-1 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#23415B] py-1.5 text-xs font-medium text-white hover:bg-[#1a3048] disabled:opacity-50">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Guardar
                </button>
              </div>
            </div>
          )}
          {/* Nota */}
          <div className={`rounded-xl border p-4 ${lbl.bg} ${lbl.border}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider ${lbl.color}`}>Estado de desempeño</p>
            <div className="mt-2 flex items-end justify-between">
              <div>
                <p className={`text-4xl font-bold ${lbl.color}`}>{stat.grade === 0 ? "—" : stat.grade.toFixed(1)}</p>
                <p className={`mt-0.5 text-xs ${lbl.color} opacity-70`}>Escala 1–7</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${lbl.bg} ${lbl.color} ${lbl.border}`}>{lbl.text}</span>
            </div>
            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-white/60">
                <div className={`h-2 rounded-full ${gradeBarColor(stat.grade)} transition-all`} style={{ width: stat.grade === 0 ? "0%" : `${((stat.grade - 1) / 6) * 100}%` }} />
              </div>
              <div className={`mt-1 flex justify-between text-xs ${lbl.color} opacity-50`}>
                <span>1.0</span><span>4.0</span><span>7.0</span>
              </div>
            </div>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[["Slots asignados", stat.totalSlots], ["Estudiantes", stat.totalStudents], ["Capacidad total", stat.totalCapacity], ["Ocupación", `${pct}%`]].map(([label, value]) => (
              <div key={label as string} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="mt-0.5 text-xl font-bold text-slate-800">{value}</p>
              </div>
            ))}
          </div>
          {/* Barra ocupación */}
          {stat.totalCapacity > 0 && (
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
                <span>Ocupación del slot</span>
                <span className="font-semibold">{stat.totalStudents}/{stat.totalCapacity} estudiantes</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100">
                <div className={`h-2.5 rounded-full ${gradeBarColor(stat.grade)} transition-all`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
          {/* Leyenda */}
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500 space-y-1.5">
            <p className="font-semibold text-slate-600 mb-1">Escala de evaluación</p>
            {[
              { range: "≥ 83% ocupación", grade: "6.0–7.0", label: "Cumple", color: "bg-emerald-500" },
              { range: "50–83% ocupación", grade: "4.0–5.9", label: "Regular", color: "bg-amber-400" },
              { range: "< 50% ocupación", grade: "1.0–3.9", label: "Revisar", color: "bg-rose-500" },
            ].map((r) => (
              <div key={r.label} className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${r.color}`} />
                <span>{r.grade} — {r.label}</span>
                <span className="ml-auto text-slate-400">{r.range}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-slate-100 p-4 space-y-2">
          <button onClick={onRevoke} disabled={revoking || deleting}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50">
            {revoking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
            Revocar rol Tutor
          </button>
          {!confirmingDelete ? (
            <button onClick={() => setConfirmingDelete(true)} disabled={revoking || deleting}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-300 bg-rose-100 px-4 py-2.5 text-sm font-medium text-rose-800 hover:bg-rose-200 disabled:opacity-50">
              <Trash2 className="h-4 w-4" />
              Eliminar tutor
            </button>
          ) : (
            <div className="rounded-lg border border-rose-300 bg-rose-50 p-3">
              <p className="text-xs font-semibold text-rose-800 mb-2">¿Eliminar permanentemente a {stat.name}?</p>
              <p className="text-xs text-rose-600 mb-3">Esta acción no se puede deshacer. Se eliminará el usuario y todos sus datos.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmingDelete(false)} disabled={deleting}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={onDelete} disabled={deleting}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50">
                  {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  Confirmar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function AdminTutoresPage() {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"ALL" | "TUTOR" | "NO_TUTOR">("ALL");
  const [tab, setTab] = useState<"gestion" | "desempeno">("desempeno");
  const [confirmRevoke, setConfirmRevoke] = useState<UserAccessRow | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStat, setSelectedStat] = useState<TutorStat | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const { data, loading, error } = useQuery<{ usersAccess: UserAccessRow[]; tutorStats: TutorStat[]; careers: CareerOption[] }>(TUTORES_QUERY, { fetchPolicy: "cache-and-network" });
  const [assignRole, { loading: assigning }] = useMutation(ASSIGN_ROLE, { refetchQueries: ["AdminTutoresAccess"] });
  const [removeRole, { loading: revoking }] = useMutation(REMOVE_ROLE, { refetchQueries: ["AdminTutoresAccess"] });
  const [createTutor, { loading: creating }] = useMutation(CREATE_TUTOR, { refetchQueries: ["AdminTutoresAccess"] });
  const [deleteUserMutation, { loading: deleting }] = useMutation(DELETE_USER, { refetchQueries: ["AdminTutoresAccess"] });
  const [adminUpdateUserMutation, { loading: saving }] = useMutation(ADMIN_UPDATE_USER, { refetchQueries: ["AdminTutoresAccess"] });

  const users = useMemo(() => data?.usersAccess ?? [], [data?.usersAccess]);
  const stats = useMemo(() => data?.tutorStats ?? [], [data?.tutorStats]);
  const careers = useMemo(() => data?.careers ?? [], [data?.careers]);
  const statsMap = useMemo(() => new Map(stats.map((s) => [s.email, s])), [stats]);
  const usersMap = useMemo(() => new Map(users.map((u) => [u.email, u])), [users]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesSearch = !needle || u.email.toLowerCase().includes(needle) || `${u.firstName} ${u.lastName}`.toLowerCase().includes(needle);
      const isTutor = u.roles.includes("TUTOR");
      const matchesRole = filterRole === "ALL" || (filterRole === "TUTOR" && isTutor) || (filterRole === "NO_TUTOR" && !isTutor);
      return matchesSearch && matchesRole;
    });
  }, [users, search, filterRole]);

  const tutors = users.filter((u) => u.roles.includes("TUTOR"));
  const totalActivos = users.filter((u) => u.isActive).length;
  const cumpleCount = stats.filter((s) => s.grade >= 6).length;
  const revisarCount = stats.filter((s) => s.grade > 0 && s.grade < 4).length;

  const showToast = (type: "ok" | "err", msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

  const handleAssign = async (user: UserAccessRow) => {
    try {
      await assignRole({ variables: { email: user.email, role: "TUTOR" } });
      showToast("ok", `Rol TUTOR asignado a ${user.firstName} ${user.lastName}.`);
    } catch { showToast("err", "No se pudo asignar el rol."); }
  };

  const handleCreate = async (input: { firstName: string; lastName: string; rut: string; email: string; career: string; entryYear: number }) => {
    try {
      await createTutor({ variables: { input } });
      showToast("ok", `Tutor ${input.firstName} ${input.lastName} creado exitosamente.`);
      setShowAddModal(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "No se pudo crear el tutor.";
      showToast("err", msg);
    }
  };

  const handleRevoke = async (email?: string) => {
    const target = email ? usersMap.get(email) : confirmRevoke;
    if (!target) return;
    try {
      await removeRole({ variables: { email: target.email, role: "TUTOR" } });
      showToast("ok", `Rol TUTOR revocado a ${target.firstName} ${target.lastName}.`);
      setSelectedStat(null);
    } catch { showToast("err", "No se pudo revocar el rol."); }
    finally { setConfirmRevoke(null); }
  };

  const handleDelete = async (userId: string) => {
    try {
      await deleteUserMutation({ variables: { id: userId } });
      showToast("ok", "Tutor eliminado correctamente.");
      setSelectedStat(null);
    } catch { showToast("err", "No se pudo eliminar el tutor."); }
  };

  const handleSaveEdit = async (userId: string, data: { firstName: string; lastName: string; phone: string; career: string }) => {
    try {
      await adminUpdateUserMutation({ variables: { id: userId, input: {
        firstName: data.firstName.trim() || undefined,
        lastName: data.lastName.trim() || undefined,
        phone: data.phone.trim() || null,
        career: data.career.trim() || null,
      } } });
      showToast("ok", "Datos actualizados correctamente.");
    } catch { showToast("err", "No se pudieron guardar los cambios."); }
  };

  return (
    <>
      {confirmRevoke && <ConfirmRevokeModal user={confirmRevoke} onConfirm={() => handleRevoke()} onCancel={() => setConfirmRevoke(null)} loading={revoking} />}
      {showAddModal && <AddTutorModal onCreate={handleCreate} onClose={() => setShowAddModal(false)} creating={creating} careers={careers} />}
      {selectedStat && <TutorDetailPanel stat={selectedStat} user={usersMap.get(selectedStat.email)} onClose={() => setSelectedStat(null)} onRevoke={() => handleRevoke(selectedStat.email)} revoking={revoking} onDelete={() => handleDelete(selectedStat.userId)} deleting={deleting} onSaveEdit={(data) => handleSaveEdit(selectedStat.userId, data)} saving={saving} careers={careers} />}

      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg ${toast.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {toast.type === "ok" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />}
          {toast.msg}
        </div>
      )}

      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestión de Tutores</h1>
            <p className="mt-1 text-sm text-slate-500">Asigna roles y revisa el desempeño de los tutores del sistema.</p>
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#23415B] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1a3048] transition-colors">
            <UserPlus className="h-4 w-4" />Agregar Tutor
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />No fue posible cargar la información.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Tutores activos" value={loading ? "—" : tutors.length} description="Con rol TUTOR asignado" icon={UserCheck} accent="bg-[#23415B]" />
          <StatCard label="Usuarios totales" value={loading ? "—" : users.length} description={`${totalActivos} activos`} icon={Users} accent="bg-emerald-600" />
          <StatCard label="Cumplen (6-7)" value={loading ? "—" : cumpleCount} description="Tasa de ocupación alta" icon={CheckCircle2} accent="bg-emerald-500" />
          <StatCard label="Revisar (<4)" value={loading ? "—" : revisarCount} description="Requieren seguimiento" icon={TrendingUp} accent="bg-rose-500" />
        </div>

        <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 w-fit">
          {([["desempeno", "Desempeño"], ["gestion", "Gestión de roles"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "desempeno" && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500">
              <span className="font-semibold text-slate-600">Escala 1–7 basada en ocupación de slots:</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> 6–7 Cumple</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> 4–5 Regular</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> 1–3 Revisar</span>
              <span className="ml-auto italic text-slate-400">Haz clic en un tutor para ver detalle</span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : stats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BookOpen className="mb-3 h-10 w-10 text-slate-200" />
                <p className="text-sm text-slate-500">No hay tutores con slots asignados aún.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tutor</th>
                    <th className="hidden px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 sm:table-cell">Slots</th>
                    <th className="hidden px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 sm:table-cell">Estudiantes</th>
                    <th className="hidden px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 md:table-cell">Ocupación</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Nota</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Estado</th>
                    <th className="px-2 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.map((s) => {
                    const lbl = gradeLabel(s.grade);
                    return (
                      <tr key={s.tutorId} onClick={() => setSelectedStat(s)} className="cursor-pointer transition-colors hover:bg-slate-50">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#23415B]/10 text-xs font-bold text-[#23415B]">
                              {initials(s.name)}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{s.name}</p>
                              <p className="text-xs text-slate-400">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-5 py-3.5 text-center text-slate-600 sm:table-cell">{s.totalSlots}</td>
                        <td className="hidden px-5 py-3.5 text-center text-slate-600 sm:table-cell">
                          {s.totalStudents}<span className="text-slate-300">/{s.totalCapacity}</span>
                        </td>
                        <td className="hidden px-5 py-3.5 text-center md:table-cell">
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-1.5 w-20 rounded-full bg-slate-100">
                              <div className={`h-1.5 rounded-full ${gradeBarColor(s.grade)}`} style={{ width: `${Math.round(s.fillRate * 100)}%` }} />
                            </div>
                            <span className="text-xs text-slate-500">{Math.round(s.fillRate * 100)}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5"><GradeBar grade={s.grade} /></td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${lbl.bg} ${lbl.color} ${lbl.border}`}>{lbl.text}</span>
                        </td>
                        <td className="px-2 py-3.5 text-slate-300"><ChevronRight className="h-4 w-4" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "gestion" && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Buscar por nombre o correo…" value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#23415B] focus:outline-none focus:ring-2 focus:ring-[#23415B]/20" />
              </div>
              <div className="flex gap-2">
                {(["ALL", "TUTOR", "NO_TUTOR"] as const).map((f) => (
                  <button key={f} onClick={() => setFilterRole(f)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${filterRole === f ? "border-[#23415B] bg-[#23415B] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-[#23415B]/40"}`}>
                    {f === "ALL" ? "Todos" : f === "TUTOR" ? "Solo tutores" : "Sin rol tutor"}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {loading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Users className="mb-3 h-10 w-10 text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">No se encontraron usuarios</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Usuario</th>
                      <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 sm:table-cell">Correo</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Roles</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Estado</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((user) => {
                      const isTutor = user.roles.includes("TUTOR");
                      const isAdmin = user.roles.includes("ADMIN");
                      const stat = statsMap.get(user.email);
                      return (
                        <tr key={user.id} className="transition-colors hover:bg-slate-50/70">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#23415B]/10 text-xs font-bold text-[#23415B]">
                                {(user.firstName[0] ?? "?").toUpperCase()}{(user.lastName[0] ?? "").toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-slate-800">{user.firstName} {user.lastName}</p>
                                {stat && isTutor && <div className="mt-0.5"><GradeBar grade={stat.grade} /></div>}
                              </div>
                            </div>
                          </td>
                          <td className="hidden px-5 py-3.5 text-slate-600 sm:table-cell">{user.email}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              {user.roles.length === 0 ? <span className="text-xs text-slate-400">Sin rol</span> : user.roles.map((r) => <RoleBadge key={r} role={r} />)}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${user.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                              {user.isActive ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {isAdmin && !isTutor ? (
                              <span className="text-xs text-slate-400">Admin</span>
                            ) : isTutor ? (
                              <button onClick={() => setConfirmRevoke(user)} disabled={revoking}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50">
                                <ShieldOff className="h-3.5 w-3.5" />Quitar Tutor
                              </button>
                            ) : (
                              <button onClick={() => handleAssign(user)} disabled={assigning}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#23415B]/20 bg-[#23415B]/5 px-3 py-1.5 text-xs font-medium text-[#23415B] hover:bg-[#23415B]/10 disabled:opacity-50">
                                {assigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}Hacer Tutor
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {!loading && filtered.length > 0 && (
                <div className="border-t border-slate-100 bg-slate-50 px-5 py-2.5 text-xs text-slate-400">
                  Mostrando {filtered.length} de {users.length} usuario{users.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
