const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Environment variables missing.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const now = new Date();
const argDate = new Date(
  now.toLocaleString("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
  })
);

let startDate = new Date(argDate);
startDate.setMonth(argDate.getMonth() - 1);

const start = startDate.toISOString();
const end = argDate.toISOString();

const currentStart = new Date(start);
const currentEnd = new Date(end);
const diff = currentEnd.getTime() - currentStart.getTime();

const prevEndDate = new Date(currentStart);
prevEndDate.setMilliseconds(prevEndDate.getMilliseconds() - 1);

const prevStartDate = new Date(prevEndDate);
prevStartDate.setMilliseconds(prevStartDate.getMilliseconds() - diff);

const prevStart = prevStartDate.toISOString();
const prevEnd = prevEndDate.toISOString();

console.log("Start:", start, "End:", end);
console.log("PrevStart:", prevStart, "PrevEnd:", prevEnd);

async function test() {
  console.log("Running Sales current...");
  const salesRes = await supabase
    .from("sales")
    .select("id, created_at, total_amount, payment_method")
    .gte("created_at", start)
    .lte("created_at", end);
  if (salesRes.error) {
    console.error("Sales current error:", salesRes.error);
  } else {
    console.log("Sales current count:", salesRes.data.length);
  }

  console.log("Running Orders current...");
  const ordersRes = await supabase
    .from("orders")
    .select("id, created_at, total_amount, status")
    .gte("created_at", start)
    .lte("created_at", end);
  if (ordersRes.error) {
    console.error("Orders current error:", ordersRes.error);
  } else {
    console.log("Orders current count:", ordersRes.data.length);
  }

  console.log("Running Sales prev...");
  const prevSalesRes = await supabase
    .from("sales")
    .select("total_amount")
    .gte("created_at", prevStart)
    .lte("created_at", prevEnd);
  if (prevSalesRes.error) {
    console.error("Sales prev error:", prevSalesRes.error);
  } else {
    console.log("Sales prev count:", prevSalesRes.data.length);
  }

  console.log("Running Orders prev...");
  const prevOrdersRes = await supabase
    .from("orders")
    .select("total_amount")
    .eq("status", "entregado")
    .gte("created_at", prevStart)
    .lte("created_at", prevEnd);
  if (prevOrdersRes.error) {
    console.error("Orders prev error:", prevOrdersRes.error);
  } else {
    console.log("Orders prev count:", prevOrdersRes.data.length);
  }
}

test().catch(console.error);
