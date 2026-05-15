import { useState } from "react";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import { AlertTriangle, Plus, Pencil, Trash2, X, LoaderCircle } from "lucide-react";

const GET_CAREERS = gql`
  query GetCareersManager {
    careers {
      id
      name
      schoolName
    }
  }
`;

const CREATE_CAREER = gql`
  mutation CreateCareer($input: CreateCareerInput!) {
    createCareer(input: $input) {
      id
      name
      schoolName
    }
  }
`;

const UPDATE_CAREER = gql`
  mutation UpdateCareer($id: ID!, $input: UpdateCareerInput!) {
    updateCareer(id: $id, input: $input) {
      id
      name
      schoolName
    }
  }
`;

const DELETE_CAREER = gql`
  mutation DeleteCareer($id: ID!) {
    deleteCareer(id: $id)
  }
`;

interface CareerOption {
  id: string;
  name: string;
  schoolName: string;
}

interface CareersManagerModalProps {
  onClose: () => void;
}

export function CareersManagerModal({ onClose }: CareersManagerModalProps) {
  const { data, loading } = useQuery<{ careers: CareerOption[] }>(GET_CAREERS, {
    fetchPolicy: "cache-and-network",
  });
  const [createCareer] = useMutation(CREATE_CAREER, { refetchQueries: ["GetCareersManager", "AdminOfferings"] });
  const [updateCareer] = useMutation(UPDATE_CAREER, { refetchQueries: ["GetCareersManager", "AdminOfferings"] });
  const [deleteCareer] = useMutation(DELETE_CAREER, { refetchQueries: ["GetCareersManager", "AdminOfferings"] });

  const [editingCareer, setEditingCareer] = useState<CareerOption | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const careers = data?.careers ?? [];

  const handleCreate = async () => {
    setErrorMsg(null);
    if (!name.trim() || !schoolName.trim()) {
      setErrorMsg("Completa ambos campos.");
      return;
    }
    try {
      await createCareer({ variables: { input: { name: name.trim(), schoolName: schoolName.trim() } } });
      setIsCreating(false);
      setName("");
      setSchoolName("");
    } catch (e: any) {
      setErrorMsg(e.message || "Error al crear");
    }
  };

  const handleUpdate = async () => {
    setErrorMsg(null);
    if (!editingCareer) return;
    if (!name.trim() || !schoolName.trim()) {
      setErrorMsg("Completa ambos campos.");
      return;
    }
    try {
      await updateCareer({
        variables: { id: editingCareer.id, input: { name: name.trim(), schoolName: schoolName.trim() } },
      });
      setEditingCareer(null);
      setName("");
      setSchoolName("");
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
    setEditingCareer(career);
    setIsCreating(false);
    setName(career.name);
    setSchoolName(career.schoolName);
    setErrorMsg(null);
  };

  const openCreate = () => {
    setIsCreating(true);
    setEditingCareer(null);
    setName("");
    setSchoolName("");
    setErrorMsg(null);
  };

  const cancelForm = () => {
    setIsCreating(false);
    setEditingCareer(null);
    setName("");
    setSchoolName("");
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
          {errorMsg && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{errorMsg}</p>
            </div>
          )}

          {(isCreating || editingCareer) ? (
            <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-3 font-semibold text-slate-800">{isCreating ? "Agregar Carrera" : "Modificar Carrera"}</h3>
              <div className="space-y-4">
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
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={cancelForm} className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200">
                    Cancelar
                  </button>
                  <button onClick={isCreating ? handleCreate : handleUpdate} className="rounded-md bg-[#23415B] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1a3146]">
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-4 flex justify-end">
              <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-md bg-[#23415B] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1a3146]">
                <Plus className="h-4 w-4" /> Agregar Carrera
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex py-10 justify-center"><LoaderCircle className="h-8 w-8 animate-spin text-[#23415B]" /></div>
          ) : careers.length === 0 ? (
            <p className="py-4 text-center text-slate-500">No hay carreras registradas.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-900">Nombre</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Escuela</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-900">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {careers.map((career) => (
                    <tr key={career.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{career.name}</td>
                      <td className="px-4 py-3 text-slate-500">{career.schoolName}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEdit(career)} className="mr-3 text-blue-600 hover:text-blue-800" title="Editar">
                          <Pencil className="inline h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(career.id, career.name)} className="text-rose-600 hover:text-rose-800" title="Eliminar">
                          <Trash2 className="inline h-4 w-4" />
                        </button>
                      </td>
                    </tr>
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
