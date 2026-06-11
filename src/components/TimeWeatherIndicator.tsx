"use client";

import { useState, useEffect } from "react";
import { 
  FaClock, 
  FaSun, 
  FaCloudSun, 
  FaCloud, 
  FaCloudRain, 
  FaCloudShowersHeavy, 
  FaSnowflake, 
  FaBolt, 
  FaThermometerHalf 
} from "react-icons/fa";

export default function TimeWeatherIndicator() {
  const [timeString, setTimeString] = useState("");
  const [temp, setTemp] = useState<number | null>(null);
  const [weatherCode, setWeatherCode] = useState<number | null>(null);

  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch weather data
  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
        );
        if (!res.ok) throw new Error("Weather fetch failed");
        const data = await res.json();
        if (data?.current_weather) {
          setTemp(Math.round(data.current_weather.temperature));
          setWeatherCode(data.current_weather.weathercode);
        }
      } catch (err) {
        console.error("Error fetching weather:", err);
      }
    };

    // Geolocation fallback
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        () => {
          // Rivadavia, Mendoza defaults
          fetchWeather(-33.19, -68.46);
        }
      );
    } else {
      fetchWeather(-33.19, -68.46);
    }

    // Refresh weather every 15 minutes
    const interval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
          () => fetchWeather(-33.19, -68.46)
        );
      } else {
        fetchWeather(-33.19, -68.46);
      }
    }, 900000);

    return () => clearInterval(interval);
  }, []);

  // Map Open-Meteo weather codes to Icons
  const getWeatherIcon = (code: number | null) => {
    if (code === null) return <FaThermometerHalf className="text-amber-500 animate-pulse" />;
    
    if (code === 0) {
      return <FaSun className="text-amber-500 animate-spin-slow" />;
    }
    if ([1, 2, 3].includes(code)) {
      return <FaCloudSun className="text-amber-450" />;
    }
    if ([45, 48].includes(code)) {
      return <FaCloud className="text-slate-400" />;
    }
    if ([51, 53, 55, 56, 57].includes(code)) {
      return <FaCloudRain className="text-sky-400 animate-bounce" style={{ animationDuration: "2s" }} />;
    }
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
      return <FaCloudShowersHeavy className="text-blue-500" />;
    }
    if ([71, 73, 75, 77, 85, 86].includes(code)) {
      return <FaSnowflake className="text-sky-300 animate-spin-slow" />;
    }
    if ([95, 96, 99].includes(code)) {
      return <FaBolt className="text-yellow-400 animate-pulse" />;
    }
    return <FaThermometerHalf className="text-amber-500" />;
  };

  // Determine dynamic visual status based on weather and temperature
  const getWeatherStatus = () => {
    if (temp === null) {
      return {
        label: "",
        borderClass: "border-slate-100 dark:border-slate-800/80",
        glowClass: "shadow-sm",
        bgClass: "bg-slate-50 dark:bg-slate-850/50 text-slate-600 dark:text-slate-350",
      };
    }

    // Rain / Drizzle
    if (weatherCode !== null && weatherCode >= 51 && weatherCode <= 82) {
      return {
        label: "Lluvia 🌧️",
        borderClass: "border-blue-300 dark:border-blue-800/80",
        glowClass: "shadow-[0_0_10px_rgba(59,130,246,0.2)]",
        bgClass: "bg-blue-50/60 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400",
      };
    }

    // Storms
    if (weatherCode !== null && [95, 96, 99].includes(weatherCode)) {
      return {
        label: "Tormenta ⚡",
        borderClass: "border-purple-300 dark:border-purple-800/80",
        glowClass: "shadow-[0_0_10px_rgba(168,85,247,0.25)]",
        bgClass: "bg-purple-50/60 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400",
      };
    }

    // Snow
    if (weatherCode !== null && [71, 73, 75, 77, 85, 86].includes(weatherCode)) {
      return {
        label: "Nieve ❄️",
        borderClass: "border-sky-200 dark:border-sky-800/60",
        glowClass: "shadow-[0_0_10px_rgba(186,230,253,0.25)]",
        bgClass: "bg-sky-50/50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-300",
      };
    }

    // Cold (<= 14°C)
    if (temp <= 14) {
      return {
        label: "Frío ❄️",
        borderClass: "border-cyan-300 dark:border-cyan-900/50",
        glowClass: "shadow-[0_0_10px_rgba(6,182,212,0.15)]",
        bgClass: "bg-cyan-50/50 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-400",
      };
    }

    // Hot (>= 28°C)
    if (temp >= 28) {
      return {
        label: "Calor ☀️",
        borderClass: "border-orange-300 dark:border-orange-900/50",
        glowClass: "shadow-[0_0_10px_rgba(249,115,22,0.2)]",
        bgClass: "bg-orange-50/50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400",
      };
    }

    // Default Temperate
    return {
      label: "",
      borderClass: "border-slate-100 dark:border-slate-800/80",
      glowClass: "shadow-sm",
      bgClass: "bg-slate-50/60 dark:bg-slate-850/50 text-slate-600 dark:text-slate-350",
    };
  };

  const status = getWeatherStatus();

  return (
    <div 
      className={`hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl border backdrop-blur-md transition-all duration-500 select-none hover:scale-102
        ${status.borderClass} ${status.glowClass} ${status.bgClass}`}
    >
      {/* Clock */}
      <div className="flex items-center gap-1.5 pr-2.5 border-r border-slate-200 dark:border-slate-800">
        <FaClock className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 animate-pulse" />
        <span className="font-mono text-xs font-black tracking-wider leading-none">
          {timeString || "00:00:00"}
        </span>
      </div>

      {/* Temperature / Weather */}
      <div className="flex items-center gap-1.5">
        <span className="text-sm flex items-center justify-center">
          {getWeatherIcon(weatherCode)}
        </span>
        <span className="text-xs font-bold leading-none">
          {temp !== null ? `${temp}°C` : "--°C"}
        </span>
      </div>

      {/* Dynamic Status Label (Cold, Hot, Rain, etc.) */}
      {status.label && (
        <span className="hidden xl:inline-block px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 text-[9px] font-black uppercase tracking-wider">
          {status.label}
        </span>
      )}

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
      `}</style>
    </div>
  );
}
