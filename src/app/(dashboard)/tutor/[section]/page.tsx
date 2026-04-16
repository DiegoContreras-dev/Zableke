import { TutorPlaceholderPage } from "@/frontend/modules/tutor-dashboard/TutorPlaceholderPage";
import { TutorProfilePage } from "@/frontend/modules/tutor-dashboard/TutorProfilePage";
import { TutorHistorialPage } from "@/frontend/modules/tutor-dashboard/TutorHistorialPage";
import { TutorCalendarioPage } from "@/frontend/modules/tutor-dashboard/TutorCalendarioPage";

const sectionTitleMap: Record<string, string> = {
  historial: "Historial de asistencias",
  calendario: "Mi calendario",
  disponibilidad: "Disponibilidad y bloques",
  notificaciones: "Notificaciones",
  perfil: "Mi perfil",
};

export default async function TutorSectionRoute({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const title = sectionTitleMap[section] ?? "Seccion de tutor";

  if (section === "perfil") {
    return <TutorProfilePage />;
  }

  if (section === "historial") {
    return <TutorHistorialPage />;
  }

  if (section === "calendario") {
    return <TutorCalendarioPage />;
  }

  return <TutorPlaceholderPage sectionLabel={title} />;
}
