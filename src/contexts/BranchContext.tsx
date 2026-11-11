"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentBranchAccess, setCurrentActiveBranch } from "@/app/actions/branchActions";
import toast from "react-hot-toast";

export type Branch = {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
};

interface BranchContextValue {
  branches: Branch[];
  activeBranch: Branch | null;
  isAssignedFixed: boolean;
  isLoading: boolean;
  setActiveBranchById: (branchId: number) => Promise<void>;
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextValue | undefined>(undefined);
const STORAGE_KEY = "frontstock_active_branch_id";

function userStorageKey(userId: string | null) {
  return `${STORAGE_KEY}_${userId || "anonymous"}`;
}

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);
  const [isAssignedFixed, setIsAssignedFixed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const initBranches = useCallback(async () => {
    setIsLoading(true);
    try {
      const [{ data: branchData, error: branchError }, { data: sessionData }, access] = await Promise.all([
        (supabase as any)
          .from("branches")
          .select("id, name, description, is_active")
          .eq("is_active", true)
          .order("id", { ascending: true }),
        supabase.auth.getSession(),
        getCurrentBranchAccess(),
      ]);

      if (branchError) throw branchError;
      if (!access.success) throw new Error(access.error || "No se pudo consultar el acceso a sucursales.");

      const allActive = (branchData ?? []) as Branch[];
      const userId = sessionData.session?.user.id ?? null;
      setCurrentUserId(userId);

      const assignedIds = access.isAdmin ? [] : (access.assignedBranchIds || []);
      const hasBranchRestriction = !access.isAdmin && assignedIds.length > 0;
      const available = hasBranchRestriction
        ? allActive.filter((branch) => assignedIds.includes(branch.id))
        : allActive;
      setBranches(available);

      if (available.length === 0) {
        setActiveBranch(null);
        setIsAssignedFixed(hasBranchRestriction);
        return;
      }

      const key = userStorageKey(userId);
      const savedId = Number(
        window.localStorage.getItem(key) || window.localStorage.getItem(STORAGE_KEY)
      );
      const savedBranch = available.find((branch) => branch.id === savedId);
      const profileBranch = available.find((branch) => branch.id === access.profileBranchId);
      const resolved = savedBranch ?? profileBranch ?? available[0];

      setIsAssignedFixed(hasBranchRestriction && available.length === 1);
      setActiveBranch(resolved);
      window.localStorage.setItem(key, String(resolved.id));

      // The profile branch is the server-side active branch; the assignment table remains the allow-list.
      if (access.profileBranchId !== resolved.id && userId) {
        const result = await setCurrentActiveBranch(resolved.id);
        if (!result.success) {
          console.error("[BranchContext] No se pudo sincronizar la sucursal activa:", result.error);
          toast.error(result.error || "No se pudo guardar la sucursal activa.");
        }
      }
    } catch (error) {
      console.error("[BranchContext] Error inicializando sucursales:", error);
      toast.error("No se pudieron cargar las sucursales");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void initBranches();
  }, [initBranches]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void initBranches();
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [initBranches]);

  useEffect(() => {
    const key = userStorageKey(currentUserId);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key || !event.newValue) return;
      const branch = branches.find((item) => item.id === Number(event.newValue));
      if (!branch || isAssignedFixed) return;
      void (async () => {
        const result = await setCurrentActiveBranch(branch.id);
        if (!result.success) {
          toast.error(result.error || "No se pudo sincronizar la sucursal entre pestañas.");
          return;
        }
        setActiveBranch(branch);
      })();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [branches, currentUserId, isAssignedFixed]);

  const setActiveBranchById = useCallback(
    async (branchId: number) => {
      if (isAssignedFixed) {
        toast.error("Tu usuario tiene una sola sucursal asignada por el administrador.");
        return;
      }

      const branch = branches.find((item) => item.id === branchId);
      if (!branch) {
        toast.error("No tenés acceso a esa sucursal.");
        return;
      }

      const result = await setCurrentActiveBranch(branch.id);
      if (!result.success) {
        toast.error(result.error || "No se pudo guardar la sucursal activa.");
        return;
      }

      setActiveBranch(branch);
      window.localStorage.setItem(userStorageKey(currentUserId), String(branch.id));
      toast.success(`Sucursal activa: ${branch.name}`, { id: "active-branch-toast" });
    },
    [branches, currentUserId, isAssignedFixed]
  );

  return (
    <BranchContext.Provider
      value={{
        branches,
        activeBranch,
        isAssignedFixed,
        isLoading,
        setActiveBranchById,
        refreshBranches: initBranches,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error("useBranch debe utilizarse dentro de un BranchProvider");
  }
  return context;
}

