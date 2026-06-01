"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import UpdatesNotification from "./UpdatesNotification";
import MobileBottomNav from "./MobileBottomNav";

export default function SidebarLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

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

                {/* Scrollable Page Content */}
                <main
                    className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 lg:pb-8 scroll-smooth"
                    style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 104px)" }}
                >
                    <div className="w-full min-h-full flex flex-col">
                        {children}
                    </div>
                </main>

                {/* Updates Notification (Toast) */}
                <UpdatesNotification />
                {!mobileMenuOpen && (
                    <MobileBottomNav onOpenMenu={() => setMobileMenuOpen(true)} />
                )}
            </div>
        </div>
    );
}
