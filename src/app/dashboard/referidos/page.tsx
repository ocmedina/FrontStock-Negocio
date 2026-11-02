"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  getAllReferrals,
  getReferralSettings,
  updateReferralSettings,
  createReferralCode,
  linkReferral,
  getReferralStats,
} from "@/app/actions/referralActions";
import {
  FaGift,
  FaPlus,
  FaLink,
  FaWhatsapp,
  FaCopy,
  FaCheck,
  FaCog,
  FaSearch,
  FaUserFriends,
  FaPercentage,
  FaExclamationCircle,
  FaTimes,
  FaCheckCircle,
  FaClock,
} from "react-icons/fa";
import toast from "react-hot-toast";

interface ReferralItem {
  id: string;
  referral_code: string;
  status: "pending" | "registered" | "completed" | "expired";
  referrer_discount_percent: number;
  referred_discount_percent: number;
  referrer_discount_used: boolean;
  referred_discount_used: boolean;
  referrer_customer_id: string;
  referred_customer_id: string | null;
  created_at: string;
  expires_at: string | null;
  referrer?: { id: string; full_name: string } | null;
  referred?: { id: string; full_name: string } | null;
}

interface CustomerOption {
  id: string;
  full_name: string;
  phone?: string | null;
}

export default function ReferidosPage() {
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    registered: 0,
    completed: 0,
    expired: 0,
    discountsGiven: 0,
  });
  const [settings, setSettings] = useState({
    referrer_discount_percent: 15,
    referred_discount_percent: 10,
    max_referrals_per_customer: 5,
    is_active: true,
    expiration_days: 90,
  });

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [tableExists, setTableExists] = useState(true);

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Estados formulario crear
  const [selectedReferrerId, setSelectedReferrerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [createdSuccessData, setCreatedSuccessData] = useState<{
    code: string;
    referrerName: string;
  } | null>(null);

  // Estados formulario vincular
  const [linkCodeInput, setLinkCodeInput] = useState("");
  const [linkReferredId, setLinkReferredId] = useState("");
  const [linkCustomerSearch, setLinkCustomerSearch] = useState("");

  // Carga inicial de datos
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Clientes
      const { data: custData, error: custError } = await supabase
        .from("customers")
        .select("id, full_name, phone")
        .order("full_name");
      if (!custError && custData) {
        setCustomers(custData);
      }

      // 2. Configuración
      const sett = await getReferralSettings();
      if (sett) {
        setSettings({
          referrer_discount_percent: Number(sett.referrer_discount_percent) || 15,
          referred_discount_percent: Number(sett.referred_discount_percent) || 10,
          max_referrals_per_customer: Number(sett.max_referrals_per_customer) || 5,
          is_active: sett.is_active ?? true,
          expiration_days: Number(sett.expiration_days) || 90,
        });
      }

      // 3. Referidos
      const refs = await getAllReferrals();
      setReferrals((refs || []) as ReferralItem[]);

      // 4. Estadísticas
      const st = await getReferralStats();
      setStats(st);
    } catch (err: any) {
      console.error("Error loading referral data:", err);
      if (err?.message?.includes("does not exist") || err?.code === "PGRST205") {
        setTableExists(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Copiar código o link
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Código ${code} copiado al portapapeles`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyLink = (code: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/referido/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(code);
    toast.success("Enlace de referido copiado al portapapeles");
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleWhatsAppShare = (code: string, referrerName?: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/referido/${code}`;
    const name = referrerName || "nuestro cliente";
    const text = encodeURIComponent(
      `¡Hola! ${name} te invita a comprar en nuestro negocio con un ${settings.referred_discount_percent}% de descuento en tu primera compra.\n\nAccedé a tu beneficio aquí: ${url}\nO presentá el código: *${code}*`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  // Crear nuevo código
  const handleCreateCode = async () => {
    if (!selectedReferrerId) {
      toast.error("Selecciona un cliente para generar su código");
      return;
    }
    const res = await createReferralCode(selectedReferrerId);
    if (!res.success) {
      toast.error(res.error || "No se pudo generar el código");
      return;
    }

    const referrer = customers.find((c) => c.id === selectedReferrerId);
    setCreatedSuccessData({
      code: res.data.referral_code,
      referrerName: referrer?.full_name || "Cliente",
    });
    toast.success("¡Código de referido generado!");
    loadData();
  };

  // Vincular referido
  const handleLinkReferral = async () => {
    if (!linkCodeInput.trim()) {
      toast.error("Ingresa el código de referido");
      return;
    }
    if (!linkReferredId) {
      toast.error("Selecciona el cliente que usará el código");
      return;
    }

    const res = await linkReferral(linkCodeInput, linkReferredId);
    if (!res.success) {
      toast.error(res.error || "No se pudo vincular el referido");
      return;
    }

    toast.success("¡Referido vinculado exitosamente!");
    setShowLinkModal(false);
    setLinkCodeInput("");
    setLinkReferredId("");
    loadData();
  };

  // Guardar configuración
  const handleSaveSettings = async () => {
    const res = await updateReferralSettings(settings);
    if (!res.success) {
      toast.error(res.error || "Error al guardar configuración");
      return;
    }
    toast.success("Configuración actualizada correctamente");
    setShowSettingsModal(false);
  };

  // Filtrado de la tabla
  const filteredReferrals = useMemo(() => {
    return referrals.filter((item) => {
      // Filtro por estado
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      // Filtro por búsqueda
      if (!searchTerm.trim()) return true;
      const search = searchTerm.toLowerCase();
      const codeMatch = item.referral_code.toLowerCase().includes(search);
      const referrerMatch = item.referrer?.full_name?.toLowerCase().includes(search);
      const referredMatch = item.referred?.full_name?.toLowerCase().includes(search);
      return codeMatch || referrerMatch || referredMatch;
    });
  }, [referrals, statusFilter, searchTerm]);

  const filteredCustomerList = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 10);
    return customers.filter((c) => c.full_name.toLowerCase().includes(q)).slice(0, 10);
  }, [customers, customerSearch]);

  const filteredLinkCustomerList = useMemo(() => {
    const q = linkCustomerSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 10);
    return customers.filter((c) => c.full_name.toLowerCase().includes(q)).slice(0, 10);
  }, [customers, linkCustomerSearch]);

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 py-5 sm:py-7 pb-20 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto space-y-5">
      {/* Aviso de migración si las tablas no existen */}
      {!tableExists && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FaExclamationCircle className="w-6 h-6 text-amber-500 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Tablas de referidos pendientes en la base de datos
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-0.5">
                Para comenzar a usar este módulo, ejecuta el script ubicado en <code className="bg-amber-500/20 px-1.5 py-0.5 rounded font-mono text-3xs font-bold">sql/create_referral_tables.sql</code> en el editor SQL de Supabase.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(`-- Copiar script de sql/create_referral_tables.sql`);
              toast.success("Ruta copiada: sql/create_referral_tables.sql");
            }}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm whitespace-nowrap active:scale-95 transition-all"
          >
            Copiar Referencia
          </button>
        </div>
      )}

      {/* Cabecera Principal */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FaGift className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Programa de Referidos
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-3xs font-extrabold uppercase ${
                settings.is_active
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                }`}>
                {settings.is_active ? "Activo" : "Inactivo"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                Generá códigos compartibles para tus clientes. Premiá al referidor con <strong>{settings.referrer_discount_percent}% OFF</strong> y al nuevo cliente con <strong>{settings.referred_discount_percent}% OFF</strong>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setCreatedSuccessData(null);
                setSelectedReferrerId("");
                setCustomerSearch("");
                setShowCreateModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-sm flex items-center gap-2 active:scale-95 transition-all"
            >
              <FaPlus className="w-3.5 h-3.5" />
              <span>Generar Código</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLinkCodeInput("");
                setLinkReferredId("");
                setLinkCustomerSearch("");
                setShowLinkModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-xs sm:text-sm flex items-center gap-2 active:scale-95 transition-all"
            >
              <FaLink className="w-3.5 h-3.5 text-indigo-500" />
              <span>Vincular Referido</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors active:scale-95"
              title="Configuración del programa"
            >
              <FaCog className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tarjetas de Métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Códigos
            </span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white block mt-1">
              {stats.total}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Pendientes
            </span>
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 block mt-1">
              {stats.pending}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Vinculados
            </span>
            <span className="text-2xl font-bold text-teal-600 dark:text-teal-400 block mt-1">
              {stats.registered}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Completados
            </span>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 block mt-1">
              {stats.completed}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Descuentos Usados
            </span>
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400 block mt-1">
              {stats.discountsGiven}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-3 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Pestañas de estado */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
          {[
            { id: "all", label: "Todos" },
            { id: "pending", label: "Pendientes" },
            { id: "registered", label: "Vinculados" },
            { id: "completed", label: "Completados" },
            { id: "expired", label: "Expirados" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? "bg-slate-900 dark:bg-white dark:text-slate-900 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Buscador */}
        <div className="relative min-w-[260px] lg:w-80">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código, cliente..."
            className="w-full pl-9 pr-3 py-2.5 text-xs border border-gray-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Tabla de Referidos */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm animate-pulse">
            Cargando referidos...
          </div>
        ) : filteredReferrals.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 mx-auto flex items-center justify-center">
              <FaUserFriends className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              No hay referidos registrados
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
              Comenzá haciendo clic en <strong>Generar Código</strong> para otorgarle a un cliente existente su link de invitación.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-gray-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Código</th>
                  <th className="px-5 py-3.5">Cliente Referidor</th>
                  <th className="px-5 py-3.5">Amigo Referido</th>
                  <th className="px-5 py-3.5 text-center">Descuentos</th>
                  <th className="px-5 py-3.5 text-center">Estado</th>
                  <th className="px-5 py-3.5">Vencimiento</th>
                  <th className="px-5 py-3.5 text-right">Compartir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80">
                {filteredReferrals.map((r) => {
                  const isExp = r.expires_at && new Date(r.expires_at) < new Date();
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors"
                    >
                      {/* Código */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1.5 rounded-lg border border-indigo-200/50 dark:border-indigo-800/40">
                            {r.referral_code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(r.referral_code)}
                            title="Copiar código"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            {copiedCode === r.referral_code ? (
                              <FaCheck className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <FaCopy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Referidor */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {r.referrer?.full_name || "Desconocido"}
                        </div>
                        <span className="text-[10px] text-slate-400">Cliente existente</span>
                      </td>

                      {/* Referido */}
                      <td className="px-5 py-4">
                        {r.referred ? (
                          <div>
                            <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {r.referred.full_name}
                            </div>
                            <span className="text-[10px] text-slate-400">Nuevo cliente</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500 italic text-3xs">
                            <FaClock className="w-2.5 h-2.5" /> Esperando registro...
                          </span>
                        )}
                      </td>

                      {/* Descuentos */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex flex-col gap-1 items-center">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400">Referidor:</span>
                            <span className={`px-1.5 py-0.5 rounded text-3xs font-black ${
                              r.referrer_discount_used
                                ? "bg-slate-200 text-slate-600 line-through dark:bg-slate-800 dark:text-slate-400"
                                : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                            }`}>
                              {r.referrer_discount_percent}% {r.referrer_discount_used ? "(Usado)" : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400">Referido:</span>
                            <span className={`px-1.5 py-0.5 rounded text-3xs font-black ${
                              r.referred_discount_used
                                ? "bg-slate-200 text-slate-600 line-through dark:bg-slate-800 dark:text-slate-400"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            }`}>
                              {r.referred_discount_percent}% {r.referred_discount_used ? "(Usado)" : ""}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-5 py-4 text-center">
                        {r.status === "pending" && (
                          <span className="px-2.5 py-1 rounded-full text-3xs font-bold uppercase bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
                            Pendiente
                          </span>
                        )}
                        {r.status === "registered" && (
                          <span className="px-2.5 py-1 rounded-full text-3xs font-bold uppercase bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-900/40">
                            Vinculado
                          </span>
                        )}
                        {r.status === "completed" && (
                          <span className="px-2.5 py-1 rounded-full text-3xs font-bold uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
                            Completado
                          </span>
                        )}
                        {(r.status === "expired" || isExp) && r.status !== "completed" && (
                          <span className="px-2.5 py-1 rounded-full text-3xs font-bold uppercase bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
                            Expirado
                          </span>
                        )}
                      </td>

                      {/* Expiración */}
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-3xs">
                        {r.expires_at ? (
                          <div>
                            <span>{new Date(r.expires_at).toLocaleDateString()}</span>
                            {isExp && <span className="block text-rose-500 font-bold">Vencido</span>}
                          </div>
                        ) : (
                          "Sin vencimiento"
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyLink(r.referral_code)}
                            title="Copiar link compartible"
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs"
                          >
                            {copiedLink === r.referral_code ? (
                              <FaCheck className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <FaLink className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleWhatsAppShare(r.referral_code, r.referrer?.full_name)}
                            title="Compartir por WhatsApp"
                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 transition-colors shadow-2xs"
                          >
                            <FaWhatsapp className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL 1: GENERAR CÓDIGO ────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <FaGift className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Generar Código de Referido
                  </h3>
                  <p className="text-3xs text-slate-400">
                    Selecciona al cliente que compartirá el código
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            {createdSuccessData ? (
              <div className="text-center space-y-4 py-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 mx-auto flex items-center justify-center">
                  <FaCheckCircle className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                    ¡Código generado con éxito!
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Cliente: <strong>{createdSuccessData.referrerName}</strong>
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-indigo-300 dark:border-indigo-800">
                  <span className="text-2xl font-black font-mono tracking-widest text-indigo-600 dark:text-indigo-400">
                    {createdSuccessData.code}
                  </span>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleWhatsAppShare(createdSuccessData.code, createdSuccessData.referrerName)}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <FaWhatsapp className="w-4 h-4" />
                    <span>Compartir por WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(createdSuccessData.code)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <FaLink className="w-3.5 h-3.5" />
                    <span>Copiar Enlace</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="mt-2 text-xs text-slate-400 hover:text-slate-600 font-semibold"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Buscar Cliente Referidor
                  </label>
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Escribe el nombre del cliente..."
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-800 divide-y divide-gray-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                    {filteredCustomerList.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedReferrerId(c.id)}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                          selectedReferrerId === c.id
                            ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        <span>{c.full_name}</span>
                        {selectedReferrerId === c.id && <FaCheck className="w-3 h-3 text-indigo-600" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-3xs text-indigo-900 dark:text-indigo-200 space-y-1">
                  <p>
                    • Referidor recibirá <strong>{settings.referrer_discount_percent}% de descuento</strong> en su próxima compra.
                  </p>
                  <p>
                    • El nuevo cliente recibirá <strong>{settings.referred_discount_percent}% de descuento</strong> en su primera compra.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateCode}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
                  >
                    Generar Código
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 2: VINCULAR REFERIDO ─────────────────────────────────────── */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <FaLink className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Vincular Código a Cliente
                  </h3>
                  <p className="text-3xs text-slate-400">
                    Asocia un código al cliente nuevo antes de su compra
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Código de Referido
                </label>
                <input
                  type="text"
                  value={linkCodeInput}
                  onChange={(e) => setLinkCodeInput(e.target.value.toUpperCase())}
                  placeholder="Ej: REF-AB12CD"
                  className="w-full px-3 py-2 text-xs font-mono font-bold tracking-wider border border-gray-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-teal-500 outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Cliente que usará el código (Referido)
                </label>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                  <input
                    type="text"
                    value={linkCustomerSearch}
                    onChange={(e) => setLinkCustomerSearch(e.target.value)}
                    placeholder="Buscar cliente referido..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-800 divide-y divide-gray-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                  {filteredLinkCustomerList.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setLinkReferredId(c.id)}
                      className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                        linkReferredId === c.id
                          ? "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <span>{c.full_name}</span>
                      {linkReferredId === c.id && <FaCheck className="w-3 h-3 text-teal-600" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleLinkReferral}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
                >
                  Vincular Código
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: CONFIGURACIÓN ─────────────────────────────────────────── */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center">
                  <FaCog className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Configuración del Programa
                  </h3>
                  <p className="text-3xs text-slate-400">
                    Ajustá los porcentajes y reglas de los referidos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800">
                <div>
                  <span className="text-xs font-bold text-gray-900 dark:text-white block">
                    Programa Activo
                  </span>
                  <span className="text-3xs text-slate-400 block">
                    Permite generar y canjear nuevos códigos
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.is_active}
                  onChange={(e) => setSettings({ ...settings, is_active: e.target.checked })}
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    % Descuento Referidor
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={settings.referrer_discount_percent}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          referrer_discount_percent: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full pl-3 pr-8 py-2 text-xs border border-gray-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 font-bold outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                      %
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    % Descuento Referido
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={settings.referred_discount_percent}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          referred_discount_percent: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full pl-3 pr-8 py-2 text-xs border border-gray-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 font-bold outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                      %
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Máx. Referidos Activos
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={settings.max_referrals_per_customer}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        max_referrals_per_customer: Number(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Días de Vigencia
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={settings.expiration_days}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        expiration_days: Number(e.target.value) || 90,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 font-bold outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
