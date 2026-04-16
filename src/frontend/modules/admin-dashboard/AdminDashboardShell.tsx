"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useMemo, useState, useRef, useEffect } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Shield,
  Users,
  X,
} from "lucide-react";
import {
  clearTutorSession,
  hasTutorSession,
} from "@/frontend/modules/auth/services/session";

const mainNavItems: ReadonlyArray<{
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
}> = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/tutores", label: "Tutores", icon: Users },
  { href: "/admin/sesiones", label: "Sesiones", icon: CalendarDays },
  { href: "/admin/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/admin/auditoria", label: "Auditoría", icon: ScrollText },
];

type AdminDashboardShellProps = {
  children: ReactNode;
};

export function AdminDashboardShell({ children }: AdminDashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [hasActiveSession, setHasActiveSession] = useState<boolean | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setHasActiveSession(hasTutorSession());
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const pageTitle = useMemo(() => {
    const selected = [...mainNavItems].reverse().find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    );
    return selected?.label ?? "Admin Dashboard";
  }, [pathname]);

  useEffect(() => {
    if (hasActiveSession === false) {
      router.replace("/login");
    }
  }, [hasActiveSession, router]);

  const handleLogout = () => {
    clearTutorSession();
    setHasActiveSession(false);
    setIsProfileDropdownOpen(false);
    setIsMobileMenuOpen(false);
    router.replace("/login");
  };

  if (hasActiveSession !== true) {
    return <div className="min-h-screen bg-[#F0F4F8]" aria-label="Comprobando sesión" />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F0F4F8] font-sans text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-[#1B3A52] shadow-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

          {/* Left: logo + nav */}
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-300 hover:bg-white/10 lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex shrink-0 items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/imports/logo_exito_academico.png"
                alt="Éxito Académico UCN"
                className="h-9 w-auto object-contain"
              />
              <div className="hidden sm:flex items-center gap-1.5 ml-1">
                <Shield className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-semibold text-white">Panel Admin</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="ml-6 hidden lg:flex lg:gap-0.5">
              {mainNavItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-white/15 text-white"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: profile dropdown */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                aria-expanded={isProfileDropdownOpen}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-[#1B3A52] font-bold text-xs shrink-0">
                  A
                </div>
                <span className="hidden text-sm font-medium text-white sm:block">Admin UCN</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-300 hidden sm:block" />
              </button>

              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 origin-top-right divide-y divide-slate-100 rounded-lg bg-white shadow-xl ring-1 ring-black/5">
                  <div className="px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">Admin UCN</p>
                    <p className="truncate text-xs text-slate-500">admin@ce.ucn.cl</p>
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      <Shield className="h-2.5 w-2.5" /> Administrador
                    </span>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE MENU */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-[#1B3A52] shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-400" />
                <span className="font-semibold text-white">Panel Administración</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-md p-1.5 text-slate-300 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <div className="space-y-1">
                {mainNavItems.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-white/15 text-white"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="border-t border-white/10 p-4">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/20 hover:text-red-200"
              >
                <LogOut className="h-5 w-5" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAGE TITLE (mobile) */}
      <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <h1 className="text-base font-semibold text-slate-900">{pageTitle}</h1>
      </div>

      {/* MAIN CONTENT */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
