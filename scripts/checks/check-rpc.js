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

async function checkRpc() {
    console.log('1. Checking if cancel_customer_payment_transaction function exists...');
    
    // We can query pg_proc to find functions matching the name
    const { data: procData, error: procError } = await supabase.rpc('pg_typeof', { val: null }).catch(err => ({ error: err }));
    
    // Let's run a custom query using postgrest to read pg_proc (if allowed)
    // Actually, we can run a test execution of the function with a non-existent ID
    const { data, error } = await supabase.rpc('cancel_customer_payment_transaction', { p_payment_id: 99999999 });
    
    if (error) {
        console.log('❌ Test execution failed:');
        console.log('Message:', error.message);
        console.log('Details:', error.details);
        console.log('Hint:', error.hint);
        console.log('Code:', error.code);
    } else {
        console.log('✅ Function exists and executed successfully (returned data:', data, ')');
    }
}

checkRpc();
