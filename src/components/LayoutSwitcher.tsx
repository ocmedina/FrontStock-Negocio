"use client";

import { useLayout } from "@/contexts/LayoutContext";
import SidebarLayout from "./SidebarLayout";
import NavbarLayout from "./NavbarLayout";
import { usePathname } from "next/navigation";

export default function LayoutSwitcher({
    children,
}: {
    children: React.ReactNode;
}) {
    const { layout, isLoading } = useLayout();
    const pathname = usePathname();

    // Mientras carga la preferencia, mostramos un estado vacío o un loader mínimo
    // para evitar "fouc" (flash of unstyled content) o movimientos bruscos.
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 bg-gray-200 dark:bg-slate-800 rounded-full mb-4"></div>
                    <div className="h-4 w-32 bg-gray-200 dark:bg-slate-800 rounded"></div>
                </div>
            </div>
        );
    }

    if (layout === "navbar") {
        return <NavbarLayout>{children}</NavbarLayout>;
    }

    // Por defecto Sidebar
    return <SidebarLayout>{children}</SidebarLayout>;
}
