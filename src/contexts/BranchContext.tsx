"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

export type Branch = {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  logo_url?: string | null;
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
const SESSION_STORAGE_PREFIX = "frontstock_session_branch_id";

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);
  const [isAssignedFixed, setIsAssignedFixed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresSelection, setRequiresSelection] = useState(false);

  const initBranches = useCallback(async () => {
    setIsLoading(true);
    try {
      const [{ data: branchData, error: branchError }, { data: sessionData }] =
        await Promise.all([
          (supabase as any)
            .from("branches")
            .select("id, name, description, is_active, logo_url")
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
        setRequiresSelection(false);
        return;
      }

      setIsAssignedFixed(false);
      const sessionStorageKey = `${SESSION_STORAGE_PREFIX}_${userId ?? "anonymous"}`;
      const selectedSessionBranchId = Number(window.sessionStorage.getItem(sessionStorageKey));
      const selectedSessionBranch = activeList.find(
        (branch) => branch.id === selectedSessionBranchId
      );
      setActiveBranch(selectedSessionBranch ?? null);
      setRequiresSelection(activeList.length > 1 && !selectedSessionBranch);
      if (activeList.length === 1) {
        setActiveBranch(activeList[0]);
        setRequiresSelection(false);
        window.localStorage.setItem(STORAGE_KEY, String(activeList[0].id));
        window.sessionStorage.setItem(sessionStorageKey, String(activeList[0].id));
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
      setRequiresSelection(false);
      window.localStorage.setItem(STORAGE_KEY, String(branch.id));
      const currentUser = supabase.auth.getUser();
      void currentUser.then(({ data }) => {
        const sessionStorageKey = `${SESSION_STORAGE_PREFIX}_${data.user?.id ?? "anonymous"}`;
        window.sessionStorage.setItem(sessionStorageKey, String(branch.id));
      });
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
      {requiresSelection && !isLoading && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/70 px-3 py-4 sm:px-4 sm:py-8">
          <div className="mx-auto flex min-h-full w-full max-w-2xl items-center justify-center">
            <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/80 sm:px-7 sm:py-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  <img
                    src="/Logo-nuevo.png"
                    alt="FrontStock"
                    className="h-10 w-10 shrink-0 rounded-xl object-contain sm:h-11 sm:w-11"
                  />
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 sm:text-[10px] sm:tracking-[0.2em]">
                      Inicio de operación
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
                      Seleccionar sucursal
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400 sm:mt-2 sm:text-sm">
                      Seleccione la sucursal en la que realizará sus operaciones.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-7">
                <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Sucursales disponibles
                  </p>
                  <span className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    {branches.length} disponibles
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => setActiveBranchById(branch.id)}
                  className="group flex min-h-[76px] items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-500 dark:hover:bg-slate-800 sm:min-h-[84px] sm:p-3.5"
                >
                  {branch.logo_url ? (
                    <img
                      src={branch.logo_url}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg object-contain ring-1 ring-slate-200 dark:ring-slate-700"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                      {branch.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 overflow-hidden">
                    <span className="block text-sm font-semibold leading-4 text-slate-800 dark:text-slate-100">{branch.name}</span>
                    <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">Seleccionar para continuar</span>
                  </span>
                  <span className="hidden shrink-0 text-xs font-bold text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 sm:block">Seleccionar</span>
                </button>
              ))}
                </div>
                <p className="mt-5 border-t border-slate-100 pt-3 text-center text-[10px] leading-4 text-slate-400 dark:border-slate-800 dark:text-slate-500 sm:mt-6 sm:pt-4 sm:text-[11px]">
                  La sucursal activa determina los datos operativos que se mostrarán.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
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
