"use client";

import { useEffect, useRef, useState } from "react";
import { FaBuilding, FaCheck, FaChevronDown, FaLock } from "react-icons/fa";
import { useBranch } from "@/contexts/BranchContext";

export default function ActiveBranchBadge({
  compact = false,
  dropUp = false,
}: {
  compact?: boolean;
  dropUp?: boolean;
}) {
  const {
    branches,
    activeBranch,
    isAssignedFixed,
    isLoading,
    setActiveBranchById,
  } = useBranch();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const canSwitch = !isAssignedFixed && branches.length > 1;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading || !activeBranch) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs animate-pulse">
        <FaBuilding className="w-3.5 h-3.5" />
        <span>Cargando sucursal...</span>
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${isOpen ? "z-50" : ""}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => canSwitch && setIsOpen((open) => !open)}
        disabled={!canSwitch}
        title={
          isAssignedFixed
            ? "Sucursal asignada por el administrador"
            : "Cambiar sucursal activa"
        }
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
          canSwitch ? "cursor-pointer active:scale-95" : "cursor-default"
        } bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25`}
      >
        <FaBuilding className="w-3.5 h-3.5" />
        {!compact && (
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Sucursal:
          </span>
        )}
        <span className="font-extrabold uppercase tracking-tight">{activeBranch.name}</span>
        {isAssignedFixed && <FaLock className="w-2.5 h-2.5 opacity-60" />}
        {canSwitch && (
          <FaChevronDown
            className={`w-2.5 h-2.5 opacity-60 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {isOpen && canSwitch && (
        <div
          className={`absolute right-0 ${
            dropUp ? "bottom-full mb-2" : "top-full mt-2"
          } w-60 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-[100] p-2 animate-in fade-in duration-150`}
        >
          <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Cambiar sucursal
          </div>
          <div className="space-y-1 mt-1">
            {branches.map((branch) => (
              <button
                type="button"
                onClick={() => {
                  setActiveBranchById(branch.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold ${
                  branch.id === activeBranch.id
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {branch.name}
                </span>
                {branch.id === activeBranch.id && <FaCheck className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
