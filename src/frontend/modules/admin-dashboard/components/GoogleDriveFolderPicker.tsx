"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Folder,
  FolderPlus,
  HardDrive,
  Loader2,
  X,
} from "lucide-react";

type DriveFolder = {
  id: string;
  name: string;
  modifiedTime?: string;
  url?: string;
};

type Location = {
  id: string;
  name: string;
};

type Props = {
  disabled?: boolean;
  onError(message: string): void;
  onSelect(folder: DriveFolder): void;
};

export function GoogleDriveFolderPicker({ disabled, onError, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"my" | "shared">("my");
  const [locations, setLocations] = useState<Location[]>([{ id: "root", name: "Mi unidad" }]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [selected, setSelected] = useState<DriveFolder | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const current = locations.at(-1);
  const selectableCurrent = useMemo<DriveFolder | null>(() => {
    if (!current) return null;
    if (mode === "my" && current.id === "root") return null;
    return { id: current.id, name: current.name };
  }, [current, mode]);

  const loadFolders = async (nextMode = mode, nextLocations = locations) => {
    setLoading(true);
    setSelected(null);
    try {
      const sharedRoot = nextMode === "shared" && nextLocations.length === 0;
      const currentLocation = nextLocations.at(-1);
      const query = sharedRoot
        ? "sharedDrives=true"
        : `parentId=${encodeURIComponent(currentLocation?.id || "root")}`;
      const response = await fetch(`/api/admin/drive/browser?${query}`, { cache: "no-store" });
      const result = await response.json() as { folders?: DriveFolder[]; error?: string };
      if (!response.ok) throw new Error(result.error || "No fue posible leer las carpetas.");
      setFolders(result.folders ?? []);
    } catch (error) {
      onError(error instanceof Error ? error.message : "No fue posible leer Google Drive.");
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void loadFolders("my", [{ id: "root", name: "Mi unidad" }]);
    // La apertura siempre reinicia en la raíz de Mi unidad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const switchMode = (nextMode: "my" | "shared") => {
    const nextLocations = nextMode === "my" ? [{ id: "root", name: "Mi unidad" }] : [];
    setMode(nextMode);
    setLocations(nextLocations);
    setCreating(false);
    void loadFolders(nextMode, nextLocations);
  };

  const enterFolder = (folder: DriveFolder) => {
    const nextLocations = [...locations, { id: folder.id, name: folder.name }];
    setLocations(nextLocations);
    setCreating(false);
    void loadFolders(mode, nextLocations);
  };

  const goBack = () => {
    if (mode === "my" && locations.length <= 1) return;
    if (mode === "shared" && locations.length === 0) return;
    const nextLocations = locations.slice(0, -1);
    setLocations(nextLocations);
    setCreating(false);
    void loadFolders(mode, nextLocations);
  };

  const createFolder = async () => {
    if (!current || !newFolderName.trim()) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/drive/browser", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newFolderName, parentId: current.id }),
      });
      const result = await response.json() as { folder?: DriveFolder; error?: string };
      if (!response.ok || !result.folder) {
        throw new Error(result.error || "No fue posible crear la carpeta.");
      }
      setCreating(false);
      setNewFolderName("");
      await loadFolders(mode, locations);
      setSelected(result.folder);
    } catch (error) {
      onError(error instanceof Error ? error.message : "No fue posible crear la carpeta.");
    } finally {
      setLoading(false);
    }
  };

  const chooseFolder = () => {
    const folder = selected ?? selectableCurrent;
    if (!folder) return;
    onSelect(folder);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMode("my");
          setLocations([{ id: "root", name: "Mi unidad" }]);
          setOpen(true);
        }}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-lg bg-[#1B3A52] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#142c3f] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <HardDrive className="h-4 w-4" />
        Seleccionar carpeta en Drive
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="flex h-[min(760px,92vh)] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Selecciona la carpeta raíz</h2>
                <p className="mt-0.5 text-sm text-slate-500">Navega por Drive o crea una carpeta en la ubicación actual.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex border-b border-slate-200 px-5">
              <button type="button" onClick={() => switchMode("my")}
                className={`border-b-2 px-3 py-3 text-sm font-semibold ${mode === "my" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500"}`}>
                Mi unidad
              </button>
              <button type="button" onClick={() => switchMode("shared")}
                className={`border-b-2 px-3 py-3 text-sm font-semibold ${mode === "shared" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500"}`}>
                Unidades compartidas
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3">
              <button type="button" onClick={goBack}
                disabled={(mode === "my" && locations.length <= 1) || (mode === "shared" && locations.length === 0)}
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 disabled:opacity-40">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm text-slate-600">
                {locations.length === 0 ? <span>Unidades compartidas</span> : locations.map((location, index) => (
                  <div key={`${location.id}-${index}`} className="flex shrink-0 items-center gap-1">
                    {index > 0 && <ChevronRight className="h-4 w-4 text-slate-400" />}
                    <span className={index === locations.length - 1 ? "font-semibold text-slate-900" : ""}>{location.name}</span>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setCreating(true)}
                disabled={!current || loading}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-40">
                <FolderPlus className="h-4 w-4" /> Nueva carpeta
              </button>
            </div>

            {creating && (
              <div className="flex gap-2 border-b border-slate-200 bg-blue-50 px-5 py-3">
                <input autoFocus value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") void createFolder(); }}
                  placeholder="Nombre de la nueva carpeta" maxLength={120}
                  className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" />
                <button type="button" onClick={createFolder} disabled={!newFolderName.trim() || loading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                  Crear
                </button>
                <button type="button" onClick={() => setCreating(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
                  Cancelar
                </button>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-auto">
              <div className="grid grid-cols-[1fr_180px_48px] border-b border-slate-200 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Nombre</span><span>Última modificación</span><span />
              </div>
              {loading ? (
                <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
              ) : folders.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center text-slate-400">
                  <Folder className="mb-2 h-10 w-10" /><p>No hay carpetas en esta ubicación.</p>
                </div>
              ) : folders.map((folder) => (
                <button key={folder.id} type="button" onClick={() => setSelected(folder)}
                  onDoubleClick={() => enterFolder(folder)}
                  className={`grid w-full grid-cols-[1fr_180px_48px] items-center border-b border-slate-100 px-5 py-3 text-left hover:bg-blue-50 ${selected?.id === folder.id ? "bg-blue-50 ring-1 ring-inset ring-blue-300" : ""}`}>
                  <span className="flex min-w-0 items-center gap-3 font-medium text-slate-800">
                    <Folder className="h-5 w-5 shrink-0 fill-slate-500 text-slate-500" />
                    <span className="truncate">{folder.name}</span>
                  </span>
                  <span className="text-sm text-slate-500">
                    {folder.modifiedTime ? new Date(folder.modifiedTime).toLocaleDateString("es-CL") : "—"}
                  </span>
                  <span onClick={(event) => { event.stopPropagation(); enterFolder(folder); }}
                    className="flex justify-end text-slate-400 hover:text-blue-600">
                    <ChevronRight className="h-5 w-5" />
                  </span>
                </button>
              ))}
            </div>

            <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4">
              <p className="truncate pr-4 text-sm text-slate-500">
                {selected ? `Seleccionada: ${selected.name}` : selectableCurrent ? `Carpeta actual: ${selectableCurrent.name}` : "Selecciona una carpeta"}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                  Cancelar
                </button>
                <button type="button" onClick={chooseFolder} disabled={!selected && !selectableCurrent}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
                  Seleccionar
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
