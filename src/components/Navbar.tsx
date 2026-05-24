"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import {
  HiOutlineChartPie,
  HiOutlineDocumentText,
  HiOutlineShoppingCart,
  HiOutlineTag,
  HiOutlineTicket,
  HiOutlineUsers,
  HiOutlineLogout,
  HiOutlineDocumentReport,
  HiOutlineUserGroup,
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineCog,
  HiOutlineTruck,
  HiOutlineArchive,
  HiOutlineClipboardList,
  HiOutlineCash,
} from "react-icons/hi";
import { ThemeToggle } from "@/components/ThemeToggle";

// Organizamos los enlaces por categorías (NUEVA ESTRUCTURA SIMPLIFICADA)
const navSections = {
  comercial: [
    {
      href: "/dashboard/ventas/nueva",
      label: "Nueva Venta",
      icon: HiOutlineTicket,
      permission: "CREAR_VENTAS",
    },
    {
      href: "/dashboard/presupuestos",
      label: "Presupuestos",
      icon: HiOutlineDocumentText,
      permission: "VER_PRESUPUESTOS",
    },
    {
      href: "/dashboard/pedidos",
      label: "Pedidos",
      icon: HiOutlineShoppingCart,
      permission: "VER_PEDIDOS",
    },
    {
      href: "/dashboard/clientes",
      label: "Clientes",
      icon: HiOutlineUsers,
      permission: "VER_CLIENTES",
    },
    {
      href: "/dashboard/ventas",
      label: "Historial",
      icon: HiOutlineDocumentText,
      permission: "VER_VENTAS",
    },
  ],
  logistica: [
    {
      href: "/dashboard/products",
      label: "Productos",
      icon: HiOutlineTag,
      permission: "VER_PRODUCTOS",
    },
    {
      href: "/dashboard/inventario",
      label: "Inventario",
      icon: HiOutlineClipboardList,
      permission: "VER_INVENTARIO",
    },
    {
      href: "/dashboard/proveedores",
      label: "Proveedores",
      icon: HiOutlineTruck,
      permission: "VER_PROVEEDORES",
    },
  ],
  administracion: [
    {
      href: "/dashboard/finanzas",
      label: "Finanzas",
      icon: HiOutlineCash, // WARNING: Make sure to import this icon
      permission: "VER_FINANZAS",
    },
    {
      href: "/dashboard/cierre",
      label: "Cierre de Caja",
      icon: HiOutlineDocumentReport,
      permission: "VER_CIERRE",
    },
    {
      href: "/dashboard/facturas",
      label: "Facturas",
      icon: HiOutlineDocumentText,
      permission: "VER_FACTURAS",
    },
    {
      href: "/dashboard/reportes",
      label: "Reportes",
      icon: HiOutlineDocumentReport,
      permission: "VER_REPORTES",
    },
    {
      href: "/dashboard/usuarios",
      label: "Usuarios",
      icon: HiOutlineUserGroup,
      permission: "VER_USUARIOS",
    },
  ],
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { profile, user, role, can } = useAuth();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        await supabase.auth.signOut({ scope: "local" });
      }
    } catch (error) {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // ignore logout cleanup errors
      }
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  const isAdmin = role === "administrador";
  const isSuper = role === "supervendedor";
  const canSeeDashboard =
    can("VER_DASHBOARD_COMPLETO") || can("VER_DASHBOARD_LIMITADO");

  // Filtro de visibilidad según rol
  const getVisibleLinks = (section: any[]) =>
    section.filter((link) => {
      if (!link.permission) return true;
      return can(link.permission);
    });

  const roleLabel = isAdmin
    ? "Administrador"
    : isSuper
      ? "Supervendedor"
      : role === "repartidor"
        ? "Repartidor"
        : "Vendedor";

  const isLinkActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    if (
      href.endsWith("/ventas") &&
      (pathname.startsWith("/dashboard/ventas/nueva") ||
        pathname.startsWith("/dashboard/ventas/"))
    )
      return false;
    if (
      href.endsWith("/pedidos") &&
      (pathname.startsWith("/dashboard/pedidos/nuevo") ||
        pathname.startsWith("/dashboard/pedidos/edit"))
    )
      return false;
    if (
      href.endsWith("/compras") &&
      pathname.startsWith("/dashboard/compras/nueva")
    )
      return false;

    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav className="bg-white dark:bg-slate-900 shadow-md border-b border-gray-200 dark:border-slate-700 sticky top-0 z-50">
      <div className="w-full px-2 sm:px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo y Dashboard */}
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all whitespace-nowrap"
            >
              FrontStock
            </Link>
            {canSeeDashboard && (
              <Link
                href="/dashboard"
                className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${pathname === "/dashboard"
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800/80"
                  }`}
              >
                <HiOutlineChartPie className="h-4 w-4" />
                Dashboard
              </Link>
            )}
          </div>

          {/* Navigation Links - Desktop */}
          <div className="hidden lg:flex items-center gap-0.5 flex-1 justify-center max-w-6xl mx-2">
            <div className="flex items-center gap-0.5 flex-wrap justify-center">
              {/* 1. COMERCIAL (Azul) */}
              <div className="flex items-center gap-0.5 px-1 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 mb-1">
                {getVisibleLinks(navSections.comercial).map((link) => {
                  const Icon = link.icon;
                  const isActive = isLinkActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap
                      ${isActive
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                        }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden xl:inline">{link.label}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="w-px h-5 bg-gray-300 dark:bg-slate-600 mx-0.5" />

              {/* 2. LOGÍSTICA (Verde) */}
              <div className="flex items-center gap-0.5 px-1 py-1 rounded-lg bg-green-50 dark:bg-green-950/30 mb-1">
                {getVisibleLinks(navSections.logistica).map((link) => {
                  const Icon = link.icon;
                  const isActive = isLinkActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap
                      ${isActive
                          ? "bg-green-600 text-white shadow-sm"
                          : "text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50"
                        }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden xl:inline">{link.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* 3. ADMINISTRACIÓN (Naranja) */}
              {getVisibleLinks(navSections.administracion).length > 0 && (
                <>
                  <div className="w-px h-5 bg-gray-300 mx-0.5" />
                  <div className="flex items-center gap-0.5 px-1 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/30 mb-1">
                    {getVisibleLinks(navSections.administracion).map((link) => {
                      const Icon = link.icon;
                      const isActive = isLinkActive(link.href);
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap
                          ${isActive
                              ? "bg-orange-600 text-white shadow-sm"
                              : "text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50"
                            }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span className="hidden xl:inline">{link.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* User Menu - Desktop */}
          <div className="hidden lg:flex items-center gap-2 relative flex-shrink-0">
            <ThemeToggle />
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                {profile?.full_name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="text-left hidden xl:block">
                <p className="text-xs font-semibold text-gray-800 dark:text-slate-100 leading-tight">
                  {profile?.full_name}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400">
                  {/* @ts-ignore */}
                  {roleLabel}
                </p>
              </div>
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 py-1 z-20">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                    <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                      {profile?.full_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      {profile?.email || user?.email}
                    </p>
                    <p className="text-xs text-blue-600 mt-1 font-medium">
                      {/* @ts-ignore */}
                      {roleLabel}
                    </p>
                  </div>
                  {can("VER_CONFIGURACION") && (
                    <Link
                      href="/dashboard/configuracion"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 dark:bg-slate-950 transition-colors"
                    >
                      <HiOutlineCog className="h-4 w-4" />
                      Configuración
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <HiOutlineLogout className="h-4 w-4" />
                    Cerrar Sesión
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Botón menú móvil */}
          <div className="lg:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800/80 dark:bg-slate-800 dark:hover:bg-slate-800/80"
            >
              {mobileMenuOpen ? (
                <HiOutlineX className="h-6 w-6" />
              ) : (
                <HiOutlineMenu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Menú móvil desplegable */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 pb-4">
            <div className="px-2 py-3 space-y-3 max-h-[calc(100vh-4rem)] overflow-y-auto">
              {/* Dashboard en móvil */}
              {canSeeDashboard && (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${pathname === "/dashboard"
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                    }`}
                >
                  <HiOutlineChartPie className="h-5 w-5" />
                  Dashboard
                </Link>
              )}

              {/* Sección Comercial */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-blue-600 uppercase px-3 mb-1">
                  Comercial
                </p>
                {getVisibleLinks(navSections.comercial).map((link) => {
                  const Icon = link.icon;
                  const isActive = isLinkActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${isActive
                          ? "bg-blue-600 text-white"
                          : "text-gray-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        }`}
                    >
                      <Icon className="h-5 w-5" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              {/* Sección Logística */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-green-600 uppercase px-3 mb-1">
                  Logística
                </p>
                {getVisibleLinks(navSections.logistica).map((link) => {
                  const Icon = link.icon;
                  const isActive = isLinkActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${isActive
                          ? "bg-green-600 text-white"
                          : "text-gray-700 dark:text-slate-200 hover:bg-green-50 dark:hover:bg-green-900/30"
                        }`}
                    >
                      <Icon className="h-5 w-5" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              {/* Sección Administración */}
              {getVisibleLinks(navSections.administracion).length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-orange-600 uppercase px-3 mb-1">
                    Administración
                  </p>
                  {getVisibleLinks(navSections.administracion).map((link) => {
                    const Icon = link.icon;
                    const isActive = isLinkActive(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                          ${isActive
                            ? "bg-orange-600 text-white"
                            : "text-gray-700 dark:text-slate-200 hover:bg-orange-50 dark:hover:bg-orange-900/30"
                          }`}
                      >
                        <Icon className="h-5 w-5" />
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Usuario y Configuración */}
              <div className="pt-3 border-t border-gray-200 dark:border-slate-700 space-y-1">
                <div className="px-3 py-2 bg-gray-50 dark:bg-slate-950 rounded-lg">
                  <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                    {profile?.full_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    {profile?.email || user?.email}
                  </p>
                  <p className="text-xs text-blue-600 mt-1 font-medium">
                    {/* @ts-ignore */}
                    {roleLabel}
                  </p>
                </div>

                {can("VER_CONFIGURACION") && (
                  <Link
                    href="/dashboard/configuracion"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800/80 dark:bg-slate-800 transition-colors"
                  >
                    <HiOutlineCog className="h-5 w-5" />
                    Configuración
                  </Link>
                )}

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <HiOutlineLogout className="h-5 w-5" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
