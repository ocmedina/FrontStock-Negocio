"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { User, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import MaintenanceBanner from "@/components/MaintenanceBanner";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Buscar el usuario por username en la tabla profiles
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("email, role, is_active")
        .eq("username", username.trim())
        .single();

      if (profileError || !profileData) {
        toast.error("Usuario no encontrado.");
        setLoading(false);
        return;
      }

      // Verificar si el usuario está activo
      if (!profileData.is_active) {
        toast.error("Tu cuenta está desactivada. Contacta al administrador.");
        setLoading(false);
        return;
      }

      // Hacer login con Supabase Auth
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profileData.email,
        password,
      });

      if (signInError) {
        toast.error("Contraseña incorrecta.");
        setLoading(false);
        return;
      }

      // Redireccionar según el rol
      if (profileData.role === "repartidor") {
        router.push("/reparto");
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error en login:", error);
      toast.error("Error al iniciar sesión. Intenta nuevamente.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden flex flex-col justify-between p-6">
      {/* Background ambient glows */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-blue-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[110px] pointer-events-none" />

      {/* Maintenance Banner */}
      <div className="w-full max-w-md mx-auto z-20">
        <MaintenanceBanner />
      </div>

      {/* Main Container */}
      <div className="w-full max-w-md mx-auto my-auto relative z-10 py-8 animate-fadeIn">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-xl mb-4 relative">
            <img
              src="/favicon.png"
              alt="FrontStock Logo"
              className="w-12 h-12 object-contain rounded-xl"
            />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Acceso a{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-600">
              FrontStock
            </span>
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
            Ingresa tus credenciales
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-8 border border-slate-805 shadow-2xl space-y-6">
          <form onSubmit={handleSignIn} className="space-y-5">
            
            {/* Username Input */}
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2"
              >
                Usuario
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="nombre.apellido"
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/45 focus:border-transparent transition-all text-sm font-medium"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/45 focus:border-transparent transition-all text-sm font-medium"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Iniciar sesión submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 mt-2 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-650 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-500/5"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Ingresar al sistema
                  <ArrowRight className="w-4.5 h-4.5" />
                </>
              )}
            </button>
          </form>

          {/* Help Footer */}
          <div className="pt-5 border-t border-slate-800/80 text-center">
            <p className="text-[11px] font-semibold text-slate-400 leading-relaxed">
              ¿Problemas para acceder? Por favor, solicita soporte técnico o restablecimiento al administrador del sistema.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-slate-500 text-xs font-semibold relative z-10">
        <p>© {new Date().getFullYear()} FrontStock. Todos los derechos reservados.</p>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}