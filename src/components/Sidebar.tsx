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
  HiOutlineClipboardList,
  HiOutlineTruck,
  HiOutlineCog,
  HiX,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineCash,
} from "react-icons/hi";
import { ThemeToggle } from "@/components/ThemeToggle";

// Organizamos los enlaces por categorías
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

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  isCollapsed,
  toggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, role, can } = useAuth();

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

  // Roles
  const isAdmin = role === "administrador";
  const isSuper = role === "supervendedor";
  const canSeeDashboard =
    can("VER_DASHBOARD_COMPLETO") || can("VER_DASHBOARD_LIMITADO");

  // Filtro de visibilidad
  const getVisibleLinks = (section: any[]) =>
    section.filter((link) => {
      if (!link.permission) return true;
      return can(link.permission);
    });

  const roleLabel = isAdmin
    ? "Admin"
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

    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:h-screen lg:shadow-none shadow-2xl flex flex-col
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        ${isCollapsed ? "lg:w-20" : "lg:w-72"} w-72`}
      >
        {/* Header (Logo) */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800 h-20">
          {!isCollapsed ? (
            <Link
              href="/dashboard"
              className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all font-outfit tracking-tight whitespace-nowrap overflow-hidden"
            >
              FrontStock
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-outfit mx-auto"
            >
              FS
            </Link>
          )}

          <button
            onClick={onClose}
            className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <HiX className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 py-6 px-3 space-y-6 overflow-x-hidden">
          {/* Dashboard Link */}
          {canSeeDashboard && (
            <div>
              <Link
                href="/dashboard"
                onClick={onClose}
                title={isCollapsed ? "Dashboard" : ""}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                  ${
                    pathname === "/dashboard"
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold shadow-sm ring-1 ring-blue-100 dark:ring-blue-800"
                      : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-200"
                  } ${isCollapsed ? "justify-center" : ""}`}
              >
                <HiOutlineChartPie
                  className={`w-6 h-6 flex-shrink-0 ${
                    pathname === "/dashboard"
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-400 group-hover:text-gray-600 dark:text-slate-500 dark:group-hover:text-slate-300"
                  }`}
                />
                {!isCollapsed && <span>Dashboard</span>}
              </Link>
            </div>
          )}

          {/* Comercial */}
          <div className="space-y-1">
            {!isCollapsed && (
              <h3 className="px-3 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2 transition-opacity duration-200">
                Comercial
              </h3>
            )}
            {isCollapsed && (
              <div className="h-px bg-gray-100 dark:bg-slate-800 my-2 mx-2"></div>
            )}
            <div className="space-y-1">
              {getVisibleLinks(navSections.comercial).map((link) => {
                const Icon = link.icon;
                const isActive = isLinkActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onClose}
                    title={isCollapsed ? link.label : ""}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group
                    ${
                      isActive
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold"
                        : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-200"
                    } ${isCollapsed ? "justify-center" : ""}`}
                  >
                    <Icon
                      className={`w-5 h-5 flex-shrink-0 ${
                        isActive
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-gray-400 group-hover:text-gray-600 dark:text-slate-500 dark:group-hover:text-slate-300"
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="whitespace-nowrap">{link.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Logistica */}
          <div className="space-y-1">
            {!isCollapsed && (
              <h3 className="px-3 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2 transition-opacity duration-200">
                Logística
              </h3>
            )}
            {isCollapsed && (
              <div className="h-px bg-gray-100 dark:bg-slate-800 my-2 mx-2"></div>
            )}
            <div className="space-y-1">
              {getVisibleLinks(navSections.logistica).map((link) => {
                const Icon = link.icon;
                const isActive = isLinkActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onClose}
                    title={isCollapsed ? link.label : ""}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group
                    ${
                      isActive
                        ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-semibold"
                        : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-200"
                    } ${isCollapsed ? "justify-center" : ""}`}
                  >
                    <Icon
                      className={`w-5 h-5 flex-shrink-0 ${
                        isActive
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-400 group-hover:text-gray-600 dark:text-slate-500 dark:group-hover:text-slate-300"
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="whitespace-nowrap">{link.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Administracion */}
          {getVisibleLinks(navSections.administracion).length > 0 && (
            <div className="space-y-1">
              {!isCollapsed && (
                <h3 className="px-3 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2 transition-opacity duration-200">
                  Administración
                </h3>
              )}
              {isCollapsed && (
                <div className="h-px bg-gray-100 dark:bg-slate-800 my-2 mx-2"></div>
              )}
              <div className="space-y-1">
                {getVisibleLinks(navSections.administracion).map((link) => {
                  const Icon = link.icon;
                  const isActive = isLinkActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={onClose}
                      title={isCollapsed ? link.label : ""}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group
                      ${
                        isActive
                          ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-semibold"
                          : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-200"
                      } ${isCollapsed ? "justify-center" : ""}`}
                    >
                      <Icon
                        className={`w-5 h-5 flex-shrink-0 ${
                          isActive
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-gray-400 group-hover:text-gray-600 dark:text-slate-500 dark:group-hover:text-slate-300"
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="whitespace-nowrap">{link.label}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col gap-4">
            {/* User Info */}
            <div
              className={`flex items-center gap-3 px-2 ${
                isCollapsed ? "justify-center" : ""
              }`}
            >
              <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                {profile?.full_name?.charAt(0).toUpperCase() || "U"}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">
                    {profile?.full_name}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium truncate">
                    {roleLabel}
                  </p>
                </div>
              )}
              {!isCollapsed && <ThemeToggle />}
            </div>

            {isCollapsed && (
              <div className="flex justify-center">
                <ThemeToggle />
              </div>
            )}

            {/* Actions */}
            {!isCollapsed ? (
              <div className="grid grid-cols-2 gap-2">
                {can("VER_CONFIGURACION") && (
                  <Link
                    href="/dashboard/configuracion"
                    onClick={onClose}
                    className="flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-medium text-gray-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
                  >
                    <HiOutlineCog className="w-4 h-4" />
                    Config
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                >
                  <HiOutlineLogout className="w-4 h-4" />
                  Salir
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogout}
                title="Cerrar Sesión"
                className="flex items-center justify-center p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              >
                <HiOutlineLogout className="w-5 h-5" />
              </button>
            )}

            {/* Desktop Collapse Toggle */}
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex items-center justify-center p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors mx-auto"
              title={isCollapsed ? "Expandir" : "Colapsar"}
            >
              {isCollapsed ? (
                <HiOutlineChevronRight className="w-5 h-5" />
              ) : (
                <HiOutlineChevronLeft className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
