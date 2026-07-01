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
  ArrowRight,
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
  borderColor,
}: {
  label: string;
  value: number | string;
  description?: string;
  icon: React.ElementType;
  accent: string;
  borderColor: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm border-t-4 ${borderColor}`}>
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
      className="group flex flex-col items-start rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-[#23415B]/30 hover:shadow-md hover:bg-slate-50"
    >
      <div className="flex w-full items-start justify-between">
        <div className={`rounded-lg p-2.5 ${accent} shrink-0`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <ArrowRight className="h-5 w-5 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-[#23415B]" />
      </div>
      <div className="mt-3">
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
  const totalSinAsignar = users.filter(
    (u) => !u.roles.includes("ADMIN") && !u.roles.includes("TUTOR"),
  ).length;

  const totalSesiones = schedules.length;
  const sesionesActivas = schedules.filter((s) => s.status === "ACTIVE").length;

  const parseDate = (dStr: string) => {
    const asNum = Number(dStr);
    return new Date(isNaN(asNum) ? dStr : asNum);
  };

  const sesionesHoy = schedules.filter((s) => {
    const d = parseDate(s.startsAt);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  }).length;

  // Calcular sesiones de la semana actual dinámicamente
  const startOfWeek = new Date(today);
  const dayOfWeek = startOfWeek.getDay() === 0 ? 7 : startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const weekCounts = { Lun: 0, Mar: 0, Mié: 0, Jue: 0, Vie: 0, Sáb: 0 };
  const getDayName = (d: Date) => ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][d.getDay()];

  schedules.forEach((s) => {
    const d = parseDate(s.startsAt);
    if (d >= startOfWeek && d <= endOfWeek) {
      const name = getDayName(d);
      if (name in weekCounts) {
        weekCounts[name as keyof typeof weekCounts]++;
      }
    }
  });

  const totalSesionesSemana = Object.values(weekCounts).reduce((sum, count) => sum + count, 0);

  const roleSections = [
    {
      key: "ADMIN" as const,
      label: "Administradores",
      count: totalAdmins,
      accent: "bg-emerald-500",
      hoverStyle: "hover:bg-emerald-50/80 hover:shadow-[inset_0_0_0_1px_rgba(16,185,129,0.35),0_0_28px_rgba(16,185,129,0.22)]",
    },
    {
      key: "TUTOR" as const,
      label: "Tutores",
      count: totalTutores,
      accent: "bg-blue-500",
      hoverStyle: "hover:bg-blue-50/80 hover:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.35),0_0_28px_rgba(59,130,246,0.22)]",
    },
  ];

  return (
    <>
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
          borderColor="border-t-[#23415B]"
        />
        <StatCard
          label="Registros de asistencia"
          value={loading ? "—" : totalSesiones}
          description={`${totalSesionesSemana} esta semana · ${sesionesActivas} activos`}
          icon={CalendarDays}
          accent="bg-emerald-600"
          borderColor="border-t-emerald-600"
        />
        <StatCard
          label="Sesiones hoy"
          value={loading ? "—" : sesionesHoy}
          description="Programadas para hoy"
          icon={ClipboardList}
          accent="bg-sky-600"
          borderColor="border-t-sky-600"
        />
        <StatCard
          label="Usuarios registrados"
          value={loading ? "—" : totalActivos}
          description={`${totalAdmins} administrador(es)`}
          icon={TrendingUp}
          accent="bg-amber-500"
          borderColor="border-t-amber-500"
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
            title="Monitoreo"
            description="Registro de acciones del sistema"
            accent="bg-slate-500"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Usuarios del sistema</h2>
            <p className="text-xs text-slate-500">
              {totalAdmins} administradores · {totalTutores} tutores · {totalSinAsignar} sin asignar
            </p>
          </div>
          <Link
            href="/admin/tutores"
            className="group inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-900"
          >
            Ver registro completo
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
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
          <div>
            <div className="grid grid-cols-1 divide-y-2 divide-slate-300/90 sm:grid-cols-2 sm:divide-x-2 sm:divide-y-0">
              {roleSections.map((section) => (
                <Link
                  key={section.key}
                  href="/admin/tutores"
                  className={`group flex min-h-36 w-full flex-col items-center justify-center gap-3 px-5 py-6 text-center transition-all duration-200 ${section.hoverStyle}`}
                >
                  <span className={`h-3 w-3 rounded-full ${section.accent}`} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {section.label}
                    </p>
                    <p className="mt-2 text-4xl font-bold leading-none text-slate-900">
                      {section.count}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
                    Ver registro
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
