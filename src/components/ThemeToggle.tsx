"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <button className="p-2 rounded-lg bg-gray-100 dark:bg-slate-900 text-gray-500 dark:text-slate-400">
                <span className="sr-only">Cargando tema</span>
                <div className="w-5 h-5" />
            </button>
        )
    }

    const isDark = resolvedTheme === "dark"

    return (
        <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="p-2 rounded-lg bg-gray-100 dark:bg-slate-900 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-800/80 transition-colors text-gray-800 dark:text-slate-200"
            aria-label="Alternar tema"
        >
            {isDark ? (
                <Sun className="h-5 w-5" />
            ) : (
                <Moon className="h-5 w-5" />
            )}
        </button>
    )
}
