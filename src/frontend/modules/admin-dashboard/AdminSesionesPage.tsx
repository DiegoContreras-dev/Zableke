"use client";

import { CalendarDays } from "lucide-react";

export function AdminSesionesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Gestión de Sesiones</h1>
        <p className="mt-1 text-sm text-slate-500">
          Crea y administra bloques de tutoría programados.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
        <CalendarDays className="mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">Página en construcción</p>
        <p className="mt-1 text-xs text-slate-400">
          La gestión de sesiones específicas estará disponible pronto.
        </p>
      </div>
    </div>
  );
}
