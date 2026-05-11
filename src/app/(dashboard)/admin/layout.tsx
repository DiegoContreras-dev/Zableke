import { Source_Sans_3 } from "next/font/google";
import { AdminDashboardShell } from "@/frontend/modules/admin-dashboard/AdminDashboardShell";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={sourceSans.className}>
      <AdminDashboardShell>{children}</AdminDashboardShell>
    </div>
  );
}
