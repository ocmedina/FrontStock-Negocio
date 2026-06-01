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
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineCog,
  HiOutlineTruck,
  HiOutlineClipboardList,
  HiOutlineCash,
} from "react-icons/hi";
import { ThemeToggle } from "@/components/ThemeToggle";

const navSections = {
  comercial: [
    {
      href: "/dashboard/ventas/nueva",
      label: "Nueva Venta",
      icon: HiOutlineTicket,
    },
    {
      href: "/dashboard/presupuestos",
      label: "Presupuestos",
      icon: HiOutlineDocumentText,
    },
    {
      href: "/dashboard/pedidos",
      label: "Pedidos",
      icon: HiOutlineShoppingCart,
      adminOnly: true,
    },
    { href: "/dashboard/clientes", label: "Clientes", icon: HiOutlineUsers },
    {
      href: "/dashboard/ventas",
      label: "Historial",
      icon: HiOutlineDocumentText,
    },
  ],
  logistica: [
    { href: "/dashboard/products", label: "Productos", icon: HiOutlineTag },
    {
      href: "/dashboard/inventario",
      label: "Inventario",
      icon: HiOutlineClipboardList,
    },
    {
      href: "/dashboard/proveedores",
      label: "Proveedores",
      icon: HiOutlineTruck,
      adminOnly: true,
    },
  ],
  administracion: [
    {
      href: "/dashboard/finanzas",
      label: "Finanzas",
      icon: HiOutlineCash,
      adminOnly: true,
    },
    {
      href: "/dashboard/reportes",
      label: "Cierre de Caja",
      icon: HiOutlineDocumentReport,
      adminOnly: true,
    },
    {
      href: "/dashboard/facturas",
      label: "Facturas",
      icon: HiOutlineDocumentText,
      adminOnly: true,
    },
    {
      href: "/dashboard/graficos",
      label: "Gráficos",
      icon: HiOutlineChartPie,
      adminOnly: true,
    },
    {
      href: "/dashboard/usuarios",
      label: "Usuarios",
      icon: HiOutlineUserGroup,
      adminOnly: true,
    },
  ],
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<{
    full_name: string;
    email: string;
    role: string;
  } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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

  // Compile all links for unified desktop render
  const allLinks = [
    { category: "Comercial", links: getVisibleLinks(navSections.comercial) },
    { category: "Logística", links: getVisibleLinks(navSections.logistica) },
    { category: "Administración", links: getVisibleLinks(navSections.administracion) },
  ];

  return (
    <nav className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-150 dark:border-slate-800/80 sticky top-0 z-50 h-14 flex items-center shadow-sm">
      <div className="w-full px-4 max-w-[1550px] mx-auto">
        <div className="flex items-center justify-between h-14">
          
          {/* Logo y Dashboard */}
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-base font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2"
            >
              <img
                src="/favicon.png"
                alt="FrontStock Logo"
                className="w-7 h-7 object-contain rounded-lg shadow-sm"
              />
              <span className="hidden sm:inline">FrontStock</span>
            </Link>
            
            <Link
              href="/dashboard"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors
                ${pathname === "/dashboard"
                  ? "bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-850 dark:hover:text-slate-200"
                }`}
            >
              <HiOutlineChartPie className="h-4 w-4" />
              <span>Panel</span>
            </Link>
          </div>

          {/* Navigation Links - Desktop Unified (No color columns blocks) */}
          <div className="hidden lg:flex items-center gap-1.5 max-w-6xl mx-4 overflow-x-auto scrollbar-none">
            {allLinks.map((catGroup) => {
              if (catGroup.links.length === 0) return null;
              return (
                <div key={catGroup.category} className="flex items-center gap-1 border-r border-slate-100 dark:border-slate-800/50 pr-2 last:border-0 last:pr-0">
                  {catGroup.links.map((link) => {
                    const Icon = link.icon;
                    const isActive = isLinkActive(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap
                          ${isActive
                            ? "bg-indigo-600 text-white shadow-sm font-bold"
                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-855 dark:hover:text-slate-200"
                          }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* User Menu - Desktop */}
          <div className="hidden lg:flex items-center gap-2 relative flex-shrink-0">
            <ThemeToggle />
            
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border transition-all"
            >
              <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                {userProfile?.full_name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="text-left leading-none">
                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  {userProfile?.full_name}
                </p>
                <p className="text-[9px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                  {role === "administrador" ? "Admin" : "Vendedor"}
                </p>
              </div>
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 py-1.5 z-20 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {userProfile?.full_name}
                    </p>
                    <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-0.5 truncate">
                      {userProfile?.email}
                    </p>
                    <span className="inline-block px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 rounded-lg text-3xs font-extrabold border mt-2">
                      {role === "administrador" ? "Administrador" : "Vendedor"}
                    </span>
                  </div>
                  
                  <Link
                    href="/dashboard/configuracion"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <HiOutlineCog className="h-4 w-4 text-slate-400" />
                    Configuración
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/15 transition-colors border-t dark:border-slate-800"
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
              className="p-1.5 rounded-xl text-slate-550 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-805 border transition-all"
            >
              {mobileMenuOpen ? (
                <HiOutlineX className="h-5 w-5" />
              ) : (
                <HiOutlineMenu className="h-5 w-5" />
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Menú móvil desplegable */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-150 dark:border-slate-800 shadow-xl max-h-[calc(100vh-3.5rem)] overflow-y-auto z-40 p-4">
          <div className="space-y-4">
            
            {/* Dashboard Link */}
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors border-l-2
                ${pathname === "/dashboard"
                  ? "bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-600"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent"
                }`}
            >
              <HiOutlineChartPie className="h-4 w-4" />
              Dashboard
            </Link>

            {/* Comercial */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest px-3.5 block">
                Comercial
              </span>
              <div className="space-y-1">
                {getVisibleLinks(navSections.comercial).map((link) => {
                  const Icon = link.icon;
                  const isActive = isLinkActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors border-l-2
                        ${isActive
                          ? "bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-600"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 border-transparent"
                        }`}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Logística */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest px-3.5 block">
                Logística
              </span>
              <div className="space-y-1">
                {getVisibleLinks(navSections.logistica).map((link) => {
                  const Icon = link.icon;
                  const isActive = isLinkActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors border-l-2
                        ${isActive
                          ? "bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border-emerald-500"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 border-transparent"
                        }`}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Administración */}
            {getVisibleLinks(navSections.administracion).length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest px-3.5 block">
                  Administración
                </span>
                <div className="space-y-1">
                  {getVisibleLinks(navSections.administracion).map((link) => {
                    const Icon = link.icon;
                    const isActive = isLinkActive(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors border-l-2
                          ${isActive
                            ? "bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450 border-amber-500"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 border-transparent"
                          }`}
                      >
                        <Icon className="h-4 w-4" />
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Perfil del Usuario Móvil */}
            <div className="pt-4 border-t border-slate-150 dark:border-slate-800 space-y-2">
              <div className="px-3.5 py-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shadow-sm">
                  {userProfile?.full_name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {userProfile?.full_name}
                  </p>
                  <p className="text-[10px] text-slate-450 dark:text-slate-400 truncate max-w-[200px]">
                    {userProfile?.email}
                  </p>
                </div>
              </div>

              <Link
                href="/dashboard/configuracion"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
              >
                <HiOutlineCog className="h-4 w-4 text-slate-400" />
                Configuración
              </Link>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/15 transition-colors text-left"
              >
                <HiOutlineLogout className="h-4 w-4" />
                Cerrar Sesión
              </button>
            </div>

          </div>
        </div>
      )}
    </nav>
  );
}
