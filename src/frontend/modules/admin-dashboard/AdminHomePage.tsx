"use client";

import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  ScrollText,
  Shield,
  Users,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const ADMIN_OVERVIEW = gql`
  query AdminOverview {
    usersAccess {
      id
      email
      isActive
      roles
    }
    allSchedules {
      id
      status
      startsAt
    }
  }
`;

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface UserAccess {
  id: string;
  email: string;
  isActive: boolean;
  roles: string[];
}

interface Schedule {
  id: string;
  status: string;
  startsAt: string;
}

// ─── Componentes locales ─────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  description,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  description?: string;
  icon: React.ElementType;
  accent: string;
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

function QuickActionCard({
  href,
  icon: Icon,
  title,
  description,
  accent,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-[#23415B]/30 hover:shadow-md"
    >
      <div className={`rounded-lg p-2.5 ${accent} shrink-0`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900 group-hover:text-[#23415B]">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
    </Link>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function AdminHomePage() {
  const today = new Date();
  const dateLabel = today.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const { data, loading, error } = useQuery<{
    usersAccess: UserAccess[];
    allSchedules: Schedule[];
  }>(ADMIN_OVERVIEW, { fetchPolicy: "cache-and-network" });

  const users = data?.usersAccess ?? [];
  const schedules = data?.allSchedules ?? [];

  const totalTutores = users.filter((u) => u.roles.includes("TUTOR")).length;
  const totalAdmins = users.filter((u) => u.roles.includes("ADMIN")).length;
  const totalActivos = users.filter((u) => u.isActive).length;

  const totalSesiones = schedules.length;
  const sesionesActivas = schedules.filter((s) => s.status === "ACTIVE").length;
  const sesionesHoy = schedules.filter((s) => {
    const d = new Date(s.startsAt);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  }).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500 capitalize">{dateLabel}</p>
          <h1 className="text-2xl font-bold text-slate-900">Panel de Administración</h1>
          <div className="mt-1 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-medium text-amber-600">Acceso de coordinación UCN</span>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p>No fue posible cargar la información. Revisa la conexión e intenta de nuevo.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tutores activos"
          value={loading ? "—" : totalTutores}
          description="Con rol TUTOR asignado"
          icon={Users}
          accent="bg-[#23415B]"
        />
        <StatCard
          label="Sesiones totales"
          value={loading ? "—" : totalSesiones}
          description={`${sesionesActivas} activas`}
          icon={CalendarDays}
          accent="bg-emerald-600"
        />
        <StatCard
          label="Sesiones hoy"
          value={loading ? "—" : sesionesHoy}
          description="Programadas para hoy"
          icon={ClipboardList}
          accent="bg-sky-600"
        />
        <StatCard
          label="Usuarios registrados"
          value={loading ? "—" : totalActivos}
          description={`${totalAdmins} administrador(es)`}
          icon={TrendingUp}
          accent="bg-amber-500"
        />
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Acciones rápidas
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            href="/admin/tutores"
            icon={Users}
            title="Gestionar tutores"
            description="Asignar y revocar roles a usuarios"
            accent="bg-[#23415B]"
          />
          <QuickActionCard
            href="/admin/sesiones"
            icon={CalendarDays}
            title="Gestionar sesiones"
            description="Crear y administrar bloques de tutoría"
            accent="bg-emerald-600"
          />
          <QuickActionCard
            href="/admin/reportes"
            icon={BarChart3}
            title="Ver reportes"
            description="Estadísticas globales de asistencia"
            accent="bg-sky-600"
          />
          <QuickActionCard
            href="/admin/auditoria"
            icon={ScrollText}
            title="Auditoría"
            description="Registro de all acciones del sistema"
            accent="bg-slate-500"
          />
        </div>
      </div>

      {/* Users table preview */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Usuarios del sistema</h2>
          <Link
            href="/admin/tutores"
            className="text-xs font-medium text-[#23415B] hover:underline"
          >
            Ver todos →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No hay usuarios registrados</p>
            <p className="mt-1 text-xs text-slate-400">
              Los usuarios se crean al iniciar sesión por primera vez
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Correo
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Roles
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.slice(0, 8).map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-900">{user.email}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((r) => (
                          <span
                            key={r}
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              r === "ADMIN"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-[#23415B]/10 text-[#23415B]"
                            }`}
                          >
                            {r}
                          </span>
                        ))}
                        {user.roles.length === 0 && (
                          <span className="text-xs text-slate-400">Sin rol</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          user.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {user.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
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
