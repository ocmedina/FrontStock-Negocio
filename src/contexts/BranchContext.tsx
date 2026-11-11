"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
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
  setActiveBranchById: (branchId: number) => void;
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextValue | undefined>(undefined);
const STORAGE_KEY = "frontstock_active_branch_id";

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);
  const [isAssignedFixed, setIsAssignedFixed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const initBranches = useCallback(async () => {
    setIsLoading(true);
    try {
      const [{ data: branchData, error: branchError }, { data: sessionData }] =
        await Promise.all([
          (supabase as any)
            .from("branches")
            .select("id, name, description, is_active")
            .eq("is_active", true)
            .order("id", { ascending: true }),
          supabase.auth.getSession(),
        ]);

      if (branchError) throw branchError;

      const activeList = (branchData ?? []) as unknown as Branch[];
      setBranches(activeList);
      if (activeList.length === 0) return;

      const userId = sessionData.session?.user.id;
      let assignedBranchId: number | null = null;
      let isAdmin = false;

      if (userId) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("branch_id, role")
          .eq("id", userId)
          .single();

        if (profileError) throw profileError;
        const profileRow = profile as { branch_id?: number | null; role?: string } | null;
        assignedBranchId = profileRow?.branch_id ? Number(profileRow.branch_id) : null;
        isAdmin = profileRow?.role === "administrador";
        setIsAdmin(isAdmin);
      }

      const fixedBranch = assignedBranchId
        ? activeList.find((branch) => branch.id === assignedBranchId) ?? null
        : null;

      if (fixedBranch && !isAdmin) {
        setActiveBranch(fixedBranch);
        setIsAssignedFixed(true);
        return;
      }

      setIsAssignedFixed(false);
      const savedId = Number(window.localStorage.getItem(STORAGE_KEY));
      const savedBranch = activeList.find((branch) => branch.id === savedId);
      const resolved = savedBranch ?? fixedBranch ?? activeList[0];
      setActiveBranch(resolved);
      window.localStorage.setItem(STORAGE_KEY, String(resolved.id));
      // Keep the selected branch available to server-side account/history queries.
      if (isAdmin && assignedBranchId !== resolved.id && userId) {
        const { error } = await supabase
          .from("profiles")
          .update({ branch_id: resolved.id } as any)
          .eq("id", userId);
        if (error) throw error;
      }
    } catch (error) {
      console.error("[BranchContext] Error initializing branches:", error);
      toast.error("No se pudieron cargar las sucursales");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void initBranches();
  }, [initBranches]);

  const setActiveBranchById = useCallback(
    (branchId: number) => {
      if (isAssignedFixed) {
        toast.error("Tu usuario tiene una sucursal asignada por el administrador.");
        return;
      }

      const branch = branches.find((item) => item.id === branchId);
      if (!branch) return;

      setActiveBranch(branch);
      window.localStorage.setItem(STORAGE_KEY, String(branch.id));
      if (isAdmin) {
        void (async () => {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError || !userData.user) return;
          const { error } = await supabase
            .from("profiles")
            .update({ branch_id: branch.id } as any)
            .eq("id", userData.user.id);
          if (error) {
            console.error("[BranchContext] Error saving active admin branch:", error);
            toast.error("No se pudo guardar la sucursal activa");
          }
        })();
      }
      toast.success(`Sucursal activa: ${branch.name}`, { id: "active-branch-toast" });
    },
    [branches, isAdmin, isAssignedFixed]
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

