"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import {
  FaSave, FaUpload, FaStore, FaMapMarkerAlt, FaPhone,
  FaImage, FaCheck, FaLock, FaPalette, FaDownload, FaFileImport,
  FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaSpinner,
  FaEnvelope, FaBuilding
} from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { useLayout } from '@/contexts/LayoutContext';
import {
  HiOutlineDesktopComputer,
  HiTemplate,
  HiOutlineOfficeBuilding,
  HiOutlinePhotograph,
  HiOutlineColorSwatch,
  HiOutlineDatabase
} from 'react-icons/hi';

type Tab = 'general' | 'branding' | 'appearance' | 'migration';

type MigrationResult = {
  table: string;
  imported: number;
  status: string;
  error?: string;
};

type ImportReport = {
  imported_at: string;
  results: MigrationResult[];
  totals: {
    tables_processed: number;
    successful: number;
    failed: number;
    total_rows: number;
  };
};

type BundlePreview = {
  version: string;
  format: string;
  exported_at: string;
  source_url: string;
  table_order: string[];
  record_counts: Record<string, number>;
};

export default function SettingsPage() {
  const router = useRouter();
  const { layout, setLayout } = useLayout();
  const [activeTab, setActiveTab] = useState<Tab>('general');

  const [settings, setSettings] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Logo states
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Auth states
  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Migration states
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [bundlePreview, setBundlePreview] = useState<BundlePreview | null>(null);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [showConfirmImport, setShowConfirmImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkUserRole = async () => {
      setCheckingAuth(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      const role = profile?.role || 'vendedor';
      setUserRole(role);

      if (role !== 'administrador') {
        toast.error('No tienes permisos para acceder a esta página');
        router.push('/dashboard');
        return;
      }

      setCheckingAuth(false);
      fetchSettings();
    };

    checkUserRole();
  }, [router]);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('settings').select('*');
    if (data) {
      const settingsMap = data.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as { [key: string]: string });
      setSettings(settingsMap);
    }
    setLoading(false);
  };

  const handleInputChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    const updates = Object.entries(settings).map(([key, value]) => ({ key, value }));

    const { error } = await supabase.from('settings').upsert(updates, { onConflict: 'key' });

    if (error) {
      toast.error(`Error al guardar: ${error.message}`);
    } else {
      toast.success('✓ Configuración guardada exitosamente');
    }
    setSaving(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    setLogoFile(file);

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setUploading(true);

    const fileName = `logo-${Date.now()}`;
    const { data, error: uploadError } = await supabase.storage
      .from('logos')
      .upload(fileName, logoFile, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      toast.error(`Error al subir el logo: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('logos')
      .getPublicUrl(fileName);

    if (publicUrlData?.publicUrl) {
      handleInputChange('logo_url', publicUrlData.publicUrl);
      toast.success('✓ Logo subido. ¡No olvides guardar!');
    } else {
      toast.error('No se pudo obtener la URL pública del logo.');
    }
    setUploading(false);
    setLogoFile(null);
    setPreviewUrl(null);
  };

  // ─── Migration Functions ───

  const handleExport = async () => {
    setExporting(true);
    setExportProgress('Conectando con el servidor...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sesión expirada');
        setExporting(false);
        return;
      }

      setExportProgress('Exportando datos de todas las tablas...');

      const response = await fetch('/api/migration', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error al exportar');
      }

      setExportProgress('Generando archivo de descarga...');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `migration_bundle_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('✅ Exportación completada. Archivo descargado.');
      setExportProgress('');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(`Error: ${msg}`);
      setExportProgress('');
    } finally {
      setExporting(false);
    }
  };

  const handleImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportReport(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.format !== 'frontstock-migration-bundle') {
        toast.error('Archivo no válido. Se espera un migration_bundle.json exportado por este sistema.');
        setImportFile(null);
        setBundlePreview(null);
        return;
      }

      setBundlePreview({
        version: data.version,
        format: data.format,
        exported_at: data.exported_at,
        source_url: data.source_url,
        table_order: data.table_order,
        record_counts: data.record_counts || {},
      });
    } catch {
      toast.error('Error al leer el archivo. Verificá que sea un JSON válido.');
      setImportFile(null);
      setBundlePreview(null);
    }
  };

  const handleImport = async () => {
    if (!importFile || !bundlePreview) return;

    setShowConfirmImport(false);
    setImporting(true);
    setImportReport(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sesión expirada');
        setImporting(false);
        return;
      }

      const text = await importFile.text();
      const bundle = JSON.parse(text);

      const response = await fetch('/api/migration', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bundle),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error al importar');
      }

      const report: ImportReport = await response.json();
      setImportReport(report);

      if (report.totals.failed === 0) {
        toast.success('🎉 Importación completada exitosamente');
      } else {
        toast.error(`Importación finalizada con ${report.totals.failed} errores`);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(`Error: ${msg}`);
    } finally {
      setImporting(false);
    }
  };

  const totalRecords = bundlePreview
    ? Object.values(bundlePreview.record_counts).reduce((a, b) => a + b, 0)
    : 0;

  if (checkingAuth || (userRole !== 'administrador' && userRole !== null)) {
    return (
      <div className="flex items-center justify-center min-h-full bg-gray-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-50 tracking-tight">
            Configuración
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Administra la información, marca y apariencia de tu sistema.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar de Navegación */}
          <nav className="lg:w-64 flex-shrink-0 space-y-1">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200
                ${activeTab === 'general'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-gray-200 dark:ring-slate-700'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800/50 hover:text-gray-900 dark:hover:text-slate-200'
                }`}
            >
              <HiOutlineOfficeBuilding className="text-lg flex-shrink-0" />
              General
            </button>
            <button
              onClick={() => setActiveTab('branding')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200
                ${activeTab === 'branding'
                  ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm ring-1 ring-gray-200 dark:ring-slate-700'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800/50 hover:text-gray-900 dark:hover:text-slate-200'
                }`}
            >
              <HiOutlinePhotograph className="text-lg flex-shrink-0" />
              Marca y Logo
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200
                ${activeTab === 'appearance'
                  ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm ring-1 ring-gray-200 dark:ring-slate-700'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800/50 hover:text-gray-900 dark:hover:text-slate-200'
                }`}
            >
              <HiOutlineDesktopComputer className="text-lg flex-shrink-0" />
              Estilos y Apariencia
            </button>
            <button
              onClick={() => setActiveTab('migration')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200
                ${activeTab === 'migration'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm ring-1 ring-gray-200 dark:ring-slate-700'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800/50 hover:text-gray-900 dark:hover:text-slate-200'
                }`}
            >
              <HiOutlineDatabase className="text-lg flex-shrink-0" />
              Migración de Datos
            </button>
          </nav>

          {/* Área de Contenido */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-slate-800 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">

                {/* Header del Panel */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                    {activeTab === 'general' && 'Información General'}
                    {activeTab === 'branding' && 'Marca y Logo'}
                    {activeTab === 'appearance' && 'Estilos y Apariencia'}
                    {activeTab === 'migration' && 'Migración de Datos'}
                  </h2>
                  {activeTab !== 'migration' && (
                    <button
                      onClick={handleSaveSettings}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <FaSave /> Guardar Cambios
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="p-6 lg:p-8">
                  {/* SECCIÓN GENERAL */}
                  {activeTab === 'general' && (
                    <div className="space-y-6 max-w-4xl">
                      <h3 className="text-sm font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b border-gray-100 dark:border-slate-800 pb-2">
                        Identidad de la Empresa
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="group">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                            Razón Social
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                              <FaBuilding />
                            </div>
                            <input
                              type="text"
                              value={settings.business_name || ''}
                              onChange={e => handleInputChange('business_name', e.target.value)}
                              placeholder="Ej: Mi Empresa S.A."
                              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-gray-900 dark:text-white sm:text-sm"
                            />
                          </div>
                        </div>

                        <div className="group">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                            Nombre de Fantasía
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                              <FaStore />
                            </div>
                            <input
                              type="text"
                              value={settings.business_fantasy_name || ''}
                              onChange={e => handleInputChange('business_fantasy_name', e.target.value)}
                              placeholder="Ej: Almacén Don Juan"
                              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-gray-900 dark:text-white sm:text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      <h3 className="text-sm font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b border-gray-100 dark:border-slate-800 pb-2 pt-4">
                        Datos Fiscales (AFIP / ARCA)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="group">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                            CUIT
                          </label>
                          <input
                            type="text"
                            value={settings.business_cuit || ''}
                            onChange={e => handleInputChange('business_cuit', e.target.value)}
                            placeholder="Ej: 30-12345678-9"
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-gray-900 dark:text-white sm:text-sm"
                          />
                        </div>

                        <div className="group">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                            Ingresos Brutos (IIBB)
                          </label>
                          <input
                            type="text"
                            value={settings.business_iibb || ''}
                            onChange={e => handleInputChange('business_iibb', e.target.value)}
                            placeholder="Ej: 30-12345678-9 o CM"
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-gray-900 dark:text-white sm:text-sm"
                          />
                        </div>

                        <div className="group">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                            Inicio de Actividades
                          </label>
                          <input
                            type="text"
                            value={settings.business_start_date || ''}
                            onChange={e => handleInputChange('business_start_date', e.target.value)}
                            placeholder="Ej: 01/01/2020"
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-gray-900 dark:text-white sm:text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="group">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                            Condición ante el IVA
                          </label>
                          <select
                            value={settings.business_iva_condition || 'Responsable Inscripto'}
                            onChange={e => handleInputChange('business_iva_condition', e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-gray-900 dark:text-white sm:text-sm"
                          >
                            <option value="Responsable Inscripto">Responsable Inscripto</option>
                            <option value="Monotributista">Monotributista</option>
                            <option value="Exento">Exento</option>
                          </select>
                        </div>

                        <div className="group">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                            Punto de Venta
                          </label>
                          <input
                            type="text"
                            value={settings.business_point_of_sale || '1'}
                            onChange={e => handleInputChange('business_point_of_sale', e.target.value)}
                            placeholder="Ej: 1"
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-gray-900 dark:text-white sm:text-sm"
                          />
                        </div>
                      </div>

                      <h3 className="text-sm font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b border-gray-100 dark:border-slate-800 pb-2 pt-4">
                        Contacto y Ubicación
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="group md:col-span-3">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                            Dirección
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                              <FaMapMarkerAlt />
                            </div>
                            <input
                              type="text"
                              value={settings.business_address || ''}
                              onChange={e => handleInputChange('business_address', e.target.value)}
                              placeholder="Ej: Av. San Martín 1234"
                              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-gray-900 dark:text-white sm:text-sm"
                            />
                          </div>
                        </div>

                        <div className="group">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                            Localidad
                          </label>
                          <input
                            type="text"
                            value={settings.business_locality || ''}
                            onChange={e => handleInputChange('business_locality', e.target.value)}
                            placeholder="Ej: Rosario"
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-gray-900 dark:text-white sm:text-sm"
                          />
                        </div>

                        <div className="group">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                            Provincia
                          </label>
                          <input
                            type="text"
                            value={settings.business_province || ''}
                            onChange={e => handleInputChange('business_province', e.target.value)}
                            placeholder="Ej: Santa Fe"
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-gray-900 dark:text-white sm:text-sm"
                          />
                        </div>

                        <div className="group">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                            Teléfono
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                              <FaPhone />
                            </div>
                            <input
                              type="text"
                              value={settings.business_phone || ''}
                              onChange={e => handleInputChange('business_phone', e.target.value)}
                              placeholder="Ej: +54 9 341 123456"
                              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-gray-900 dark:text-white sm:text-sm"
                            />
                          </div>
                        </div>

                        <div className="group md:col-span-3">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                            Email de Contacto
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                              <FaEnvelope />
                            </div>
                            <input
                              type="email"
                              value={settings.business_email || ''}
                              onChange={e => handleInputChange('business_email', e.target.value)}
                              placeholder="Ej: contacto@miempresa.com"
                              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-gray-900 dark:text-white sm:text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SECCIÓN BRANDING */}
                  {activeTab === 'branding' && (
                    <div className="space-y-8">
                      <div className="flex flex-col sm:flex-row gap-8 items-start">
                        {/* Preview Logo */}
                        <div className="p-1 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-800 dark:to-slate-900 border border-dashed border-gray-300 dark:border-slate-700 flex-shrink-0">
                          <div className="w-40 h-40 bg-white dark:bg-slate-950 rounded-xl flex items-center justify-center p-4 relative overflow-hidden group">
                            {previewUrl || settings.logo_url ? (
                              <img
                                src={previewUrl || settings.logo_url}
                                alt="Logo"
                                className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-110"
                              />
                            ) : (
                              <div className="text-gray-300 dark:text-slate-700 flex flex-col items-center">
                                <FaImage className="text-4xl mb-2" />
                                <span className="text-xs">Sin Logo</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 max-w-md space-y-4">
                          <div className="relative group">
                            <label htmlFor="logo-upload" className="flex items-center justify-center w-full px-4 py-10 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all">
                              <div className="space-y-2 text-center">
                                <FaUpload className="mx-auto h-8 w-8 text-gray-400 dark:text-slate-500 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors" />
                                <div className="text-sm text-gray-600 dark:text-slate-300">
                                  <span className="font-semibold text-purple-600 dark:text-purple-400">Clic para subir</span> o arrastra y suelta
                                </div>
                                <p className="text-xs text-gray-500 dark:text-slate-500">PNG, JPG hasta 5MB</p>
                              </div>
                              <input id="logo-upload" type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
                            </label>
                          </div>

                          <button
                            onClick={handleLogoUpload}
                            disabled={!logoFile || uploading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                          >
                            {uploading ? 'Subiendo...' : 'Subir y Actualizar Logo'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SECCIÓN APARIENCIA */}
                  {activeTab === 'appearance' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                          onClick={() => setLayout('sidebar')}
                          className={`relative group p-4 rounded-xl border-2 transition-all text-left flex flex-col gap-4 overflow-hidden
                            ${layout === 'sidebar'
                              ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/10'
                              : 'border-gray-200 dark:border-slate-800 hover:border-teal-200 dark:hover:border-teal-800/50'
                            }`}
                        >
                          <div className="flex items-center justify-between w-full z-10">
                            <span className={`text-base font-bold ${layout === 'sidebar' ? 'text-teal-700 dark:text-teal-400' : 'text-gray-900 dark:text-slate-200'}`}>
                              Sidebar Lateral
                            </span>
                            {layout === 'sidebar' && (
                              <div className="h-6 w-6 bg-teal-500 rounded-full flex items-center justify-center text-white text-xs">
                                <FaCheck />
                              </div>
                            )}
                          </div>

                          {/* Miniatura Visual CSS */}
                          <div className="flex gap-2 w-full h-32 bg-gray-100 dark:bg-slate-950 rounded-lg p-2 border border-black/5 dark:border-white/5">
                            <div className="w-16 h-full bg-teal-600/20 dark:bg-teal-400/20 rounded border border-teal-600/30 dark:border-teal-400/30 animate-pulse"></div>
                            <div className="flex-1 flex flex-col gap-2">
                              <div className="w-full h-4 bg-gray-200 dark:bg-slate-800 rounded"></div>
                              <div className="flex-1 bg-white dark:bg-slate-900 rounded border border-dashed border-gray-300 dark:border-slate-800"></div>
                            </div>
                          </div>

                          <p className="text-sm text-gray-500 dark:text-slate-400 z-10">
                            Navegación vertical fija a la izquierda.
                          </p>
                        </button>

                        <button
                          onClick={() => setLayout('navbar')}
                          className={`relative group p-4 rounded-xl border-2 transition-all text-left flex flex-col gap-4 overflow-hidden
                            ${layout === 'navbar'
                              ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/10'
                              : 'border-gray-200 dark:border-slate-800 hover:border-teal-200 dark:hover:border-teal-800/50'
                            }`}
                        >
                          <div className="flex items-center justify-between w-full z-10">
                            <span className={`text-base font-bold ${layout === 'navbar' ? 'text-teal-700 dark:text-teal-400' : 'text-gray-900 dark:text-slate-200'}`}>
                              Navbar Superior
                            </span>
                            {layout === 'navbar' && (
                              <div className="h-6 w-6 bg-teal-500 rounded-full flex items-center justify-center text-white text-xs">
                                <FaCheck />
                              </div>
                            )}
                          </div>

                          {/* Miniatura Visual CSS */}
                          <div className="flex flex-col gap-2 w-full h-32 bg-gray-100 dark:bg-slate-950 rounded-lg p-2 border border-black/5 dark:border-white/5">
                            <div className="w-full h-8 bg-teal-600/20 dark:bg-teal-400/20 rounded border border-teal-600/30 dark:border-teal-400/30 animate-pulse"></div>
                            <div className="flex-1 w-full bg-white dark:bg-slate-900 rounded border border-dashed border-gray-300 dark:border-slate-800"></div>
                          </div>

                          <p className="text-sm text-gray-500 dark:text-slate-400 z-10">
                            Barra superior horizontal compacta.
                          </p>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SECCIÓN MIGRACIÓN */}
                  {activeTab === 'migration' && (
                    <div className="space-y-10">

                      {/* ── EXPORTAR ── */}
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-10 w-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                            <FaDownload className="text-sm" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">Exportar Datos</h3>
                            <p className="text-xs text-gray-500 dark:text-slate-400">Descargá un backup completo del sistema</p>
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-xl p-5 border border-emerald-200/50 dark:border-emerald-800/30">
                          <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                            Se exportarán <strong className="text-gray-900 dark:text-slate-200">24 tablas</strong> con todos los registros:
                            productos, clientes, ventas, pedidos, pagos, proveedores, presupuestos, gastos, movimientos de stock y más.
                          </p>

                          <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 text-sm"
                          >
                            {exporting ? (
                              <>
                                <FaSpinner className="animate-spin" />
                                {exportProgress || 'Exportando...'}
                              </>
                            ) : (
                              <>
                                <FaDownload />
                                Exportar Todos los Datos
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Separador */}
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200 dark:border-slate-800" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="bg-white dark:bg-slate-900 px-4 text-gray-400 dark:text-slate-500 font-medium">
                            ó
                          </span>
                        </div>
                      </div>

                      {/* ── IMPORTAR ── */}
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-10 w-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                            <FaFileImport className="text-sm" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">Importar Datos</h3>
                            <p className="text-xs text-gray-500 dark:text-slate-400">Restaurá datos desde un backup exportado</p>
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-xl p-5 border border-amber-200/50 dark:border-amber-800/30">
                          {/* File upload zone */}
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className="flex flex-col items-center justify-center w-full px-4 py-8 border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-xl cursor-pointer hover:border-amber-500 dark:hover:border-amber-500 hover:bg-amber-100/30 dark:hover:bg-amber-900/20 transition-all mb-4"
                          >
                            <FaUpload className="text-2xl text-amber-400 dark:text-amber-500 mb-2" />
                            <p className="text-sm text-gray-600 dark:text-slate-300">
                              <span className="font-semibold text-amber-600 dark:text-amber-400">Clic para seleccionar</span>{' '}
                              migration_bundle.json
                            </p>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                              Solo archivos .json exportados por este sistema
                            </p>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".json"
                              className="hidden"
                              onChange={handleImportFileSelect}
                            />
                          </div>

                          {/* Bundle Preview */}
                          {bundlePreview && (
                            <div className="space-y-4">
                              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-amber-200 dark:border-slate-700">
                                <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                                  <FaCheckCircle className="text-emerald-500" />
                                  Archivo válido
                                </h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="text-gray-500 dark:text-slate-400">Versión:</span>
                                    <span className="ml-2 font-medium text-gray-900 dark:text-slate-200">{bundlePreview.version}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 dark:text-slate-400">Exportado:</span>
                                    <span className="ml-2 font-medium text-gray-900 dark:text-slate-200">
                                      {new Date(bundlePreview.exported_at).toLocaleString('es-AR')}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 dark:text-slate-400">Tablas:</span>
                                    <span className="ml-2 font-medium text-gray-900 dark:text-slate-200">{bundlePreview.table_order.length}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 dark:text-slate-400">Registros totales:</span>
                                    <span className="ml-2 font-medium text-gray-900 dark:text-slate-200">{totalRecords.toLocaleString('es-AR')}</span>
                                  </div>
                                </div>

                                {/* Table breakdown */}
                                <details className="mt-4">
                                  <summary className="text-xs text-gray-500 dark:text-slate-400 cursor-pointer hover:text-gray-700 dark:hover:text-slate-300 font-medium">
                                    Ver detalle por tabla
                                  </summary>
                                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs max-h-48 overflow-y-auto">
                                    {bundlePreview.table_order.map((table) => (
                                      <div
                                        key={table}
                                        className="flex justify-between bg-gray-50 dark:bg-slate-900 rounded px-2 py-1.5"
                                      >
                                        <span className="text-gray-600 dark:text-slate-400 truncate">{table}</span>
                                        <span className="font-mono text-gray-900 dark:text-slate-200 ml-2 flex-shrink-0">
                                          {(bundlePreview.record_counts[table] || 0).toLocaleString()}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              </div>

                              {/* Import button */}
                              <button
                                onClick={() => setShowConfirmImport(true)}
                                disabled={importing}
                                className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-amber-600/20 hover:shadow-lg hover:shadow-amber-600/30 text-sm"
                              >
                                {importing ? (
                                  <>
                                    <FaSpinner className="animate-spin" />
                                    Importando datos...
                                  </>
                                ) : (
                                  <>
                                    <FaFileImport />
                                    Iniciar Importación
                                  </>
                                )}
                              </button>
                            </div>
                          )}

                          {/* Import Report */}
                          {importReport && (
                            <div className="mt-6 bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                              <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">
                                📊 Reporte de Importación
                              </h4>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-3 text-center">
                                  <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">{importReport.totals.tables_processed}</div>
                                  <div className="text-xs text-gray-500 dark:text-slate-400">Tablas</div>
                                </div>
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{importReport.totals.successful}</div>
                                  <div className="text-xs text-emerald-600 dark:text-emerald-400">Exitosas</div>
                                </div>
                                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{importReport.totals.failed}</div>
                                  <div className="text-xs text-red-600 dark:text-red-400">Fallidas</div>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{importReport.totals.total_rows.toLocaleString()}</div>
                                  <div className="text-xs text-blue-600 dark:text-blue-400">Registros</div>
                                </div>
                              </div>

                              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                {importReport.results.map((r) => (
                                  <div
                                    key={r.table}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                                      r.status === 'ok'
                                        ? 'bg-emerald-50 dark:bg-emerald-900/10'
                                        : r.status === 'error'
                                        ? 'bg-red-50 dark:bg-red-900/10'
                                        : 'bg-gray-50 dark:bg-slate-900'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      {r.status === 'ok' && <FaCheckCircle className="text-emerald-500 flex-shrink-0" />}
                                      {r.status === 'error' && <FaTimesCircle className="text-red-500 flex-shrink-0" />}
                                      {r.status === 'empty' && <span className="w-4 h-4 rounded-full bg-gray-300 dark:bg-slate-600 flex-shrink-0" />}
                                      <span className="font-medium text-gray-700 dark:text-slate-300">{r.table}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="font-mono text-xs text-gray-500 dark:text-slate-400">
                                        {r.imported} filas
                                      </span>
                                      {r.error && (
                                        <span className="text-xs text-red-500 max-w-[200px] truncate" title={r.error}>
                                          {r.error}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Warning note */}
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-start gap-3">
                          <FaExclamationTriangle className="text-amber-500 mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-gray-500 dark:text-slate-400 space-y-1">
                            <p><strong className="text-gray-700 dark:text-slate-300">Nota sobre usuarios:</strong> Los perfiles de usuario dependen de <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">auth.users</code>. Los usuarios deben crearse primero manualmente en la nueva instancia de Supabase.</p>
                            <p><strong className="text-gray-700 dark:text-slate-300">También disponible por CLI:</strong> <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">npm run export:all</code> y <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">npm run import:all</code></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal de confirmación de importación ── */}
      {showConfirmImport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-red-500 p-4">
              <div className="flex items-center gap-3 text-white">
                <FaExclamationTriangle className="text-2xl" />
                <h3 className="text-lg font-bold">Confirmar Importación</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Esta operación va a <strong className="text-red-600 dark:text-red-400">sobrescribir datos existentes</strong> con
                los del archivo importado ({totalRecords.toLocaleString()} registros en {bundlePreview?.table_order.length} tablas).
              </p>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                  ⚠️ Se recomienda hacer una exportación de respaldo antes de continuar.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowConfirmImport(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors text-sm shadow-lg shadow-red-600/20"
                >
                  Sí, Importar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}