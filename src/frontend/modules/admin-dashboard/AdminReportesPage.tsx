"use client";

import { BarChart3 } from "lucide-react";

export function AdminReportesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
        <p className="mt-1 text-sm text-slate-500">
          Estadísticas globales de asistencia y actividad del sistema.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
        <BarChart3 className="mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">Página en construcción</p>
        <p className="mt-1 text-xs text-slate-400">
          Los reportes de asistencia estarán disponibles pronto.
        </p>
      </div>
    </div>
  );
}
