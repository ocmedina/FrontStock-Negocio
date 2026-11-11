# SQL del proyecto

## Estructura

- `sql/*.sql`: scripts de esquema y funciones reutilizables
- `sql/maintenance/*.sql`: scripts operativos puntuales

## Scripts importantes

- `setup_complete.sql`: base integral para entorno nuevo
- `bootstrap_new_database.sql`: bootstrap completo de tablas, funciones y politicas
- `create_finalize_sale_transaction.sql`: transaccion atomica de cierre de venta
- `create_current_price_adjustments.sql`: ajustes seleccionados de precios actuales para saldos de cuenta corriente (ejecutar una vez)
- `05_separate_customer_accounts_by_branch.sql`: separa movimientos y cobros de clientes por sucursal y conserva como “Sin asignar” los pagos históricos sin origen comprobable
- `create_register_customer_payment_transaction.sql`: registro atomico de pago de cliente
- `create_cancel_customer_payment_transaction.sql`: anulacion atomica de pago de cliente
- `create_branches_and_branch_stock.sql`: sucursales, stock por sucursal y transferencias
- `01_create_branches_schema.sql`: sucursales, stock, columnas y migracion inicial
- `02_create_branches_functions.sql`: funciones, triggers, transferencias y politicas
- `01a_create_branches_tables.sql`: tablas base de sucursales
- `01b_add_branch_columns.sql`: columnas branch_id
- `01c_backfill_branch_data.sql`: migracion del stock y operaciones existentes
- `01d_create_branch_indexes.sql`: indices por sucursal
- `01e_add_branch_foreign_keys.sql`: claves foraneas opcionales
- `03_add_branch_business_data.sql`: datos comerciales específicos de cada sucursal para remitos
- `04_fix_order_branch_stock.sql`: entrega, reversión y edición de pedidos usando stock por sucursal

## Orden sugerido para entorno nuevo

1. `bootstrap_new_database.sql`
2. `setup_complete.sql` (si corresponde al entorno objetivo)
3. Scripts `create_*_transaction.sql` faltantes
4. Scripts `add_*` y `fix_*` segun necesidad de datos existentes

Para separar una instalación existente con datos, ejecutar en Supabase, en este orden:

1. `01a_create_branches_tables.sql`
2. `01b_add_branch_columns.sql`
3. `01c_backfill_branch_data.sql`
4. `01d_create_branch_indexes.sql`
5. `01e_add_branch_foreign_keys.sql` (opcional, en ventana de mantenimiento)
6. `02_create_branches_functions.sql`
7. `03_add_branch_business_data.sql`
8. `04_fix_order_branch_stock.sql`

Cada etapa es independiente y no abre una transacción global. Si una etapa falla,
las anteriores permanecen aplicadas y se puede repetir la misma etapa después de
resolver el bloqueo.

## Buenas practicas

- Ejecutar en entorno de staging antes de produccion.
- Mantener scripts idempotentes (`create if not exists`, `drop if exists` cuando aplique).
- Documentar impacto funcional en commit/PR.

