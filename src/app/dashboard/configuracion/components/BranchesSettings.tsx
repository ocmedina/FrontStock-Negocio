'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FaBuilding, FaCheck, FaEdit, FaPlus, FaTimes } from 'react-icons/fa';
import { supabase } from '@/lib/supabaseClient';
import {
  createBranch,
  listBranchesForSettings,
  updateBranch,
  type BranchRecord,
} from '@/app/actions/branchActions';

const emptyForm = {
  name: '', description: '', is_active: false, fantasy_name: '', address: '',
  locality: '', province: '', phone: '', email: '', cuit: '', iibb: '',
  iva_condition: '', start_date: '', point_of_sale: '', logo_url: '', copy_stock_from: '',
};

export default function BranchesSettings() {
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [copyProducts, setCopyProducts] = useState<Array<{ id: string; name: string; sku: string | null; stock: number }>>([]);
  const [selectedCopyProductIds, setSelectedCopyProductIds] = useState<string[]>([]);
  const [cloneSourceId, setCloneSourceId] = useState<number | null>(null);
  const [cloneTargetId, setCloneTargetId] = useState<number | null>(null);
  const [cloneProducts, setCloneProducts] = useState<Array<{ id: string; name: string; sku: string | null; stock: number }>>([]);
  const [selectedCloneProductIds, setSelectedCloneProductIds] = useState<string[]>([]);
  const [cloningStock, setCloningStock] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadBranches = async () => {
    setLoading(true);
    const result = await listBranchesForSettings();
    if (result.success) setBranches(result.data ?? []);
    else toast.error(result.error || 'No se pudieron cargar las sucursales');
    setLoading(false);
  };

  useEffect(() => {
    void loadBranches();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setSelectedCopyProductIds([]);
    setCopyProducts([]);
    setEditingId(null);
  };

  const loadProductsForBranchCopy = async (sourceBranchId: number, target: 'create' | 'clone') => {
    const { data: stockRows, error: stockError } = await supabase
      .from('branch_stock' as any)
      .select('product_id, stock')
      .eq('branch_id', sourceBranchId);

    if (stockError) {
      toast.error('No se pudieron cargar los productos para copiar stock');
      if (target === 'create') {
        setCopyProducts([]);
        setSelectedCopyProductIds([]);
      } else {
        setCloneProducts([]);
        setSelectedCloneProductIds([]);
      }
      return;
    }

    const productIds = (stockRows ?? []).map((row) => row.product_id).filter(Boolean);
    if (productIds.length === 0) {
      if (target === 'create') {
        setCopyProducts([]);
        setSelectedCopyProductIds([]);
      } else {
        setCloneProducts([]);
        setSelectedCloneProductIds([]);
      }
      return;
    }

    const { data: products, error: productsError } = await supabase
      .from('products' as any)
      .select('id, name, sku')
      .in('id', productIds);

    if (productsError) {
      toast.error('No se pudieron cargar los productos para copiar stock');
      if (target === 'create') {
        setCopyProducts([]);
        setSelectedCopyProductIds([]);
      } else {
        setCloneProducts([]);
        setSelectedCloneProductIds([]);
      }
      return;
    }

    const nextProducts = (products ?? []).map((product: any) => {
      const match = (stockRows ?? []).find((row) => row.product_id === product.id);
      return {
        id: String(product.id),
        name: product.name,
        sku: product.sku ?? null,
        stock: Number(match?.stock ?? 0),
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    if (target === 'create') {
      setCopyProducts(nextProducts);
      setSelectedCopyProductIds(nextProducts.map((product) => product.id));
      return;
    }

    setCloneProducts(nextProducts);
    setSelectedCloneProductIds(nextProducts.map((product) => product.id));
  };

  useEffect(() => {
    const loadCopyProducts = async () => {
      if (!form.copy_stock_from) {
        setCopyProducts([]);
        setSelectedCopyProductIds([]);
        return;
      }

      await loadProductsForBranchCopy(Number(form.copy_stock_from), 'create');
    };

    void loadCopyProducts();
  }, [form.copy_stock_from]);

  useEffect(() => {
    const loadCloneProducts = async () => {
      if (!cloneSourceId) {
        setCloneProducts([]);
        setSelectedCloneProductIds([]);
        return;
      }

      await loadProductsForBranchCopy(cloneSourceId, 'clone');
    };

    void loadCloneProducts();
  }, [cloneSourceId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const input = {
      ...form,
      point_of_sale: form.point_of_sale ? Number(form.point_of_sale) : null,
      clone_from_branch_id: form.copy_stock_from ? Number(form.copy_stock_from) : null,
      clone_product_ids: editingId === null ? selectedCopyProductIds : undefined,
    };
    const result = editingId === null
      ? await createBranch(input)
      : await updateBranch(editingId, input);

    if (!result.success) {
      toast.error(result.error || 'No se pudo guardar la sucursal');
    } else {
      toast.success(editingId === null ? 'Sucursal creada' : 'Sucursal actualizada');
      resetForm();
      await loadBranches();
    }
    setSaving(false);
  };

  const startEditing = (branch: BranchRecord) => {
    setEditingId(branch.id);
    setForm({
      name: branch.name,
      description: branch.description ?? '',
      is_active: branch.is_active,
      fantasy_name: branch.fantasy_name ?? '',
      address: branch.address ?? '',
      locality: branch.locality ?? '',
      province: branch.province ?? '',
      phone: branch.phone ?? '',
      email: branch.email ?? '',
      cuit: branch.cuit ?? '',
      iibb: branch.iibb ?? '',
      iva_condition: branch.iva_condition ?? '',
      start_date: branch.start_date ?? '',
      point_of_sale: branch.point_of_sale ? String(branch.point_of_sale) : '',
      logo_url: branch.logo_url ?? '',
      copy_stock_from: '',
    });
    setCopyProducts([]);
    setSelectedCopyProductIds([]);
  };

  const handleCloneStock = async () => {
    if (!cloneSourceId || !cloneTargetId) {
      toast.error('Seleccioná sucursal origen y sucursal destino');
      return;
    }

    if (cloneSourceId === cloneTargetId) {
      toast.error('La sucursal origen y destino deben ser distintas');
      return;
    }

    setCloningStock(true);
    const { error } = await supabase.rpc('clone_branch_stock', {
      p_source_branch_id: cloneSourceId,
      p_target_branch_id: cloneTargetId,
      p_product_ids: selectedCloneProductIds.length > 0 ? selectedCloneProductIds : null,
    });

    setCloningStock(false);

    if (error) {
      toast.error(error.message || 'No se pudo clonar el stock');
      return;
    }

    toast.success('Stock clonado correctamente');
    setCloneSourceId(null);
    setCloneTargetId(null);
    setCloneProducts([]);
    setSelectedCloneProductIds([]);
    await loadBranches();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border-b border-gray-100 dark:border-slate-800 pb-2">
          Sucursales
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
          Creá y administrá las sucursales. Los productos y clientes son compartidos,
          pero el stock y las operaciones se separan por sucursal.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/40 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-gray-900 dark:text-slate-100">
            {editingId === null ? 'Crear sucursal' : 'Editar sucursal'}
          </h4>
          {editingId !== null && (
            <button type="button" onClick={resetForm} className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-white">
              <FaTimes className="inline mr-1" /> Cancelar edición
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">
            Nombre
            <input
              required
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Ej: Sucursal Centro"
              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 font-normal text-gray-900 dark:text-white"
            />
          </label>
          <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">
            Descripción
            <input
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Ej: Local del centro"
              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 font-normal text-gray-900 dark:text-white"
            />
          </label>
        </div>

        <div className="border-t border-gray-200 dark:border-slate-700 pt-4 space-y-4">
          <h5 className="font-bold text-gray-900 dark:text-slate-100">Datos que aparecerán en remitos</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([
              ['fantasy_name', 'Nombre de fantasía', 'Ej: FrontStock Centro'],
              ['address', 'Dirección', 'Ej: Av. Siempre Viva 123'],
              ['locality', 'Localidad', 'Ej: Rosario'],
              ['province', 'Provincia', 'Ej: Santa Fe'],
              ['phone', 'Teléfono', 'Ej: 0341 5555555'],
              ['email', 'Email', 'Ej: centro@empresa.com'],
              ['cuit', 'CUIT', 'Ej: 30-12345678-9'],
              ['iibb', 'Ingresos Brutos', 'Ej: 123456'],
              ['start_date', 'Inicio de actividades', 'Ej: 01/01/2020'],
              ['point_of_sale', 'Punto de venta', 'Ej: 3'],
              ['logo_url', 'URL del logo', 'https://...'],
            ] as const).map(([key, label, placeholder]) => (
              <label key={key} className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                {label}
                <input
                  type={key === 'email' ? 'email' : key === 'point_of_sale' ? 'number' : 'text'}
                  min={key === 'point_of_sale' ? 1 : undefined}
                  value={form[key]}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  placeholder={placeholder}
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 font-normal text-gray-900 dark:text-white"
                />
              </label>
            ))}
            <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">
              Condición ante IVA
              <select
                value={form.iva_condition}
                onChange={(event) => setForm((current) => ({ ...current, iva_condition: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 font-normal text-gray-900 dark:text-white"
              >
                <option value="">No configurada</option>
                <option>Responsable Inscripto</option>
                <option>Monotributista</option>
                <option>Exento</option>
              </select>
            </label>
          </div>
        </div>

        {editingId === null && branches.length > 0 && (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">
              Copiar stock desde otra sucursal
              <select
                value={form.copy_stock_from}
                onChange={(event) => setForm((current) => ({ ...current, copy_stock_from: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 font-normal text-gray-900 dark:text-white"
              >
                <option value="">No copiar stock</option>
                {branches
                  .filter((branch) => branch.is_active)
                  .map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
              </select>
            </label>

            {copyProducts.length > 0 && (
              <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Productos a copiar
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                      onClick={() => setSelectedCopyProductIds(copyProducts.map((product) => product.id))}
                    >
                      Seleccionar todos
                    </button>
                    <button
                      type="button"
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                      onClick={() => setSelectedCopyProductIds([])}
                    >
                      Deseleccionar todos
                    </button>
                  </div>
                </div>

                <div className="max-h-52 space-y-2 overflow-y-auto">
                  {copyProducts.map((product) => (
                    <label key={product.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-slate-700 px-2 py-2 text-sm text-gray-700 dark:text-slate-300">
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedCopyProductIds.includes(product.id)}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setSelectedCopyProductIds((current) =>
                              checked
                                ? [...new Set([...current, product.id])]
                                : current.filter((item) => item !== product.id)
                            );
                          }}
                        />
                        <span>
                          <span className="font-medium">{product.name}</span>
                          {product.sku && (
                            <span className="ml-2 text-xs text-gray-500 dark:text-slate-400">{product.sku}</span>
                          )}
                        </span>
                      </span>
                      <span className="text-xs text-gray-500 dark:text-slate-400">Stock: {product.stock}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
          />
          Sucursal activa y disponible para operar
        </label>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {editingId === null ? <FaPlus /> : <FaCheck />}
          {saving ? 'Guardando...' : editingId === null ? 'Crear sucursal' : 'Guardar cambios'}
        </button>
      </form>

      <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/40 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-gray-900 dark:text-slate-100">Clonar stock entre sucursales</h4>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">
            Sucursal origen
            <select
              value={cloneSourceId ?? ''}
              onChange={(event) => setCloneSourceId(event.target.value ? Number(event.target.value) : null)}
              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 font-normal text-gray-900 dark:text-white"
            >
              <option value="">Seleccioná origen</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">
            Sucursal destino
            <select
              value={cloneTargetId ?? ''}
              onChange={(event) => setCloneTargetId(event.target.value ? Number(event.target.value) : null)}
              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 font-normal text-gray-900 dark:text-white"
            >
              <option value="">Seleccioná destino</option>
              {branches
                .filter((branch) => branch.id !== cloneSourceId)
                .map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
            </select>
          </label>
        </div>

        {cloneProducts.length > 0 && (
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                Productos a copiar
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  onClick={() => setSelectedCloneProductIds(cloneProducts.map((product) => product.id))}
                >
                  Seleccionar todos
                </button>
                <button
                  type="button"
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                  onClick={() => setSelectedCloneProductIds([])}
                >
                  Deseleccionar todos
                </button>
              </div>
            </div>

            <div className="max-h-52 space-y-2 overflow-y-auto">
              {cloneProducts.map((product) => (
                <label key={product.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-slate-700 px-2 py-2 text-sm text-gray-700 dark:text-slate-300">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedCloneProductIds.includes(product.id)}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setSelectedCloneProductIds((current) =>
                          checked
                            ? [...new Set([...current, product.id])]
                            : current.filter((item) => item !== product.id)
                        );
                      }}
                    />
                    <span>
                      <span className="font-medium">{product.name}</span>
                      {product.sku && (
                        <span className="ml-2 text-xs text-gray-500 dark:text-slate-400">{product.sku}</span>
                      )}
                    </span>
                  </span>
                  <span className="text-xs text-gray-500 dark:text-slate-400">Stock: {product.stock}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleCloneStock()}
          disabled={cloningStock || !cloneSourceId || !cloneTargetId}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {cloningStock ? 'Clonando...' : 'Clonar stock'}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700">
        <div className="bg-white dark:bg-slate-900 px-5 py-3 font-bold text-gray-900 dark:text-slate-100">
          Sucursales registradas
        </div>
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Cargando sucursales...</div>
        ) : branches.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No hay sucursales registradas.</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {branches.map((branch) => (
              <div key={branch.id} className="flex flex-col gap-3 bg-white dark:bg-slate-900 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <FaBuilding className="mt-1 text-emerald-600" />
                  <div>
                    <div className="font-bold text-gray-900 dark:text-slate-100">{branch.name}</div>
                    <div className="text-sm text-gray-500 dark:text-slate-400">{branch.description || 'Sin descripción'}</div>
                    <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${branch.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {branch.is_active ? <FaCheck /> : <FaTimes />}
                      {branch.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => startEditing(branch)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  <FaEdit /> Editar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
