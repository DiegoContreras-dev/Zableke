"use client";

import { Users } from "lucide-react";

export function AdminTutoresPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Gestión de Tutores</h1>
        <p className="mt-1 text-sm text-slate-500">
          Asigna y revoca roles a usuarios del sistema.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
        <Users className="mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">Página en construcción</p>
        <p className="mt-1 text-xs text-slate-400">
          La gestión de roles de tutores estará disponible pronto.
        </p>
      </div>
    </div>
  );
}
