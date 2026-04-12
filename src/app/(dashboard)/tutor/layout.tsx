import { Source_Sans_3 } from "next/font/google";

import { TutorDashboardShell } from "@/front/modules/tutor-dashboard/components/TutorDashboardShell";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function TutorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className={sourceSans.className}><TutorDashboardShell>{children}</TutorDashboardShell></div>;
}
