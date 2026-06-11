"use client";

import Image from "next/image";

interface CustomLoaderProps {
    size?: number; // Tamaño total del loader en píxeles (default 100)
    text?: string; // Texto opcional debajo del loader
}

export default function CustomLoader({ size = 100, text }: CustomLoaderProps) {
    const ringSize = size;
    const innerSize = Math.round(size * 0.55);

    return (
        <div className="flex flex-col items-center justify-center p-6 select-none">
            <div className="relative flex items-center justify-center" style={{ width: ringSize, height: ringSize }}>
                {/* Glow Background */}
                <div className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-400/5 rounded-full blur-2xl transform scale-150 pointer-events-none"></div>

                {/* Outer Ring base */}
                <div 
                    className="absolute rounded-full border-4 border-slate-100 dark:border-slate-800/40"
                    style={{ width: ringSize, height: ringSize }}
                ></div>
                {/* Outer Ring Active (Clockwise) */}
                <div 
                    className="absolute rounded-full border-4 border-transparent border-t-indigo-500 border-r-indigo-500/30 animate-spin-cw"
                    style={{ width: ringSize, height: ringSize }}
                ></div>

                {/* Inner Ring Active (Counter-Clockwise) */}
                <div 
                    className="absolute rounded-full border-4 border-transparent border-b-amber-500 border-l-amber-500/30 animate-spin-ccw"
                    style={{ width: ringSize - 12, height: ringSize - 12 }}
                ></div>

                {/* Pulsing Central Logo */}
                <div 
                    className="relative animate-breathe flex items-center justify-center"
                    style={{ width: innerSize, height: innerSize }}
                >
                    <Image
                        src="/Carga.png.png" // Using double extension as found in original implementation
                        alt="Cargando..."
                        fill
                        className="object-contain filter drop-shadow-[0_4px_6px_rgba(99,102,241,0.25)]"
                        priority
                    />
                </div>
            </div>

            {text && (
                <div className="mt-6 flex flex-col items-center gap-1.5">
                    <p className="text-xs font-extrabold tracking-widest text-slate-500 dark:text-slate-400 uppercase animate-pulse">
                        {text}
                    </p>
                    <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes spin-clockwise {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes spin-counterclockwise {
                    from { transform: rotate(360deg); }
                    to { transform: rotate(0deg); }
                }
                @keyframes breathe {
                    0%, 100% { transform: scale(0.93); opacity: 0.85; }
                    50% { transform: scale(1.03); opacity: 1; filter: drop-shadow(0 10px 15px rgba(99, 102, 241, 0.4)); }
                }
                .animate-spin-cw {
                    animation: spin-clockwise 2.2s linear infinite;
                }
                .animate-spin-ccw {
                    animation: spin-counterclockwise 1.6s linear infinite;
                }
                .animate-breathe {
                    animation: breathe 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}
