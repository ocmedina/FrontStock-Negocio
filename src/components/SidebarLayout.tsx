"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import UpdatesNotification from "./UpdatesNotification";
import { HiMenu } from "react-icons/hi";
import Link from "next/link";

export default function SidebarLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
            {/* Sidebar Component */}
            <Sidebar
                isOpen={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
                isCollapsed={isCollapsed}
                toggleCollapse={() => setIsCollapsed(!isCollapsed)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="p-2 -ml-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <HiMenu className="w-6 h-6" />
                        </button>
                        <Link
                            href="/dashboard"
                            className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-outfit"
                        >
                            FrontStock
                        </Link>
                    </div>
                </header>

                {/* Scrollable Page Content */}
                <main
                    className={`flex-1 scroll-smooth ${
                        isCollapsed ? "lg:pl-20" : "lg:pl-72"
                    }`}
                >
                    <div className="w-full p-4 sm:p-6 lg:p-8">
                        {children}
                    </div>
                </main>

                {/* Updates Notification (Toast) */}
                <UpdatesNotification />
            </div>
        </div>
    );
}
