"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import MobileBottomNav from "./MobileBottomNav";
import TimeWeatherIndicator from "./TimeWeatherIndicator";
import MaintenanceBanner from "./MaintenanceBanner";
import SystemUpdatesModal from "./SystemUpdatesModal";
import PassiveMaintenanceBadge from "./PassiveMaintenanceBadge";
import { HiSparkles } from "react-icons/hi";

// Sidebar Layout Component with System Updates Modal integration

export default function SidebarLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showUpdatesModal, setShowUpdatesModal] = useState(false);

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden">
            {/* Sidebar Component */}
            <Sidebar
                isOpen={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
                isCollapsed={isCollapsed}
                toggleCollapse={() => setIsCollapsed(!isCollapsed)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Maintenance Banner */}
                <MaintenanceBanner />

                {/* Desktop top header utility bar */}
                <header className="hidden lg:flex bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-150 dark:border-slate-800/80 h-16 items-center justify-between px-8 shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowUpdatesModal(true)}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 hover:from-amber-500/20 hover:to-indigo-500/20 dark:bg-slate-800 border border-indigo-500/30 rounded-xl text-xs font-black text-indigo-600 dark:text-indigo-400 transition-all flex items-center gap-2 shadow-xs group"
                        >
                            <HiSparkles className="text-amber-400 animate-pulse group-hover:rotate-12 transition-transform text-base" />
                            <span>Novedades del Sistema v2.6</span>
                            <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded-full text-[9px] font-black uppercase">Nuevo</span>
                        </button>

                        {/* Cartel de Mantenimiento Pasivo */}
                        <PassiveMaintenanceBadge />
                    </div>

                    <div className="flex items-center gap-4">
                        <TimeWeatherIndicator />
                    </div>
                </header>

                {/* Scrollable Page Content */}
                <main
                    className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 lg:pb-8 scroll-smooth"
                    style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 104px)" }}
                >
                    <div className="w-full min-h-full flex flex-col">
                        {children}
                    </div>
                </main>

                {/* System Updates Modal (Automatic & Manual) */}
                <SystemUpdatesModal
                    forceOpen={showUpdatesModal}
                    onClose={() => setShowUpdatesModal(false)}
                />

                {!mobileMenuOpen && (
                    <MobileBottomNav onOpenMenu={() => setMobileMenuOpen(true)} />
                )}
            </div>
        </div>
    );
}
