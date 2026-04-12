"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useMemo, useState, useRef, useEffect } from "react";
import {
  Bell,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  History,
  Home,
  Menu,
  UserRound,
  X,
  LogOut,
  ChevronDown
} from "lucide-react";

const mainNavItems = [
  { href: "/tutor", label: "Inicio", icon: Home },
  { href: "/tutor/asistencia", label: "Rellenar asistencia", icon: ClipboardCheck },
  { href: "/tutor/historial", label: "Historial", icon: History },
  { href: "/tutor/calendario", label: "Calendario", icon: CalendarDays },
] as const;

type TutorDashboardShellProps = {
  children: ReactNode;
};

export function TutorDashboardShell({ children }: TutorDashboardShellProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
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
    const allItems = [
      ...mainNavItems,
      { href: "/tutor/disponibilidad", label: "Disponibilidad y bloques" },
      { href: "/tutor/notificaciones", label: "Notificaciones" },
      { href: "/tutor/perfil", label: "Mi perfil" },
    ];
    const selected = allItems.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    );
    return selected?.label ?? "Tutor Dashboard";
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#F3F4F6] font-sans text-slate-900">
      {/* HEADER DESKTOP & MOBILE */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Left section: Logo & Mobile Menu Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/imports/logo_exito_academico.png"
                alt="Éxito Académico UCN"
                className="h-10 w-auto object-contain"
              />
            </div>
            
            {/* Desktop Navigation */}
            <nav className="ml-8 hidden lg:flex lg:gap-1">
              {mainNavItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/tutor' && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#23415B] text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-[#23415B]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right section: Notifications & Profile Dropdown */}
          <div className="flex items-center gap-2 lg:gap-4">
            <Link
              href="/tutor/notificaciones"
              className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-[#23415B] transition-colors"
              aria-label="Notificaciones"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[#E5742A] ring-2 ring-white"></span>
            </Link>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-2 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#23415B] focus:ring-offset-1 transition-all"
                aria-expanded={isProfileDropdownOpen}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#23415B] text-white">
                  <UserRound className="h-4 w-4" />
                </div>
                <span className="hidden text-sm font-medium text-slate-700 sm:block">Mi Perfil</span>
                <ChevronDown className="h-4 w-4 text-slate-500 hidden sm:block" />
              </button>

              {/* Dropdown Menu */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-slate-100 rounded-lg bg-white shadow-lg ring-1 ring-black/5 focus:outline-none">
                  <div className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">Tutor UCN</p>
                    <p className="truncate text-sm text-slate-500">tutor.ucn@alumnos.ucn.cl</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/tutor/perfil"
                      className="group flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#23415B]"
                      onClick={() => setIsProfileDropdownOpen(false)}
                    >
                      <UserRound className="h-4 w-4 text-slate-400 group-hover:text-[#23415B]" />
                      Editar perfil
                    </Link>
                    <Link
                      href="/tutor/disponibilidad"
                      className="group flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#23415B]"
                      onClick={() => setIsProfileDropdownOpen(false)}
                    >
                      <Clock3 className="h-4 w-4 text-slate-400 group-hover:text-[#23415B]" />
                      Disponibilidad y bloques
                    </Link>
                  </div>
                  <div className="py-1">
                    <button
                      className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      onClick={() => console.log('Cerrar sesión')}
                    >
                      <LogOut className="h-4 w-4 text-red-500" />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE MENU DRAWER */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between px-4 border-b border-slate-100">
              <span className="text-lg font-bold text-[#23415B]">Menu</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-4">
              {mainNavItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/tutor' && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium ${
                      isActive
                        ? "bg-[#23415B] text-white"
                        : "text-slate-600 hover:bg-slate-50 hover:text-[#23415B]"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Page Header (Mobile Only for visual context if needed, but we keep it clean now) */}
        <div className="mb-6 lg:hidden">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{pageTitle}</h1>
        </div>
        
        {children}
      </main>
    </div>
  );
}
