"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaClipboardList, FaBoxes, FaUsers, FaBars } from "react-icons/fa";

interface MobileBottomNavProps {
  onOpenMenu: () => void;
}

const navItems = [
  {
    label: "Pedidos",
    href: "/dashboard/pedidos",
    Icon: FaClipboardList,
  },
  {
    label: "Productos",
    href: "/dashboard/products",
    Icon: FaBoxes,
  },
  {
    label: "Clientes",
    href: "/dashboard/clientes",
    Icon: FaUsers,
  },
];

export default function MobileBottomNav({ onOpenMenu }: MobileBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white/90 dark:bg-slate-950/90 backdrop-blur border-t border-gray-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-3 my-3 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl border border-white/10">
        <div className="grid grid-cols-4 items-center">
          {navItems.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-3 text-xs font-semibold transition-all ${
                  isActive
                    ? "text-amber-300"
                    : "text-slate-200 hover:text-white"
                }`}
              >
                <item.Icon className={`text-base ${isActive ? "text-amber-300" : "text-slate-300"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={onOpenMenu}
            className="flex flex-col items-center gap-1 py-3 text-xs font-semibold text-slate-200 hover:text-white transition-all"
            aria-label="Abrir menu"
          >
            <FaBars className="text-base text-slate-300" />
            <span>Menu</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
