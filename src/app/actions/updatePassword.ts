'use server'

import { createAdminClient } from '@/lib/supabaseAdmin'
import { requireAuth } from '@/lib/serverAuth'
import { revalidatePath } from 'next/cache'

export async function updateUserPassword(userId: string, newPassword: string) {
  try {
    const ctx = await requireAuth()

    if (!userId || !newPassword) {
      return { success: false, message: 'Usuario y contraseña son requeridos.' }
    }

    if (newPassword.length < 6) {
      return { success: false, message: 'La contraseña debe tener al menos 6 caracteres.' }
    }

    const isSelf = ctx.user.id === userId
    const isAdmin = ctx.profile.role === 'administrador'

    if (!isSelf && !isAdmin) {
      return { success: false, message: 'No tienes permiso para cambiar la contraseña de otro usuario.' }
    }

    const supabaseAdmin = createAdminClient()

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    })

    if (error) {
      console.error('Error actualizando contraseña:', error)
      return { success: false, message: 'Error al cambiar la contraseña' }
    }

    revalidatePath('/dashboard/usuarios')
    return { success: true, message: 'Contraseña actualizada correctamente' }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al actualizar contraseña'
    return { success: false, message: msg }
  }
}
