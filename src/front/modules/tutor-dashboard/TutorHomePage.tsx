"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";

import {
  todaySessions,
  tutorMeta,
} from "./data";
import { DashboardPanel } from "./components/DashboardPanel";
import { SessionRow } from "./components/SessionRow";

type HomeMode = "default" | "loading" | "empty" | "error";

const homeModes: Array<{ mode: HomeMode; label: string }> = [
  { mode: "default", label: "Normal" },
  { mode: "loading", label: "Carga" },
  { mode: "empty", label: "Vacio" },
  { mode: "error", label: "Error" },
];

export function TutorHomePage() {
  const [mode, setMode] = useState<HomeMode>("default");

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat("es-CL", {
      dateStyle: "full",
    }).format(new Date());
  }, []);

  const sessions = mode === "empty" ? [] : todaySessions;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 lg:gap-4.5">
      <header className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm lg:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">{formattedDate}</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900 lg:text-2xl">
              {tutorMeta.greeting}
            </h1>
            <p className="text-sm text-slate-600">
              Rol activo: <span className="font-semibold text-[#23415B]">{tutorMeta.role}</span>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-sm font-medium">
              💡 ¡No olvides subir tu material a Drive!
            </span>
            <a
              href="https://drive.google.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-[#23415B] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1a3146] shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
              Subir a Drive
            </a>
            
            <div className="hidden lg:flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-1">
            {homeModes.map((item) => {
              const isSelected = item.mode === mode;

              return (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => setMode(item.mode)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                    isSelected
                      ? "bg-[#23415B] text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-[#23415B]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

        {mode === "error" ? (
          <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              No fue posible recuperar tus bloques de hoy. Revisa la conexion y vuelve a
              intentar.
            </p>
          </div>
        ) : null}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 flex-1 mt-4">
        {/* Columna Operativa (Izquierda) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <DashboardPanel
            title="Tus tutorías"
            subtitle="Accede rápidamente al registro de asistencia"      
            className="flex-shrink-0 border-t-0 rounded-t-none border-b-0 shadow-none lg:shadow-sm lg:rounded-lg lg:border-t lg:border-b"
          >
            <ul className="space-y-2.5 p-3">
              {mode === "loading"
                ? Array.from({ length: 2 }).map((_, index) => (
                    <li
                      key={`sk-session-${index}`}
                      className="h-[80px] animate-pulse rounded-lg border border-slate-200 bg-slate-100"
                    />
                  ))
                : null}

              {mode !== "loading" && sessions.length === 0 ? (
                <li className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
                  No tienes sesiones programadas para hoy.
                </li>
              ) : null}

              {mode !== "loading" && sessions.length > 0
                ? sessions.slice(0, 2).map((session) => (
                    <SessionRow key={session.id} session={session} />
                  ))
                : null}
            </ul>
          </DashboardPanel>

          {/* Alertas */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="font-medium text-amber-900 mb-1">Alertas pendientes</h3>
            <p className="text-sm text-amber-700">Tienes 1 registro de asistencia atrasado de la semana pasada.</p>
            <button className="mt-2.5 text-sm font-medium text-amber-800 hover:text-amber-900 underline underline-offset-2">
              Ir a completarlo ahora
            </button>
          </div>
        </div>

        {/* Columna de Contexto y Soporte (Derecha) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <DashboardPanel title="Impacto Semestral" className="flex-shrink-0">
            <div className="p-4 grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-slate-800">12</span>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Sesiones Realizadas</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-slate-800">85%</span>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Asistencia Promedio</span>
              </div>
              
            </div>
          </DashboardPanel>

          <DashboardPanel title="Canales de Soporte" className="flex-shrink-0">
            <div className="p-4 flex flex-col gap-3">
               <a 
                href="#" 
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50 transition-colors"
               >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-800">Tutores y Tutoras integrales UCN</span>
                  <span className="text-xs text-slate-500">Avisos y comunidad</span>
                </div>
              </a>

              <a 
                href="#" 
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-800">Éxito Académico</span>
                  <span className="text-xs text-slate-500">Dudas administrativas</span>
                </div>
              </a>
            </div>
          </DashboardPanel>
        </div>
      </div>
    </div>
  );
}

