import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

export async function GET() {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()

  let dbStatus: 'HEALTHY' | 'DEGRADED' | 'DOWN' = 'HEALTHY'
  let dbLatency = 0
  let dbError: string | null = null

  let authStatus: 'HEALTHY' | 'DOWN' = 'HEALTHY'
  let authError: string | null = null

  let storageStatus: 'HEALTHY' | 'DEGRADED' | 'DOWN' = 'HEALTHY'
  let storageError: string | null = null

  let recordCounts = {
    products: 0,
    sales: 0,
    customers: 0,
    suppliers: 0,
    purchaseOrders: 0,
  }

  try {
    const supabase = await createClient()

    // 1. Measure DB Query Ping Latency
    const dbStartTime = Date.now()
    const { count: productCount, error: productErr } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
    
    dbLatency = Date.now() - dbStartTime

    if (productErr) {
      dbStatus = 'DOWN'
      dbError = productErr.message
    } else {
      recordCounts.products = productCount || 0
      if (dbLatency > 600) {
        dbStatus = 'DEGRADED'
      }
    }

    // Additional quick count queries in parallel for DB stats
    if (dbStatus !== 'DOWN') {
      const [salesRes, customersRes, suppliersRes, poRes] = await Promise.allSettled([
        supabase.from('sales').select('id', { count: 'exact', head: true }),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('suppliers').select('id', { count: 'exact', head: true }),
        (supabase as any).from('purchase_orders').select('id', { count: 'exact', head: true }),
      ])

      if (salesRes.status === 'fulfilled' && !salesRes.value.error) {
        recordCounts.sales = salesRes.value.count || 0
      }
      if (customersRes.status === 'fulfilled' && !customersRes.value.error) {
        recordCounts.customers = customersRes.value.count || 0
      }
      if (suppliersRes.status === 'fulfilled' && !suppliersRes.value.error) {
        recordCounts.suppliers = suppliersRes.value.count || 0
      }
      if (poRes.status === 'fulfilled' && !poRes.value.error) {
        recordCounts.purchaseOrders = poRes.value.count || 0
      }
    }

    // 2. Auth Service check
    try {
      const { error: authErr } = await supabase.auth.getSession()
      if (authErr) {
        authStatus = 'DOWN'
        authError = authErr.message
      }
    } catch (err: any) {
      authStatus = 'DOWN'
      authError = err?.message || 'Error de conexión Auth'
    }

    // 3. Storage Service check
    try {
      const { error: storageErr } = await supabase.storage.listBuckets()
      if (storageErr) {
        storageStatus = 'DEGRADED'
        storageError = storageErr.message
      }
    } catch (err: any) {
      storageStatus = 'DEGRADED'
      storageError = err?.message || 'Error al listar buckets de storage'
    }

  } catch (err: any) {
    dbStatus = 'DOWN'
    dbError = err?.message || 'Error crítico al conectar con la base de datos'
  }

  // System overall status calculation
  let overallStatus: 'HEALTHY' | 'DEGRADED' | 'DOWN' = 'HEALTHY'
  if (dbStatus === 'DOWN' || authStatus === 'DOWN') {
    overallStatus = 'DOWN'
  } else if (dbStatus === 'DEGRADED' || storageStatus === 'DEGRADED') {
    overallStatus = 'DEGRADED'
  }

  // Memory usage
  const memoryUsage = process.memoryUsage ? process.memoryUsage() : null
  const memoryMb = memoryUsage ? {
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
  } : null

  const serverLatency = Date.now() - startTime

  return NextResponse.json({
    status: overallStatus,
    timestamp,
    serverLatencyMs: serverLatency,
    environment: process.env.NODE_ENV,
    backend: {
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
        error: dbError,
      },
      auth: {
        status: authStatus,
        error: authError,
      },
      storage: {
        status: storageStatus,
        error: storageError,
      },
      recordCounts,
      memoryMb,
    },
  })
}
