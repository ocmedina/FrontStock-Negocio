'use server';

import { createLooseAdminClient } from '@/lib/admin';
import { requireAdmin } from '@/lib/serverAuth';

export type BranchRecord = {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  fantasy_name: string | null;
  address: string | null;
  locality: string | null;
  province: string | null;
  phone: string | null;
  email: string | null;
  cuit: string | null;
  iibb: string | null;
  iva_condition: string | null;
  start_date: string | null;
  point_of_sale: number | null;
  logo_url: string | null;
};

export async function listBranchesForSettings(): Promise<{
  success: boolean;
  data?: BranchRecord[];
  error?: string;
}> {
  try {
    await requireAdmin();
    const supabase = createLooseAdminClient();
    const { data, error } = await supabase
      .from('branches' as any)
      .select('id, name, description, is_active, fantasy_name, address, locality, province, phone, email, cuit, iibb, iva_condition, start_date, point_of_sale, logo_url')
      .order('id', { ascending: true });

    if (error) throw error;
    return {
      success: true,
      data: ((data || []) as any[]).map((branch) => ({
        id: Number(branch.id),
        name: branch.name,
        description: branch.description ?? null,
        is_active: Boolean(branch.is_active),
        fantasy_name: branch.fantasy_name ?? null,
        address: branch.address ?? null,
        locality: branch.locality ?? null,
        province: branch.province ?? null,
        phone: branch.phone ?? null,
        email: branch.email ?? null,
        cuit: branch.cuit ?? null,
        iibb: branch.iibb ?? null,
        iva_condition: branch.iva_condition ?? null,
        start_date: branch.start_date ?? null,
        point_of_sale: branch.point_of_sale ? Number(branch.point_of_sale) : null,
        logo_url: branch.logo_url ?? null,
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('[listBranchesForSettings]', message);
    return { success: false, error: message };
  }
}

export async function createBranch(input: {
  name: string;
  description?: string;
  is_active?: boolean;
  fantasy_name?: string;
  address?: string;
  locality?: string;
  province?: string;
  phone?: string;
  email?: string;
  cuit?: string;
  iibb?: string;
  iva_condition?: string;
  start_date?: string;
  point_of_sale?: number | null;
  logo_url?: string;
}): Promise<{ success: boolean; data?: BranchRecord; error?: string }> {
  try {
    await requireAdmin();
    const name = input.name.trim();
    if (!name) return { success: false, error: 'El nombre de la sucursal es obligatorio.' };

    const supabase = createLooseAdminClient();
    const { data, error } = await supabase
      .from('branches' as any)
      .insert({
        name,
        description: input.description?.trim() || null,
        is_active: input.is_active ?? false,
        ...businessFields(input),
      })
      .select('id, name, description, is_active, fantasy_name, address, locality, province, phone, email, cuit, iibb, iva_condition, start_date, point_of_sale, logo_url')
      .single();

    if (error) throw error;
    return {
      success: true,
      data: {
        id: Number(data.id),
        name: data.name,
        description: data.description ?? null,
        is_active: Boolean(data.is_active),
        fantasy_name: data.fantasy_name ?? null,
        address: data.address ?? null,
        locality: data.locality ?? null,
        province: data.province ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        cuit: data.cuit ?? null,
        iibb: data.iibb ?? null,
        iva_condition: data.iva_condition ?? null,
        start_date: data.start_date ?? null,
        point_of_sale: data.point_of_sale ? Number(data.point_of_sale) : null,
        logo_url: data.logo_url ?? null,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('[createBranch]', message);
    return { success: false, error: message };
  }
}

export async function updateBranch(
  id: number,
  input: {
    name: string;
    description?: string;
    is_active: boolean;
    fantasy_name?: string;
    address?: string;
    locality?: string;
    province?: string;
    phone?: string;
    email?: string;
    cuit?: string;
    iibb?: string;
    iva_condition?: string;
    start_date?: string;
    point_of_sale?: number | null;
    logo_url?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    const name = input.name.trim();
    if (!name) return { success: false, error: 'El nombre de la sucursal es obligatorio.' };

    const supabase = createLooseAdminClient();
    const { error } = await supabase
      .from('branches' as any)
      .update({
        name,
        description: input.description?.trim() || null,
        is_active: input.is_active,
        ...businessFields(input),
      })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('[updateBranch]', message);
    return { success: false, error: message };
  }

}

function businessFields(input: {
  fantasy_name?: string;
  address?: string;
  locality?: string;
  province?: string;
  phone?: string;
  email?: string;
  cuit?: string;
  iibb?: string;
  iva_condition?: string;
  start_date?: string;
  point_of_sale?: number | string | null;
  logo_url?: string;
}) {
  return {
    fantasy_name: input.fantasy_name?.trim() || null,
    address: input.address?.trim() || null,
    locality: input.locality?.trim() || null,
    province: input.province?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    cuit: input.cuit?.trim() || null,
    iibb: input.iibb?.trim() || null,
    iva_condition: input.iva_condition?.trim() || null,
    start_date: input.start_date?.trim() || null,
    point_of_sale: input.point_of_sale ? Math.max(1, Number(input.point_of_sale)) : null,
    logo_url: input.logo_url?.trim() || null,
  };
}
