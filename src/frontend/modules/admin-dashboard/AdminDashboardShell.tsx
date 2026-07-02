"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useMemo, useState, useRef, useEffect } from "react";
import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  Shield,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  clearTutorSession,
  getSessionRoles,
  hasTutorSession,
  resolveRequiredRoleRedirect,
} from "@/frontend/modules/auth/services/session";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { profileAvatarSrc } from "@/frontend/lib/profile-avatar";
import { getApolloClient } from "@/frontend/lib/apollo-client";

const ADMIN_SHELL_ME = gql`
  query AdminShellMe {
    me {
      id
      email
      firstName
      lastName
      avatarUrl
    }
  }
`;

const mainNavItems: ReadonlyArray<{
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
}> = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/tutores", label: "Tutores", icon: Users },
  { href: "/admin/tutorias", label: "Tutorías", icon: ClipboardList },
  { href: "/admin/semestres", label: "Semestres", icon: CalendarRange },
  { href: "/admin/sesiones", label: "Sesiones", icon: CalendarDays },
  { href: "/admin/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/admin/auditoria", label: "Monitoreo", icon: ScrollText },
  { href: "/admin/integraciones", label: "Integraciones", icon: Settings },
];

type AdminDashboardShellProps = {
  children: ReactNode;
};

export function AdminDashboardShell({ children }: AdminDashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [hasActiveSession, setHasActiveSession] = useState<boolean | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [roleRedirectPath, setRoleRedirectPath] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const { data: meData, refetch: refetchMe } = useQuery<{
    me: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    };
  }>(ADMIN_SHELL_ME, { fetchPolicy: "network-only" });
  const me = meData?.me;
  const fullName = [me?.firstName, me?.lastName].filter(Boolean).join(" ") || "Administrador";
  const initials = [me?.firstName, me?.lastName]
    .filter(Boolean)
    .map((part) => part?.[0])
    .join("")
    .toUpperCase() || "A";
  const avatarUrl = profileAvatarSrc(me?.avatarUrl, me?.id, avatarVersion);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const sessionExists = hasTutorSession();
      setHasActiveSession(sessionExists);
      if (sessionExists) {
        const redirect = resolveRequiredRoleRedirect(getSessionRoles(), "ADMIN");
        setIsAuthorized(redirect === null);
        setRoleRedirectPath(redirect);
      }
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

  useEffect(() => {
    const handleAvatarUpdate = () => {
      setAvatarVersion(Date.now());
      void refetchMe();
    };
    window.addEventListener("tutor_avatar_updated", handleAvatarUpdate);
    return () => window.removeEventListener("tutor_avatar_updated", handleAvatarUpdate);
  }, [refetchMe]);

  const pageTitle = useMemo(() => {
    const selected = [...mainNavItems, { href: "/admin/perfil", label: "Mi perfil", icon: UserRound }].reverse().find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    );
    return selected?.label ?? "Admin Dashboard";
  }, [pathname]);

  useEffect(() => {
    if (hasActiveSession === false) {
      router.replace("/login");
    }
  }, [hasActiveSession, router]);

  useEffect(() => {
    if (roleRedirectPath) {
      router.replace(roleRedirectPath);
    }
  }, [roleRedirectPath, router]);

  const handleLogout = () => {
    clearTutorSession();
    void getApolloClient().clearStore();
    setHasActiveSession(false);
    setIsProfileDropdownOpen(false);
    setIsMobileMenuOpen(false);
    router.replace("/login");
  };

  if (hasActiveSession !== true || isAuthorized !== true) {
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
                <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-amber-400 text-xs font-bold text-[#1B3A52] shrink-0">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <span className="hidden text-sm font-medium text-white sm:block">{fullName}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-300 hidden sm:block" />
              </button>

              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 origin-top-right divide-y divide-slate-100 rounded-lg bg-white shadow-xl ring-1 ring-black/5">
                  <div className="px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">{fullName}</p>
                    <p className="truncate text-xs text-slate-500">{me?.email ?? ""}</p>
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      <Shield className="h-2.5 w-2.5" /> Administrador
                    </span>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/admin/perfil"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#1B3A52]"
                    >
                      <UserRound className="h-4 w-4 text-slate-400" />
                      Editar perfil
                    </Link>
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
