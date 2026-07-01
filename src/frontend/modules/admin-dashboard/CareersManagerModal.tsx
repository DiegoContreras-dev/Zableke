import { useState } from "react";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import { AlertTriangle, Plus, Pencil, Trash2, X, LoaderCircle, Check } from "lucide-react";

const GET_CAREERS = gql`
  query GetCareersManager {
    careers {
      id
      name
      schoolName
      color
    }
  }
`;

const CREATE_CAREER = gql`
  mutation CreateCareer($input: CreateCareerInput!) {
    createCareer(input: $input) {
      id
      name
      schoolName
      color
    }
  }
`;

const UPDATE_CAREER = gql`
  mutation UpdateCareer($id: ID!, $input: UpdateCareerInput!) {
    updateCareer(id: $id, input: $input) {
      id
      name
      schoolName
      color
    }
  }
`;

const DELETE_CAREER = gql`
  mutation DeleteCareer($id: ID!) {
    deleteCareer(id: $id)
  }
`;

const PRESET_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#06B6D4", "#F97316", "#EC4899", "#6B7280", "#14B8A6",
];

interface CareerOption {
  id: string;
  name: string;
  schoolName: string;
  color: string | null;
}

interface CareersManagerModalProps {
  onClose: () => void;
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${value === c ? "border-slate-900 scale-110" : "border-transparent"}`}
          style={{ backgroundColor: c }}
        />
      ))}
      <input
        type="color"
        value={value || "#6B7280"}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-6 cursor-pointer rounded border border-slate-300 p-0"
        title="Color personalizado"
      />
    </div>
  );
}

function InlineEditForm({
  name,
  schoolName,
  color,
  errorMsg,
  onChangeName,
  onChangeSchool,
  onChangeColor,
  onSave,
  onCancel,
}: {
  name: string;
  schoolName: string;
  color: string;
  errorMsg: string | null;
  onChangeName: (v: string) => void;
  onChangeSchool: (v: string) => void;
  onChangeColor: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <tr className="bg-slate-50">
      <td colSpan={4} className="px-4 py-3">
        {errorMsg && (
          <div className="mb-2 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => onChangeName(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm shadow-sm focus:border-[#23415B] focus:outline-none focus:ring-1 focus:ring-[#23415B]"
            placeholder="Nombre de la carrera"
          />
          <input
            value={schoolName}
            onChange={(e) => onChangeSchool(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm shadow-sm focus:border-[#23415B] focus:outline-none focus:ring-1 focus:ring-[#23415B]"
            placeholder="Escuela / Facultad"
          />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600">Color:</span>
          <ColorPicker value={color} onChange={onChangeColor} />
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#23415B] px-3 py-1 text-xs font-medium text-white hover:bg-[#1a3146]"
          >
            <Check className="h-3 w-3" /> Guardar
          </button>
        </div>
      </td>
    </tr>
  );
}

export function CareersManagerModal({ onClose }: CareersManagerModalProps) {
  const { data, loading } = useQuery<{ careers: CareerOption[] }>(GET_CAREERS, {
    fetchPolicy: "cache-and-network",
  });
  const [createCareer] = useMutation(CREATE_CAREER, { refetchQueries: ["GetCareersManager", "AdminOfferings"] });
  const [updateCareer] = useMutation(UPDATE_CAREER, { refetchQueries: ["GetCareersManager", "AdminOfferings"] });
  const [deleteCareer] = useMutation(DELETE_CAREER, { refetchQueries: ["GetCareersManager", "AdminOfferings"] });

  const [editingCareerId, setEditingCareerId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]!);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const careers = data?.careers ?? [];

  const handleCreate = async () => {
    setErrorMsg(null);
    if (!name.trim() || !schoolName.trim()) { setErrorMsg("Completa ambos campos."); return; }
    try {
      await createCareer({ variables: { input: { name: name.trim(), schoolName: schoolName.trim(), color } } });
      setIsCreating(false);
      setName("");
      setSchoolName("");
      setColor(PRESET_COLORS[0]!);
    } catch (e: any) {
      setErrorMsg(e.message || "Error al crear");
    }
  };

  const handleUpdate = async () => {
    setErrorMsg(null);
    if (!editingCareerId) return;
    if (!name.trim() || !schoolName.trim()) { setErrorMsg("Completa ambos campos."); return; }
    try {
      await updateCareer({ variables: { id: editingCareerId, input: { name: name.trim(), schoolName: schoolName.trim(), color } } });
      setEditingCareerId(null);
      setName("");
      setSchoolName("");
      setColor(PRESET_COLORS[0]!);
    } catch (e: any) {
      setErrorMsg(e.message || "Error al actualizar");
    }
  };

  const handleDelete = async (id: string, careerName: string) => {
    if (confirm(`¿Estás seguro de eliminar la carrera '${careerName}'? Esto la quitará de todas las tutorías y borrará los registros de asistencia de los alumnos de esa carrera.`)) {
      try {
        await deleteCareer({ variables: { id } });
      } catch (e: any) {
        alert(e.message || "Error al eliminar");
      }
    }
  };

  const openEdit = (career: CareerOption) => {
    setEditingCareerId(career.id);
    setIsCreating(false);
    setName(career.name);
    setSchoolName(career.schoolName);
    setColor(career.color ?? PRESET_COLORS[0]!);
    setErrorMsg(null);
  };

  const openCreate = () => {
    setIsCreating(true);
    setEditingCareerId(null);
    setName("");
    setSchoolName("");
    setColor(PRESET_COLORS[0]!);
    setErrorMsg(null);
  };

  const cancelForm = () => {
    setIsCreating(false);
    setEditingCareerId(null);
    setName("");
    setSchoolName("");
    setColor(PRESET_COLORS[0]!);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Gestión de Carreras Ofertadas</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Formulario de creación — solo al tope cuando se crea */}
          {isCreating && (
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-3 font-semibold text-slate-800">Agregar Carrera</h3>
              {errorMsg && (
                <div className="mb-2 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{errorMsg}</p>
                </div>
              )}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Nombre de la Carrera
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm"
                    placeholder="Ej: Biología Marina"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Escuela / Departamento / Facultad
                  <input
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm"
                    placeholder="Ej: ESCUELA DE CIENCIAS DEL MAR"
                  />
                </label>
                <div>
                  <span className="text-sm font-medium text-slate-700">Color identificador</span>
                  <div className="mt-1.5">
                    <ColorPicker value={color} onChange={setColor} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={cancelForm} className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200">
                    Cancelar
                  </button>
                  <button onClick={handleCreate} className="rounded-md bg-[#23415B] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1a3146]">
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mb-4 flex justify-end">
            <button
              onClick={openCreate}
              disabled={isCreating}
              className="inline-flex items-center gap-2 rounded-md bg-[#23415B] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1a3146] disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Agregar Carrera
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <LoaderCircle className="h-8 w-8 animate-spin text-[#23415B]" />
            </div>
          ) : careers.length === 0 ? (
            <p className="py-4 text-center text-slate-500">No hay carreras registradas.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-900">Color</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Nombre</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Escuela</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-900">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {careers.map((career) => (
                    <>
                      <tr key={career.id} className={`hover:bg-slate-50 ${editingCareerId === career.id ? "bg-blue-50/40" : ""}`}>
                        <td className="px-4 py-3">
                          <span
                            className="inline-block h-5 w-5 rounded-full border border-slate-200"
                            style={{ backgroundColor: career.color ?? "#6B7280" }}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">{career.name}</td>
                        <td className="px-4 py-3 text-slate-500">{career.schoolName}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => editingCareerId === career.id ? cancelForm() : openEdit(career)}
                            className={`mr-3 ${editingCareerId === career.id ? "text-slate-400 hover:text-slate-600" : "text-blue-600 hover:text-blue-800"}`}
                            title={editingCareerId === career.id ? "Cancelar" : "Editar"}
                          >
                            <Pencil className="inline h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(career.id, career.name)} className="text-rose-600 hover:text-rose-800" title="Eliminar">
                            <Trash2 className="inline h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                      {editingCareerId === career.id && (
                        <InlineEditForm
                          key={`edit-${career.id}`}
                          name={name}
                          schoolName={schoolName}
                          color={color}
                          errorMsg={errorMsg}
                          onChangeName={setName}
                          onChangeSchool={setSchoolName}
                          onChangeColor={setColor}
                          onSave={handleUpdate}
                          onCancel={cancelForm}
                        />
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
