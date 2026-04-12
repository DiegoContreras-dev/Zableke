import Link from "next/link";

import { type TodaySession } from "../data";

type SessionRowProps = {
  session: TodaySession;
};

const statusStyles: Record<TodaySession["status"], { label: string; className: string }> = {
  pendiente: {
    label: "Próxima",
    className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  },
  "en-curso": {
    label: "En curso",
    className: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",
  },
  cerrada: {
    label: "Cerrada",
    className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  },
};

export function SessionRow({ session }: SessionRowProps) {
  const status = statusStyles[session.status];

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm transition-all duration-150 hover:border-[#23415B]/30 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">{session.course}</p>
          <p className="text-sm text-slate-600">
            {session.slot} · {session.section} · {session.room} · {session.modality}
          </p>
        </div>
        <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${status.className}`}>
          {status.label}
        </span>
      </div>

      <div className="mt-2.5 flex items-center justify-end h-[36px]">
        {session.status !== "pendiente" ? (
          <Link
            href={`/tutor/asistencia?session=${session.id}`}
            className="inline-flex h-full items-center justify-center rounded-md bg-[#23415B] px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#1a3146] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#23415B]"
          >
            Rellenar asistencia
          </Link>
        ) : (
          <span className="text-xs font-medium text-slate-500 italic">Habilitado al momento de la sesión</span>
        )}
      </div>
    </li>
  );
}
