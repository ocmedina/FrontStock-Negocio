const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testCancel() {
    console.log('Fetching a recent payment...');
    const { data: payments, error: fetchErr } = await supabase
        .from('payments')
        .select('*')
        .eq('type', 'pago')
        .neq('payment_method', 'anulado')
        .order('created_at', { ascending: false })
        .limit(1);

    if (fetchErr) {
        console.error('Error fetching payment:', fetchErr.message);
        return;
    }

    if (!payments || payments.length === 0) {
        console.log('No active payments found to test with.');
        return;
    }

    const payment = payments[0];
    console.log('Found payment to cancel:', payment);

    console.log('Calling cancel_customer_payment_transaction RPC...');
    const { data, error } = await supabase.rpc('cancel_customer_payment_transaction', { p_payment_id: payment.id });

    if (error) {
        console.error('❌ RPC Error:', error.message);
        console.error('Details:', error.details);
        console.error('Code:', error.code);
    } else {
        console.log('✅ RPC Success! Result:', data);
    }
}

testCancel();
