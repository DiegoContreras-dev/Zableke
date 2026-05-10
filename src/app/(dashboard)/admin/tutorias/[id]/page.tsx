import { AdminOfferingDetailPage } from "@/frontend/modules/admin-dashboard/AdminOfferingDetailPage";

export default async function AdminOfferingDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminOfferingDetailPage offeringId={id} />;
}
