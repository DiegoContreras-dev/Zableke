"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, FolderCog, HardDrive, Loader2, RefreshCw, Unplug } from "lucide-react";
import { GoogleDriveFolderPicker } from "./components/GoogleDriveFolderPicker";
import { SemesterSelect } from "./components/SemesterSelect";

type DriveSettings = {
  connected: boolean;
  accountEmail: string | null;
  sharedDriveId: string | null;
  rootFolderId: string | null;
  rootFolderName: string | null;
  status: string;
  lastError: string | null;
  semester: string;
  months: number[];
};

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function AdminIntegracionesPage() {
  const [settings, setSettings] = useState<DriveSettings | null>(null);
  const [rootFolderId, setRootFolderId] = useState("");
  const [rootFolderName, setRootFolderName] = useState("");
  const [semester, setSemester] = useState("");
  const [months, setMonths] = useState<number[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    const response = await fetch("/api/admin/drive/settings", { cache: "no-store" });
    if (!response.ok) throw new Error("No fue posible cargar la integración");
    const value = await response.json() as DriveSettings;
    setSettings(value);
    setRootFolderId(value.rootFolderId ?? "");
    setRootFolderName(value.rootFolderName ?? "");
    setSemester(value.semester);
    setMonths(value.months);
  };

  useEffect(() => {
    load().catch((error) => setMessage({ ok: false, text: error.message }));
  }, []);

  const save = async () => {
    setBusy("save");
    setMessage(null);
    try {
      const response = await fetch("/api/admin/drive/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rootFolderId, semester, months }),
      });
      const result = await response.json() as DriveSettings & { error?: string };
      if (!response.ok) throw new Error(result.error || "No fue posible guardar");
      setSettings(result);
      setMessage({ ok: true, text: "Configuración de Drive guardada." });
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    setBusy("test");
    setMessage(null);
    try {
      const response = await fetch("/api/admin/drive/test", { method: "POST" });
      const result = await response.json() as { accountEmail?: string; rootFolderName?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "La prueba falló");
      setMessage({
        ok: true,
        text: `Conexión correcta con ${result.accountEmail}${result.rootFolderName ? ` · ${result.rootFolderName}` : ""}.`,
      });
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("¿Desconectar la cuenta Google? Las carpetas existentes no se eliminarán.")) return;
    setBusy("disconnect");
    await fetch("/api/admin/drive/settings", { method: "DELETE" });
    await load();
    setBusy(null);
    setMessage({ ok: true, text: "Cuenta desconectada. Las carpetas existentes se conservaron." });
  };

  const toggleMonth = (month: number) => {
    setMonths((current) =>
      current.includes(month)
        ? current.filter((value) => value !== month)
        : [...current, month].sort((a, b) => a - b),
    );
  };

  if (!settings) {
    return <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Integraciones</h1>
        <p className="mt-1 text-sm text-slate-500">Configura la cuenta institucional y la estructura de Google Drive.</p>
      </header>

      {message && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${message.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {message.text}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-3 text-blue-600"><HardDrive className="h-6 w-6" /></div>
            <div>
              <h2 className="font-semibold text-slate-900">Cuenta Google Drive</h2>
              <p className="text-sm text-slate-500">
                {settings.connected ? settings.accountEmail : "No hay una cuenta conectada"}
              </p>
            </div>
          </div>
          {settings.connected ? (
            <div className="flex gap-2">
              <a href="/api/admin/drive/connect" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <RefreshCw className="h-4 w-4" /> Cambiar cuenta
              </a>
              <button onClick={disconnect} disabled={busy === "disconnect"} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50">
                <Unplug className="h-4 w-4" /> Desconectar
              </button>
            </div>
          ) : (
            <a href="/api/admin/drive/connect" className="inline-flex items-center gap-2 rounded-lg bg-[#1B3A52] px-4 py-2 text-sm font-medium text-white hover:bg-[#142c3f]">
              <ExternalLink className="h-4 w-4" /> Conectar cuenta Google
            </a>
          )}
        </div>
      </section>

      <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${!settings.connected ? "pointer-events-none opacity-50" : ""}`}>
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600"><FolderCog className="h-5 w-5" /></div>
          <div>
            <h2 className="font-semibold text-slate-900">Estructura de carpetas</h2>
            <p className="text-sm text-slate-500">Elige visualmente la carpeta donde se organizarán las tutorías.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 md:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Carpeta raíz</p>
                {rootFolderId ? (
                  <div className="mt-1">
                    <p className="font-semibold text-slate-900">{rootFolderName || "Carpeta seleccionada"}</p>
                    <p className="text-xs text-slate-500">
                      {rootFolderId !== settings.rootFolderId
                        ? "La ubicación se detectará al guardar"
                        : settings.sharedDriveId ? "Unidad compartida" : "Mi unidad"}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">Todavía no has seleccionado una carpeta.</p>
                )}
              </div>
              <GoogleDriveFolderPicker
                disabled={!settings.connected}
                onError={(text) => setMessage({ ok: false, text })}
                onSelect={(folder) => {
                  setRootFolderId(folder.id);
                  setRootFolderName(folder.name);
                  setMessage({
                    ok: true,
                    text: `Carpeta “${folder.name}” seleccionada. Guarda la configuración para aplicarla.`,
                  });
                }}
              />
            </div>
          </div>
          <label className="text-sm font-medium text-slate-700">
            Semestre
            <SemesterSelect value={semester} onChange={setSemester}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1B3A52] focus:ring-2 focus:ring-[#1B3A52]/15" />
          </label>
          <div>
            <p className="text-sm font-medium text-slate-700">Meses incluidos</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {MONTHS.map((name, index) => {
                const month = index + 1;
                const selected = months.includes(month);
                return (
                  <button key={name} type="button" onClick={() => toggleMonth(month)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${selected ? "border-[#1B3A52] bg-[#1B3A52] text-white" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <button onClick={test} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Probar conexión
          </button>
          <button onClick={save} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-lg bg-[#1B3A52] px-4 py-2 text-sm font-medium text-white hover:bg-[#142c3f] disabled:opacity-50">
            {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />} Guardar configuración
          </button>
        </div>
      </section>
    </div>
  );
}
