"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
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

const navSections = {
  comercial: [
    {
      href: "/dashboard/ventas/nueva",
      label: "Nueva Venta",
      icon: HiOutlineTicket,
      colorClass: "text-indigo-500",
      activeBg: "bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-500",
    },
    {
      href: "/dashboard/presupuestos",
      label: "Presupuestos",
      icon: HiOutlineDocumentText,
      colorClass: "text-indigo-500",
      activeBg: "bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-500",
    },
    {
      href: "/dashboard/pedidos",
      label: "Pedidos",
      icon: HiOutlineShoppingCart,
      adminOnly: true,
      colorClass: "text-indigo-500",
      activeBg: "bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-500",
    },
    {
      href: "/dashboard/clientes",
      label: "Clientes",
      icon: HiOutlineUsers,
      colorClass: "text-indigo-500",
      activeBg: "bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-500",
    },
    {
      href: "/dashboard/listas-precios",
      label: "Listas de Precios",
      icon: HiOutlineClipboardList,
      colorClass: "text-indigo-500",
      activeBg: "bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-500",
    },
    {
      href: "/dashboard/ventas",
      label: "Historial",
      icon: HiOutlineDocumentText,
      colorClass: "text-indigo-500",
      activeBg: "bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-500",
    },
  ],
  logistica: [
    {
      href: "/dashboard/products",
      label: "Productos",
      icon: HiOutlineTag,
      colorClass: "text-emerald-500",
      activeBg: "bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border-emerald-550",
    },
    {
      href: "/dashboard/inventario",
      label: "Inventario",
      icon: HiOutlineClipboardList,
      colorClass: "text-emerald-500",
      activeBg: "bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border-emerald-550",
    },
    {
      href: "/dashboard/proveedores",
      label: "Proveedores",
      icon: HiOutlineTruck,
      adminOnly: true,
      colorClass: "text-emerald-500",
      activeBg: "bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border-emerald-550",
    },
  ],
  administracion: [
    {
      href: "/dashboard/finanzas",
      label: "Finanzas",
      icon: HiOutlineCash,
      adminOnly: true,
      colorClass: "text-amber-500",
      activeBg: "bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450 border-amber-500",
    },
    {
      href: "/dashboard/cierre",
      label: "Cierre de Caja",
      icon: HiOutlineDocumentReport,
      adminOnly: true,
      colorClass: "text-amber-500",
      activeBg: "bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450 border-amber-500",
    },
    {
      href: "/dashboard/facturas",
      label: "Facturas",
      icon: HiOutlineDocumentText,
      adminOnly: true,
      colorClass: "text-amber-500",
      activeBg: "bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450 border-amber-500",
    },
    {
      href: "/dashboard/graficos",
      label: "Gráficos",
      icon: HiOutlineChartPie,
      adminOnly: true,
      colorClass: "text-amber-500",
      activeBg: "bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450 border-amber-500",
    },
    {
      href: "/dashboard/usuarios",
      label: "Usuarios",
      icon: HiOutlineUserGroup,
      adminOnly: true,
      colorClass: "text-amber-500",
      activeBg: "bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450 border-amber-500",
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
  const [userProfile, setUserProfile] = useState<{
    full_name: string;
    email: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", session.user.id)
          .single();

        setUserProfile({
          full_name: profile?.full_name ?? "Usuario",
          email: session.user.email ?? "",
          role: profile?.role ?? "vendedor",
        });
      }
    };
    fetchUserProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const role = userProfile?.role;
  const isAdmin = role === "administrador";
  // @ts-ignore
  const isSuper = role === "supervendedor";

  const getVisibleLinks = (section: any[]) =>
    section.filter((link) => {
      if (!link.adminOnly) return true;
      if (isAdmin) return true;
      // @ts-ignore
      if (
        isSuper &&
        ["pedidos", "facturas", "reportes"].some((word) =>
          link.href.includes(word)
        )
      )
        return true;
      return false;
    });

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
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-r border-slate-100 dark:border-slate-800/80 transform transition-all duration-350 cubic-bezier(0.4, 0, 0.2, 1) lg:translate-x-0 lg:static lg:h-screen lg:shadow-none shadow-2xl flex flex-col
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        ${isCollapsed ? "lg:w-[76px]" : "lg:w-64"} w-64`}
      >
        {/* Header (Logo) */}
        <div className="flex items-center justify-between px-5 border-b border-slate-100 dark:border-slate-800/60 h-16 flex-shrink-0">
          {!isCollapsed ? (
            <Link
              href="/dashboard"
              className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2"
            >
              <img
                src="/favicon.png"
                alt="FrontStock Logo"
                className="w-7 h-7 object-contain rounded-lg shadow-sm"
              />
              <span>FrontStock</span>
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="flex items-center justify-center mx-auto"
            >
              <img
                src="/favicon.png"
                alt="FrontStock Logo"
                className="w-7 h-7 object-contain rounded-lg shadow-sm"
              />
            </Link>
          )}

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto py-5 px-3 space-y-5 scrollbar-none overflow-x-hidden">
          
          {/* Dashboard Link */}
          <div>
            <Link
              href="/dashboard"
              onClick={onClose}
              title={isCollapsed ? "Dashboard" : ""}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 border-l-2 group
                ${
                  pathname === "/dashboard"
                    ? "bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-600 font-bold"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-800 dark:hover:text-slate-205 border-transparent"
                } ${isCollapsed ? "justify-center border-l-0" : ""}`}
            >
              <HiOutlineChartPie
                className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-105 ${
                  pathname === "/dashboard"
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-350"
                }`}
              />
              {!isCollapsed && <span className="text-xs font-semibold">Dashboard</span>}
            </Link>
          </div>

          {/* Comercial */}
          <div className="space-y-1">
            {!isCollapsed && (
              <h3 className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                Comercial
              </h3>
            )}
            {isCollapsed && (
              <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-2 mx-1"></div>
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
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 border-l-2 group
                    ${
                      isActive
                        ? link.activeBg + " font-bold"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-800 dark:hover:text-slate-205 border-transparent"
                    } ${isCollapsed ? "justify-center border-l-0" : ""}`}
                  >
                    <Icon
                      className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-105 ${
                        isActive
                          ? "text-indigo-600 dark:text-indigo-405"
                          : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-350"
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="text-xs font-semibold whitespace-nowrap">{link.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Logistica */}
          <div className="space-y-1">
            {!isCollapsed && (
              <h3 className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                Logística
              </h3>
            )}
            {isCollapsed && (
              <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-2 mx-1"></div>
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
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 border-l-2 group
                    ${
                      isActive
                        ? link.activeBg + " font-bold"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-800 dark:hover:text-slate-205 border-transparent"
                    } ${isCollapsed ? "justify-center border-l-0" : ""}`}
                  >
                    <Icon
                      className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-105 ${
                        isActive
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-350"
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="text-xs font-semibold whitespace-nowrap">{link.label}</span>
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
                <h3 className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                  Administración
                </h3>
              )}
              {isCollapsed && (
                <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-2 mx-1"></div>
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
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 border-l-2 group
                      ${
                        isActive
                          ? link.activeBg + " font-bold"
                          : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-800 dark:hover:text-slate-205 border-transparent"
                      } ${isCollapsed ? "justify-center border-l-0" : ""}`}
                    >
                      <Icon
                        className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-105 ${
                          isActive
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-350"
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="text-xs font-semibold whitespace-nowrap">{link.label}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* User Footer Panel */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 flex-shrink-0">
          <div className="flex flex-col gap-3">
            
            {/* User Profile Summary */}
            <div
              className={`flex items-center gap-2.5 px-1.5 py-1 ${
                isCollapsed ? "justify-center" : ""
              }`}
            >
              <div className="w-8 h-8 flex-shrink-0 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shadow-sm">
                {userProfile?.full_name?.charAt(0).toUpperCase() || "U"}
              </div>
              
              {!isCollapsed && (
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate">
                    {userProfile?.full_name}
                  </p>
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                    {role === "administrador" ? "Administrador" : "Vendedor"}
                  </p>
                </div>
              )}
              
              {!isCollapsed && (
                <div className="flex-shrink-0">
                  <ThemeToggle />
                </div>
              )}
            </div>

            {isCollapsed && (
              <div className="flex justify-center">
                <ThemeToggle />
              </div>
            )}

            {/* Bottom Actions Grid */}
            {!isCollapsed ? (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/dashboard/configuracion"
                  onClick={onClose}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-850 dark:hover:text-white bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border transition-all"
                >
                  <HiOutlineCog className="w-3.5 h-3.5 text-slate-400" />
                  Ajustes
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50/50 hover:bg-rose-100 dark:bg-rose-950/15 dark:hover:bg-rose-950/30 border border-rose-100/50 dark:border-rose-900/30 transition-all"
                >
                  <HiOutlineLogout className="w-3.5 h-3.5" />
                  Cerrar
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Link
                  href="/dashboard/configuracion"
                  onClick={onClose}
                  title="Configuración"
                  className="flex items-center justify-center p-2 rounded-lg text-slate-450 hover:text-slate-750 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <HiOutlineCog className="w-4 h-4" />
                </Link>
                <button
                  onClick={handleLogout}
                  title="Cerrar Sesión"
                  className="flex items-center justify-center p-2 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-950/10 transition-colors"
                >
                  <HiOutlineLogout className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Desktop Collapse Toggle */}
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex items-center justify-center p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-205 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl transition-colors mx-auto mt-1"
              title={isCollapsed ? "Expandir" : "Colapsar"}
            >
              {isCollapsed ? (
                <HiOutlineChevronRight className="w-4 h-4" />
              ) : (
                <HiOutlineChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
