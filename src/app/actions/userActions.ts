'use server'

import { createClient } from '@supabase/supabase-js'

// Cliente admin con permisos totales (usa Service Role Key)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Crear nuevo empleado
export async function createEmployee(formData: FormData) {
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
}

// Cambiar contraseña (solo admin)
export async function changeUserPassword(userId: string, newPassword: string) {
  if (!userId || !newPassword) {
    return { success: false, message: 'Usuario y contraseña son requeridos.' }
  }

  if (newPassword.length < 6) {
    return { success: false, message: 'La contraseña debe tener al menos 6 caracteres.' }
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (error) {
    console.error('Error al cambiar contraseña:', error)
    return { success: false, message: 'Error al cambiar la contraseña.' }
  }

  return { success: true, message: 'Contraseña actualizada correctamente.' }
}
