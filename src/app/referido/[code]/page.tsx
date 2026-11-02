"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getReferralByCode } from "@/app/actions/referralActions";
import {
  FaGift,
  FaCopy,
  FaCheck,
  FaWhatsapp,
  FaPercent,
  FaClock,
  FaExclamationTriangle,
} from "react-icons/fa";
import Image from "next/image";

interface ReferralData {
  id: string;
  referral_code: string;
  status: string;
  referred_discount_percent: number;
  referred_discount_used: boolean;
  expires_at: string | null;
  referrer?: {
    full_name?: string;
  } | null;
}

export default function PublicReferralPage() {
  const params = useParams();
  const rawCode = (params?.code as string) || "";
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [referral, setReferral] = useState<ReferralData | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!rawCode) {
        setLoading(false);
        return;
      }
      try {
        const data = await getReferralByCode(rawCode);
        setReferral(data as any);
      } catch (err) {
        console.error("Error loading referral:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [rawCode]);

  const handleCopy = () => {
    if (!rawCode) return;
    navigator.clipboard.writeText(rawCode.toUpperCase());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const referrerName = referral?.referrer?.full_name || "Un amigo";
  const discountPercent = referral?.referred_discount_percent || 10;
  const isExpired = referral?.expires_at && new Date(referral.expires_at) < new Date();
  const isUsed = referral?.referred_discount_used === true;
  const isAvailable = referral && !isExpired && !isUsed;

  const whatsappMessage = encodeURIComponent(
    `¡Hola! Recibí una invitación de ${referrerName} con el código de descuento *${rawCode.toUpperCase()}* (${discountPercent}% OFF). Quiero hacer un pedido.`
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071426] via-[#0b2140] to-[#06101f] text-white flex flex-col justify-between p-4 sm:p-8">
      {/* Barra superior */}
      <header className="max-w-xl mx-auto w-full flex items-center justify-between py-4">
        <div className="flex items-center gap-2.5">
          <Image
            src="/Logo-nuevo.png"
            alt="FrontStock"
            width={40}
            height={40}
            className="h-10 w-10 object-contain drop-shadow-[0_4px_12px_rgba(14,165,233,0.35)]"
            priority
          />
          <div className="leading-none">
            <span className="block text-lg font-black tracking-[0.12em] text-white">
              FRONTSTOCK
            </span>
            <span className="mt-1 block text-[9px] font-semibold tracking-[0.2em] text-sky-300/75">
              GESTIÓN INTELIGENTE
            </span>
          </div>
        </div>
        <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/10 text-sky-100/80">
          Programa de Referidos
        </span>
      </header>

      {/* Tarjeta principal */}
      <main className="max-w-md mx-auto w-full my-auto py-6">
        {loading ? (
          <div className="bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-3xl p-8 text-center space-y-4 animate-pulse">
            <div className="w-16 h-16 rounded-2xl bg-white/20 mx-auto"></div>
            <div className="h-6 bg-white/20 rounded-md w-3/4 mx-auto"></div>
            <div className="h-4 bg-white/20 rounded-md w-1/2 mx-auto"></div>
          </div>
        ) : !referral ? (
          <div className="bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-3xl p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/30">
              <FaExclamationTriangle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white">Código no encontrado</h1>
            <p className="text-sm text-slate-300">
              El código <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded">{rawCode.toUpperCase()}</span> no existe o no está registrado.
            </p>
            <div className="pt-2">
              <p className="text-xs text-slate-400">
                Verificá que el enlace esté completo o consultá con quien te invitó.
              </p>
            </div>
          </div>
        ) : isExpired ? (
          <div className="bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-3xl p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center border border-rose-500/30">
              <FaClock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white">Código Expirado</h1>
            <p className="text-sm text-slate-300">
              Este cupón de referido ha superado su fecha de vigencia.
            </p>
          </div>
        ) : isUsed ? (
          <div className="bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-3xl p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-400 mx-auto flex items-center justify-center border border-blue-500/30">
              <FaCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white">Cupón ya Utilizado</h1>
            <p className="text-sm text-slate-300">
              Este código de referido ya fue canjeado en una compra previa.
            </p>
          </div>
        ) : (
          <div className="relative bg-white/[0.09] backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/30 overflow-hidden">
            {/* Resplandor decorativo */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-sky-500/25 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/25 rounded-full blur-3xl pointer-events-none" />

            <div className="text-center space-y-3 relative z-10">
              {/* Ícono de regalo animado */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-cyan-400 mx-auto flex items-center justify-center shadow-lg shadow-sky-500/30 transform hover:scale-105 transition-transform duration-300">
                <FaGift className="w-8 h-8 text-white animate-bounce" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-400/10 border border-sky-300/25 text-sky-200 text-xs font-semibold">
                <span>Beneficio Exclusivo</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                ¡Te regalaron un {discountPercent}% OFF!
              </h1>

              <p className="text-sm text-slate-200/90 leading-relaxed">
                Tu amigo <strong className="text-white font-bold">{referrerName}</strong> te ha invitado a disfrutar de un descuento especial en tu primera compra.
              </p>
            </div>

            {/* Voucher cupón */}
            <div className="mt-6 p-4 rounded-2xl bg-[#061426]/75 border-2 border-dashed border-sky-400/35 text-center relative">
              <p className="text-[11px] font-bold uppercase tracking-wider text-sky-300 mb-1">
                Tu código de descuento
              </p>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-white py-1">
                {referral.referral_code}
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-xs font-bold text-white border border-white/20"
              >
                {copied ? (
                  <>
                    <FaCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">¡Copiado al portapapeles!</span>
                  </>
                ) : (
                  <>
                    <FaCopy className="w-3.5 h-3.5 text-sky-300" />
                    <span>Copiar código</span>
                  </>
                )}
              </button>
            </div>

            {/* Pasos para canjear */}
            <div className="mt-6 space-y-2.5 text-xs text-slate-300">
              <p className="font-bold text-white text-sm mb-1 flex items-center gap-1.5">
                <span>¿Cómo usar tu descuento?</span>
              </p>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-sky-500/25 text-sky-200 flex items-center justify-center font-bold text-3xs flex-shrink-0 mt-0.5">
                  1
                </span>
                <span>Copiá o guardá tu código de descuento <strong>{referral.referral_code}</strong>.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-sky-500/25 text-sky-200 flex items-center justify-center font-bold text-3xs flex-shrink-0 mt-0.5">
                  2
                </span>
                <span>Contactanos por WhatsApp o presentalo en el local al momento de abonar.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-sky-500/25 text-sky-200 flex items-center justify-center font-bold text-3xs flex-shrink-0 mt-0.5">
                  3
                </span>
                <span>¡Listo! Se te aplicará automáticamente el {discountPercent}% de ahorro.</span>
              </div>
            </div>

            {/* Acciones principales */}
            <div className="mt-6 space-y-3 pt-2">
              <a
                href={`https://wa.me/?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-98 transition-all font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30"
              >
                <FaWhatsapp className="w-4 h-4" />
                <span>Pedir por WhatsApp ahora</span>
              </a>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-xl mx-auto w-full text-center py-4 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} FrontStock · Todos los derechos reservados</p>
      </footer>
    </div>
  );
}
