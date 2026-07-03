"use client";

import { useState, useEffect } from "react";
import { FaWrench, FaTimes } from "react-icons/fa";

export default function MaintenanceBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // El domingo 5 de julio es el mantenimiento. Expiramos el banner el lunes 6 de julio a las 00:00 (hora local/Argentina).
    const expiryDate = new Date("2026-07-06T00:00:00-03:00");
    const dismissed = localStorage.getItem("frontstock_maintenance_july5_dismissed");
    const now = new Date();

    if (dismissed !== "true" && now < expiryDate) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("frontstock_maintenance_july5_dismissed", "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="w-full bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700 text-white py-3 px-4 relative z-40 flex items-center justify-between text-xs sm:text-sm font-medium shadow-md transition-all duration-300">
      <div className="flex items-center gap-3 max-w-4xl mx-auto pr-8">
        <div className="bg-white/20 p-1.5 rounded-lg shrink-0 animate-pulse">
          <FaWrench className="w-4 h-4 text-white" />
        </div>
        <span className="leading-snug">
          <strong>¡Mantenimiento Programado!</strong> El próximo <strong>domingo 5 de julio</strong> el sistema estará en mantenimiento. Podrías experimentar interrupciones temporales en el servicio durante ese día.
        </span>
      </div>
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
        aria-label="Cerrar aviso"
      >
        <FaTimes className="w-4 h-4" />
      </button>
    </div>
  );
}
