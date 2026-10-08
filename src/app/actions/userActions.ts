'use server'

import { createAdminClient } from '@/lib/supabaseAdmin'
import { requireAuth, requirePermission } from '@/lib/serverAuth'
import { hasPermission } from '@/lib/permissions'

// Cliente admin con permisos totales (usa Service Role Key)
const supabaseAdmin = createAdminClient()

// Crear nuevo empleado
export async function createEmployee(formData: FormData) {
  try {
    const ctx = await requirePermission('CREAR_USUARIOS')

    const fullName = formData.get('fullName') as string
    const username = formData.get('username') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const role = formData.get('role') as string

    if (!fullName || !username || !email || !password || !role) {
      return { success: false, message: 'Todos los campos son requeridos.' }
    }

    const validRoles = ['administrador', 'supervendedor', 'vendedor', 'repartidor'];
    if (!validRoles.includes(role)) {
      return { success: false, message: 'Rol inválido.' };
    }

    // Prevenir escalamiento de privilegios: solo un administrador puede crear otro administrador
    if (role === 'administrador' && ctx.profile.role !== 'administrador') {
      return { success: false, message: 'Solo un administrador puede crear usuarios con rol administrador.' }
    }

    const finalRole = role;

    // Verificar si el username ya existe
    const { data: existingUsername } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single()

    if (existingUsername) {
      return { success: false, message: 'El nombre de usuario ya existe.' }
    }

    // Crear usuario en Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, username, role: finalRole },
    })

    if (authError || !authData?.user) {
      if (authError?.message?.includes('unique constraint')) {
        return { success: false, message: 'Ya existe un usuario con ese correo electrónico.' }
      }
      return { success: false, message: authError?.message || 'Error al crear el usuario.' }
    }

    // Actualizar perfil en la tabla "profiles"
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ username, email, role: finalRole })
      .eq('id', authData.user.id)

    if (updateError) {
      // Si falla, elimina el usuario de Auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return { success: false, message: 'Error al configurar el perfil del usuario.' }
    }

    return { success: true, message: `Empleado "${fullName}" (${username}) creado exitosamente.` }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error de autorización al crear usuario.'
    return { success: false, message: msg }
  }
}

// Cambiar contraseña (propia o de terceros con permiso)
export async function changeUserPassword(userId: string, newPassword: string) {
  try {
    const ctx = await requireAuth()

    if (!userId || !newPassword) {
      return { success: false, message: 'Usuario y contraseña son requeridos.' }
    }

    if (newPassword.length < 6) {
      return { success: false, message: 'La contraseña debe tener al menos 6 caracteres.' }
    }

    const isSelf = ctx.user.id === userId
    const hasEditPermission = hasPermission(ctx.profile.role, 'EDITAR_USUARIOS', ctx.overrides)

    if (!isSelf && !hasEditPermission) {
      return { success: false, message: 'No tienes permiso para cambiar la contraseña de otro usuario.' }
    }

    // Si se modifica la contraseña de otro usuario y es administrador, solo un administrador puede hacerlo
    if (!isSelf) {
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (targetProfile?.role === 'administrador' && ctx.profile.role !== 'administrador') {
        return { success: false, message: 'Solo un administrador puede cambiar la contraseña de otro administrador.' }
      }
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    })

    if (error) {
      console.error('Error al cambiar contraseña:', error)
      return { success: false, message: 'Error al cambiar la contraseña.' }
    }

    return { success: true, message: 'Contraseña actualizada correctamente.' }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al cambiar contraseña.'
    return { success: false, message: msg }
  }
}
