"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getRegisters,
  createRegister,
  updateRegister,
  assignUserRegister,
  getUserRegisterAssignments,
  type Register,
  type UserRegisterAssignment,
} from "@/app/actions/registerActions";
import { useRegister } from "@/hooks/useRegister";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import {
  FaCashRegister,
  FaPlus,
  FaCheckCircle,
  FaTimesCircle,
  FaEdit,
  FaUserCheck,
  FaDesktop,
  FaStore,
  FaSync,
  FaTimes,
  FaExchangeAlt,
  FaInfoCircle,
  FaShieldAlt,
} from "react-icons/fa";

export default function CashRegistersPage() {
  const { user, role } = useAuth();
  const {
    activeRegister,
    setActiveRegisterById,
    isAssignedFixed,
    isLoading: registerLoading,
  } = useRegister();

  const [registers, setRegisters] = useState<Register[]>([]);
  const [userAssignments, setUserAssignments] = useState<UserRegisterAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form states for create & edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRegister, setEditingRegister] = useState<Register | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [regsRes, usersRes] = await Promise.all([
      getRegisters(),
      getUserRegisterAssignments(),
    ]);

    if (regsRes.success && regsRes.data) {
      setRegisters(regsRes.data);
    } else if (regsRes.error) {
      toast.error(`Error cargando cajas: ${regsRes.error}`);
    }

    if (usersRes.success && usersRes.data) {
      setUserAssignments(usersRes.data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreateModal = () => {
    setEditingRegister(null);
    setFormName(`Caja ${registers.length + 1}`);
    setFormDesc("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (reg: Register) => {
    setEditingRegister(reg);
    setFormName(reg.name);
    setFormDesc(reg.description || "");
    setIsModalOpen(true);
  };

  const handleSaveRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("El nombre de la caja es obligatorio.");
      return;
    }

    setSaving(true);
    try {
      if (editingRegister) {
        const res = await updateRegister(editingRegister.id, {
          name: formName,
          description: formDesc,
        });
        if (res.success) {
          toast.success("Caja actualizada con éxito.");
          setIsModalOpen(false);
          await fetchData();
        } else {
          toast.error(res.error || "Error al actualizar la caja.");
        }
      } else {
        const res = await createRegister(formName, formDesc);
        if (res.success) {
          toast.success("Caja creada con éxito.");
          setIsModalOpen(false);
          await fetchData();
        } else {
          toast.error(res.error || "Error al crear la caja.");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Ocurrió un error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (reg: Register) => {
    const newStatus = !reg.is_active;
    const toastId = toast.loading(`${newStatus ? "Activando" : "Desactivando"} ${reg.name}...`);
    const res = await updateRegister(reg.id, { is_active: newStatus });
    if (res.success) {
      toast.success(`${reg.name} ${newStatus ? "activada" : "desactivada"}.`, { id: toastId });
      await fetchData();
    } else {
      toast.error(res.error || "Error al cambiar estado.", { id: toastId });
    }
  };

  const handleUserAssignmentChange = async (profileId: string, newRegIdStr: string) => {
    const regId = newRegIdStr === "none" ? null : Number(newRegIdStr);
    const toastId = toast.loading("Actualizando puesto asignado...");
    const res = await assignUserRegister(profileId, regId);
    if (res.success) {
      toast.success("Asignación guardada exitosamente.", { id: toastId });
      await fetchData();
    } else {
      toast.error(res.error || "Error al asignar puesto.", { id: toastId });
    }
  };

  const handleSwitchTerminalRegister = (reg: Register) => {
    setActiveRegisterById(reg.id);
    toast.success(`Terminal configurada para operar en: ${reg.name}`);
  };

  const activeCount = registers.filter((r) => r.is_active).length;

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 min-h-full space-y-6">
      {/* HEADER CARD */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-indigo-50/50 dark:bg-indigo-950/20" />
        <div className="flex items-center gap-4 text-left relative z-10">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md text-xl flex-shrink-0">
            <FaCashRegister />
          </span>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
              Puestos de Venta / Cajas
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Gestión de cajas simultáneas independientes sobre el mismo stock centralizado.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm"
            title="Recargar datos"
          >
            <FaSync className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95"
          >
            <FaPlus className="text-xs" />
            Nueva Caja
          </button>
        </div>
      </div>

      {/* OVERVIEW STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Terminal actual */}
        <div className="rounded-2xl p-5 border shadow-2xs bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg">
              <FaDesktop />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Puesto en esta terminal
              </p>
              <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                {activeRegister ? activeRegister.name : "Cargando..."}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            {isAssignedFixed ? "Fijo por Usuario" : "Libre Selección"}
          </span>
        </div>

        {/* Cajas activas */}
        <div className="rounded-2xl p-5 border shadow-2xs bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg">
            <FaStore />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Cajas Activas
            </p>
            <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
              {activeCount} de {registers.length}
            </p>
          </div>
        </div>

        {/* Simultaniedad */}
        <div className="rounded-2xl p-5 border shadow-2xs bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg">
            <FaShieldAlt />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Bloqueo Concurrente
            </p>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
              PostgreSQL FOR UPDATE (Activo)
            </p>
          </div>
        </div>
      </div>

      {/* LISTADO DE CAJAS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FaStore className="text-indigo-600 dark:text-indigo-400" />
            Cajas Configuradas
          </h2>
          <span className="text-xs text-slate-400">
            {registers.length} puestos registrados
          </span>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-slate-800">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-xs text-slate-400 mt-3 font-medium">Cargando puestos de venta...</p>
            </div>
          ) : registers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-semibold">
              No hay cajas configuradas. Presiona "Nueva Caja" para dar de alta un puesto.
            </div>
          ) : (
            registers.map((reg) => {
              const isCurrentActive = activeRegister?.id === reg.id;
              const assignedUsers = userAssignments.filter((u) => u.register_id === reg.id);

              return (
                <div
                  key={reg.id}
                  className={`p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${
                    !reg.is_active ? "opacity-60 bg-gray-50/50 dark:bg-slate-950/40" : ""
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                        {reg.name}
                      </h3>
                      {reg.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                          <FaCheckCircle className="text-[9px]" /> Activa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
                          <FaTimesCircle className="text-[9px]" /> Inactiva
                        </span>
                      )}
                      {isCurrentActive && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-800">
                          <FaDesktop className="text-[9px]" /> Puesto Actual de este Equipo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {reg.description || "Sin descripción asignada"}
                    </p>

                    {/* Usuarios asignados a esta caja */}
                    <div className="pt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Vendedores fijos:
                      </span>
                      {assignedUsers.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">
                          Ninguno (abierta a usuarios no restringidos)
                        </span>
                      ) : (
                        assignedUsers.map((u) => (
                          <span
                            key={u.profile_id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          >
                            <FaUserCheck className="text-[10px] text-indigo-500" />
                            {u.full_name || u.username || "Usuario"}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Acciones para cada caja */}
                  <div className="flex items-center gap-2 self-start md:self-center flex-wrap">
                    {!isCurrentActive && reg.is_active && (
                      <button
                        onClick={() => handleSwitchTerminalRegister(reg)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs hover:bg-indigo-100 transition-all shadow-2xs"
                        title="Seleccionar esta caja para operar en este navegador"
                      >
                        <FaExchangeAlt className="text-[10px]" />
                        Operar en esta Caja
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenEditModal(reg)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-2xs"
                    >
                      <FaEdit className="text-[10px]" />
                      Editar
                    </button>

                    <button
                      onClick={() => handleToggleActive(reg)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs transition-all shadow-2xs ${
                        reg.is_active
                          ? "border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100"
                          : "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100"
                      }`}
                    >
                      {reg.is_active ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ASIGNACIÓN DE CAJAS POR USUARIO */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FaUserCheck className="text-indigo-600 dark:text-indigo-400" />
              Asignación Fija de Puestos por Usuario
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Si fijas una caja a un usuario, no podrá operar ni cambiar a otra caja accidentalmente.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-800 text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="px-6 py-3">Usuario / Vendedor</th>
                <th className="px-6 py-3">Rol</th>
                <th className="px-6 py-3">Caja Asignada Fija</th>
                <th className="px-6 py-3 text-right">Comportamiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {userAssignments.map((u) => {
                const isAssigned = u.register_id !== null;

                return (
                  <tr key={u.profile_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                      {u.full_name || u.username || "Sin nombre"}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {u.role || "vendedor"}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <select
                        value={u.register_id ? String(u.register_id) : "none"}
                        onChange={(e) =>
                          handleUserAssignmentChange(u.profile_id, e.target.value)
                        }
                        className="p-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="none">Sin asignar (Libre selección)</option>
                        {registers.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} {!r.is_active ? "(Inactiva)" : ""}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-3.5 text-right text-xs">
                      {isAssigned ? (
                        <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center justify-end gap-1">
                          <FaShieldAlt className="text-xs" /> Fijo a su puesto
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">
                          Puede alternar cajas
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* NOTA INFORMATIVA DE SEGURIDAD Y STOCK */}
      <div className="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-2xl p-5 flex items-start gap-3.5 text-xs text-indigo-900 dark:text-indigo-300">
        <FaInfoCircle className="text-indigo-600 text-base flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Arquitectura Unificada de Stock & Precios:</p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Las cajas operan sobre una <strong>única base centralizada de productos y stock</strong>. No se duplica inventario ni clientes. Todas las ventas en mostrador descuentan stock en tiempo real y el cierre de mostrador permite consultar la facturación conjunta o individual por puesto.
          </p>
        </div>
      </div>

      {/* MODAL CREAR / EDITAR CAJA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
              <h3 className="font-black text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <FaCashRegister className="text-indigo-600 dark:text-indigo-400" />
                {editingRegister ? "Editar Puesto de Venta" : "Nueva Caja"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSaveRegister} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Nombre de la Caja / Puesto *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Caja 1, Caja 2, Mostrador Frente"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Descripción / Ubicación
                </label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Ej: Puesto principal de cobro rápido, caja auxiliar..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {saving ? "Guardando..." : editingRegister ? "Guardar Cambios" : "Crear Caja"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
