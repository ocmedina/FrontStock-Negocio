"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isChristmasThemeActive } from "@/lib/theme-scheduler";

interface ChristmasLogoProps {
  href?: string;
  isCollapsed?: boolean;
  className?: string;
}

/**
 * Logo component with festive Christmas hat decoration.
 * Only displays the hat when the Christmas theme is active.
 *
 * @component
 */
export default function ChristmasLogo({
  href = "/dashboard",
  isCollapsed = false,
  className = "",
}: ChristmasLogoProps) {
  const [isChristmas, setIsChristmas] = useState(false);

  useEffect(() => {
    setIsChristmas(isChristmasThemeActive());
  }, []);

  const logoText = isCollapsed ? "FS" : "FrontStock";

  return (
    <Link href={href} className={`relative inline-block ${className}`}>
      {/* Christmas Hat - positioned above logo */}
      {isChristmas && (
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="relative">
            {/* Hat body */}
            <div
              className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[20px] border-b-red-600"
              style={{
                filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))",
              }}
            />
            {/* Hat pom-pom */}
            <div
              className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white rounded-full"
              style={{
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))",
              }}
            />
            {/* Hat brim */}
            <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-7 h-1.5 bg-white rounded-full" />
          </div>
        </div>
      )}

      <span className="flex items-center gap-2">
        <img
          src="/Logo-nuevo.png"
          alt="FrontStock logo"
          className={isCollapsed ? "w-8 h-8 object-contain" : "w-9 h-9 object-contain"}
        />
        {!isCollapsed && (
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all font-outfit tracking-tight whitespace-nowrap">
            {logoText}
          </span>
        )}
      </span>
    </Link>
  );
}
