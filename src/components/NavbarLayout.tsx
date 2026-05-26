"use client";

import Navbar from "./Navbar";
import UpdatesNotification from "./UpdatesNotification";

export default function NavbarLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col">
            {/* Top Navbar */}
            <Navbar />

            {/* Main Content Area */}
            <main
                className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
                style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 104px)" }}
            >
                {children}
            </main>

            {/* Updates Notification */}
            <UpdatesNotification />
        </div>
    );
}
