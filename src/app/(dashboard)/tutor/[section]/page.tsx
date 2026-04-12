import { TutorPlaceholderPage } from "@/front/modules/tutor-dashboard/TutorPlaceholderPage";

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

  return <TutorPlaceholderPage sectionLabel={title} />;
}
