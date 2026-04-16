"use client";

import { useState, useEffect } from "react";
import { User, Mail, ShieldCheck, MapPin, Briefcase, Camera, Loader2, Save, AlertCircle, CheckCircle2, Phone, X, Upload, Palette } from "lucide-react";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const ME_QUERY = gql`
  query ProfileMe {
    me {
      id
      email
      firstName
      lastName
      phone
      bio
      linkedinUrl
      roles
    }
  }
`;

const UPDATE_PROFILE = gql`
  mutation UpdateMyProfile($input: UpdateProfileInput!) {
    updateMyProfile(input: $input) {
      id
      phone
      bio
      linkedinUrl
      firstName
      lastName
    }
  }
`;

export function TutorProfilePage() {
  const { data: meData, loading: meLoading } = useQuery<{
    me: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
      bio: string | null;
      linkedinUrl: string | null;
      roles: string[];
    };
  }>(ME_QUERY, { fetchPolicy: "cache-and-network" });

  const [updateMyProfile] = useMutation(UPDATE_PROFILE);

  const me = meData?.me;
  const fullName = [me?.firstName, me?.lastName].filter(Boolean).join(" ") || "Tutor";
  const initials = fullName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const systemData = {
    fullName,
    email: me?.email ?? "",
    role: (me?.roles ?? []).includes("ADMIN") ? "Administrador" : "Tutor Académico",
    campus: "Campus Guayacán - Coquimbo",
    program: "Ingeniería en Computación e Informática",
  };

  const [formData, setFormData] = useState({
    phone: "",
    bio: "",
    linkedin: "",
  });

  useEffect(() => {
    if (me) {
      setFormData({
        phone: me.phone ?? "",
        bio: me.bio ?? "",
        linkedin: me.linkedinUrl ?? "",
      });
    }
  }, [me]);

  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [temporaryAvatarUrl, setTemporaryAvatarUrl] = useState<string | null>(null);

  const [bannerColor, setBannerColor] = useState("bg-[#23415B]");
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleColorSelect = (color: string) => {
    setBannerColor(color);
    localStorage.setItem('tutor_banner', color);
    setShowColorPicker(false);
  };

  // Load initial avatar and subscribe to changes across components
  useEffect(() => {
    const loadAvatar = () => {
      const stored = localStorage.getItem('tutor_avatar');
      if (stored) setAvatarUrl(stored);
    };
    
    const storedBanner = localStorage.getItem('tutor_banner');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (storedBanner) setBannerColor(storedBanner);

    loadAvatar();
    window.addEventListener('tutor_avatar_updated', loadAvatar);
    return () => window.removeEventListener('tutor_avatar_updated', loadAvatar);
  }, []);

  const phoneRegex = /^\+?[0-9\s\-]{8,15}$/;
  const isPhoneValid = phoneRegex.test(formData.phone);
  const isBioValid = formData.bio.length <= 500;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPhoneValid || !isBioValid) {
      setToast({ type: 'error', message: 'Por favor, corrige los errores en el formulario.' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setIsSaving(true);
    setToast(null);

    updateMyProfile({
      variables: {
        input: {
          phone: formData.phone || undefined,
          bio: formData.bio || undefined,
          linkedinUrl: formData.linkedin || undefined,
        },
      },
    })
      .then(() => {
        setToast({ type: 'success', message: '¡Perfil actualizado correctamente!' });
        setTimeout(() => setToast(null), 3000);
      })
      .catch(() => {
        setToast({ type: 'error', message: 'Error al guardar. Inténtalo de nuevo.' });
        setTimeout(() => setToast(null), 3000);
      })
      .finally(() => setIsSaving(false));
  };

  const applyAvatar = () => {
    if (temporaryAvatarUrl) {
      setAvatarUrl(temporaryAvatarUrl);
      localStorage.setItem('tutor_avatar', temporaryAvatarUrl);
      
      // Dispatch event to update the shell header instantly
      window.dispatchEvent(new Event('tutor_avatar_updated'));
    }
    setIsAvatarModalOpen(false);
    setTemporaryAvatarUrl(null);
    setToast({ type: 'success', message: 'Foto actualizada exitosamente' });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-2 pb-1 flex flex-col min-h-[calc(100vh-6rem)] lg:min-h-[calc(100vh-7rem)] overflow-hidden">
      
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 hidden lg:block">Mi Perfil</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Administra tu información personal y preferencias de contacto.
          </p>
        </div>
        
        {toast && (
          <div className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-8 sm:bottom-auto sm:top-24 z-50 flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border ${
            toast.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' : 'bg-red-50 border-red-500 text-red-800'
          } animate-in slide-in-from-bottom-5 sm:slide-in-from-right-5 fade-in duration-300`}>
            {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" /> : <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />}
            <span className="text-xs font-medium">{toast.message}</span>
          </div>
        )}
      </div>

      {/* Main Grid adjusted to avoid vertical scroll */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
        
        {/* LEFT COLUMN: System Info & Avatar */}
        <div className="lg:col-span-1 flex flex-col gap-3 h-full pb-4">
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden shrink-0">
            <div className={`h-14 transition-colors duration-500 relative ${bannerColor}`}>
              <button 
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="absolute top-2 right-2 p-1.5 rounded-md text-white/70 hover:text-white hover:bg-black/20 transition-all opacity-0 group-hover:opacity-100 sm:opacity-100"
                title="Cambiar color de fondo"
              >
                <Palette className="h-3.5 w-3.5" />
              </button>
              
              {showColorPicker && (
                <div className="absolute top-9 right-2 bg-white p-2 rounded-lg shadow-lg border border-slate-100 grid grid-cols-5 gap-1.5 z-10 animate-in fade-in zoom-in-95 origin-top-right">
                  {[
                    "bg-[#23415B]", "bg-slate-700", "bg-blue-600", "bg-indigo-500", "bg-violet-600",
                    "bg-fuchsia-600", "bg-rose-500", "bg-orange-500", "bg-emerald-500", "bg-teal-500"
                  ].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleColorSelect(color)}
                      className={`h-4 w-4 rounded-full ${color} ${bannerColor === color ? 'ring-2 ring-offset-1 ring-slate-400' : 'hover:scale-110 transition-transform'}`}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="pb-3 px-4 relative flex flex-col items-center">
              <div 
                className="relative -mt-8 mb-2 group cursor-pointer"
                onClick={() => setIsAvatarModalOpen(true)}
              >
                <div className="h-20 w-20 rounded-full border-[3px] border-white bg-slate-100 flex items-center justify-center overflow-hidden relative shadow-sm">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-semibold text-[#23415B]">{meLoading ? "…" : initials}</span>
                  )}
                  
                  <div className="absolute inset-0 bg-slate-900/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-5 w-5 text-white mb-0.5" />
                    <span className="text-[10px] font-medium text-white">Editar</span>
                  </div>
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-900 text-center leading-tight">{systemData.fullName}</h3>
              <p className="text-xs text-[#E5742A] font-medium mt-1">{systemData.role}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex-1 flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                Información del sistema
              </h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Correo Institucional
                  </p>
                  <p className="text-sm font-medium text-slate-900 bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-100 break-words">{systemData.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> Sede
                  </p>
                  <p className="text-sm font-medium text-slate-900 bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-100">{systemData.campus}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" /> Carrera
                  </p>
                  <p className="text-sm font-medium text-slate-900 bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-100">{systemData.program}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-3 pt-2.5 border-t border-slate-100">
              <p className="text-xs text-slate-400 leading-tight">
                Datos de Éxito Académico. Contacta con coordinación si hay un error.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Form */}
        <div className="lg:col-span-2 flex flex-col h-full pb-2">
          <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-slate-200 w-full flex-1 flex flex-col">
            <div className="p-3.5 sm:p-4 flex-1 w-full box-border">
              <h4 className="text-[15px] font-bold text-slate-900 flex items-center gap-1.5 pb-2 mb-3 border-b border-slate-100">
                <User className="h-4 w-4 text-[#23415B]" />
                Información pública y Contacto
              </h4>

              <div className="space-y-3.5">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Phone Field */}
                  <div>
                    <label htmlFor="phone" className="block text-[13px] font-medium text-slate-700 mb-1">
                      Teléfono
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400">
                        <Phone className="h-3.5 w-3.5" />
                      </span>
                      <input
                        type="tel"
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className={`block w-full pl-8 px-2.5 py-1.5 text-[13px] rounded-md border ${
                          !isPhoneValid ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 focus:border-[#23415B] focus:ring-[#23415B]'
                        } bg-white shadow-sm focus:outline-none focus:ring-1 transition-colors`}
                        placeholder="+56 9 1234 5678"
                      />
                    </div>
                    {!isPhoneValid && (
                      <p className="mt-1 text-[11px] text-red-500">
                        Formato inválido.
                      </p>
                    )}
                  </div>

                  {/* LinkedIn Field */}
                  <div>
                    <label htmlFor="linkedin" className="block text-[13px] font-medium text-slate-700 mb-1">
                      LinkedIn (Opcional)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 font-semibold text-[11px]">
                        in
                      </span>
                      <input
                        type="url"
                        id="linkedin"
                        value={formData.linkedin}
                        onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                        className="block w-full pl-7 px-2.5 py-1.5 text-[13px] rounded-md border border-slate-300 bg-white shadow-sm focus:border-[#23415B] focus:outline-none focus:ring-1 focus:ring-[#23415B] transition-colors"
                        placeholder="https://linkedin.com/..."
                      />
                    </div>
                  </div>
                </div>

                {/* Bio Field w/o scroll overlap by fixing grid usage */}
                <div>
                  <label htmlFor="bio" className="block text-[13px] font-medium text-slate-700 mb-1 flex justify-between">
                    <span>Sobre Mí / Biografía</span>
                    <span className={`text-xs ${formData.bio.length > 500 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                      {formData.bio.length} / 500
                    </span>
                  </label>
                  <textarea
                    id="bio"
                    rows={4}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className={`block w-full px-3 py-2 text-[13px] rounded-md border ${
                      !isBioValid ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 focus:border-[#23415B] focus:ring-[#23415B]'
                    } bg-white shadow-sm focus:outline-none focus:ring-1 transition-colors resize-none`}
                    placeholder="Experiencia, metodología, metas..."
                  />
                  <p className="mt-1 text-xs text-slate-500 max-w-sm">
                    Visible para organizar tutorías contigo.
                  </p>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5 rounded-b-xl shrink-0 mt-auto">
              <button
                type="button"
                className="px-3.5 py-1.5 text-[13px] font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#23415B]"
              >
                Descartar
              </button>
              <button
                type="submit"
                disabled={isSaving || !isPhoneValid || !isBioValid}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-medium text-white bg-[#23415B] border border-transparent rounded-md hover:bg-[#1a3144] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#23415B] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" /> Guardar
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xs w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900">Actualizar Foto</h3>
              <button 
                onClick={() => {
                  setIsAvatarModalOpen(false);
                  setTemporaryAvatarUrl(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-5 flex flex-col items-center">
              <div className="h-24 w-24 rounded-full border-4 border-slate-100 bg-slate-50 flex items-center justify-center mb-4 overflow-hidden relative">
                {temporaryAvatarUrl || avatarUrl ? (
                  <img src={temporaryAvatarUrl || avatarUrl || ''} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-semibold text-[#23415B]">{meLoading ? "…" : initials}</span>
                )}
              </div>
              
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#23415B] text-[#23415B] text-xs font-medium rounded-md hover:bg-slate-50 transition-colors">
                <Upload className="h-3.5 w-3.5" />
                Seleccionar foto
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/jpg" 
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setTemporaryAvatarUrl(URL.createObjectURL(file));
                    }
                  }}
                />
              </label>
              <p className="text-[10px] text-slate-400 mt-2 text-center px-4 leading-snug">
                Formato JPG o PNG.<br/>Máximo 2MB.
              </p>
            </div>
            
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button 
                onClick={() => {
                  setIsAvatarModalOpen(false);
                  setTemporaryAvatarUrl(null);
                }}
                className="px-3 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button 
                onClick={applyAvatar}
                disabled={!temporaryAvatarUrl}
                className="px-3 py-1 text-xs font-medium text-white bg-[#23415B] rounded-md hover:bg-[#1a3144] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}