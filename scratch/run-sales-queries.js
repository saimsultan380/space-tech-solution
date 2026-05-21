const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function runQueries() {
  // 1. Get a sales agent ID
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('role', 'sales_agent')
    .eq('is_active', true)
    .limit(1);

  if (userErr || !users || users.length === 0) {
    console.error("No active sales agent found in DB:", userErr?.message);
    return;
  }

  const targetAgentId = users[0].id;
  console.log(`Testing queries for agent: ${users[0].full_name} (${targetAgentId})`);

  // Define the raw implementations of the page's queries
  async function testPerformanceStats() {
    const today = new Date();
    const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    const quarterMonth = Math.floor(today.getMonth() / 3) * 3;
    const quarterStart = `${today.getFullYear()}-${String(quarterMonth + 1).padStart(2, "0")}-01`;

    console.log("-> Running _getAgentPerformanceStats queries...");
    const [allSalesRes, monthSalesRes, quarterSalesRes, chargebackRes] = await Promise.all([
      supabase
        .from("sales")
        .select("id, status, charged_amount, sale_type, subtype, created_at")
        .eq("agent_id", targetAgentId)
        .limit(1000),
      supabase
        .from("sales")
        .select("id, status, charged_amount")
        .eq("agent_id", targetAgentId)
        .gte("created_at", `${monthStart}T00:00:00`)
        .limit(500),
      supabase
        .from("sales")
        .select("id, status, charged_amount")
        .eq("agent_id", targetAgentId)
        .gte("created_at", `${quarterStart}T00:00:00`)
        .limit(500),
      supabase
        .from("chargebacks")
        .select("id, sale:sales!inner(agent_id)")
        .eq("sale.agent_id", targetAgentId),
    ]);

    if (allSalesRes.error) throw new Error(`allSalesRes: ${allSalesRes.error.message}`);
    if (monthSalesRes.error) throw new Error(`monthSalesRes: ${monthSalesRes.error.message}`);
    if (quarterSalesRes.error) throw new Error(`quarterSalesRes: ${quarterSalesRes.error.message}`);
    if (chargebackRes.error) throw new Error(`chargebackRes: ${chargebackRes.error.message}`);
    console.log("   ✅ _getAgentPerformanceStats queries successful!");
  }

  async function testMonthlySalesTrends() {
    console.log("-> Running _getAgentMonthlySalesTrends queries...");
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    const startDate = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;

    const { data, error } = await supabase
      .from("sales")
      .select("charged_amount, status, created_at")
      .eq("agent_id", targetAgentId)
      .gte("created_at", `${startDate}T00:00:00`)
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Monthly trends query error: ${error.message}`);
    console.log("   ✅ _getAgentMonthlySalesTrends queries successful!");
  }

  async function testDealCategories() {
    console.log("-> Running _getAgentDealCategories queries...");
    const { data, error } = await supabase
      .from("sales")
      .select("sale_type, subtype")
      .eq("agent_id", targetAgentId)
      .neq("status", "rejected");

    if (error) throw new Error(`Deal categories query error: ${error.message}`);
    console.log("   ✅ _getAgentDealCategories queries successful!");
  }

  async function testRevenueOverTime() {
    console.log("-> Running _getAgentRevenueOverTime queries...");
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    const startDate = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;

    const { data, error } = await supabase
      .from("sales")
      .select("charged_amount, created_at")
      .eq("agent_id", targetAgentId)
      .neq("status", "rejected")
      .gte("created_at", `${startDate}T00:00:00`)
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Revenue over time query error: ${error.message}`);
    console.log("   ✅ _getAgentRevenueOverTime queries successful!");
  }

  async function testSalesLeaderboard() {
    console.log("-> Running _getSalesLeaderboard manual queries...");
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [salesRes, usersRes, chargebackRes] = await Promise.all([
      supabase
        .from("sales")
        .select("agent_id, status, charged_amount")
        .gte("created_at", sixMonthsAgo.toISOString())
        .limit(5000),
      supabase
        .from("users")
        .select("id, full_name, avatar_url, role")
        .eq("role", "sales_agent")
        .eq("is_active", true)
        .limit(200),
      supabase
        .from("chargebacks")
        .select("id, sale:sales!inner(agent_id)")
        .limit(1000),
    ]);

    if (salesRes.error) throw new Error(`salesRes: ${salesRes.error.message}`);
    if (usersRes.error) throw new Error(`usersRes: ${usersRes.error.message}`);
    if (chargebackRes.error) throw new Error(`chargebackRes: ${chargebackRes.error.message}`);
    console.log("   ✅ _getSalesLeaderboard manual queries successful!");
  }

  async function testRecentSalesNotifications() {
    console.log("-> Running _getRecentSalesNotifications queries...");
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const { data, error } = await supabase
      .from("sales")
      .select("id, charged_amount, agent:users!sales_agent_id_fkey(full_name), created_at, company_name")
      .gte("created_at", oneDayAgo.toISOString())
      .neq("status", "rejected")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw new Error(`Notifications query error: ${error.message}`);
    console.log("   ✅ _getRecentSalesNotifications queries successful!");
  }

  try {
    await testPerformanceStats();
    await testMonthlySalesTrends();
    await testDealCategories();
    await testRevenueOverTime();
    await testSalesLeaderboard();
    await testRecentSalesNotifications();
    console.log("\n⭐ ALL SERVER ACTION QUERIES PASSED SUCCESSFULLY!");
  } catch (err) {
    console.error("\n❌ QUERY FAILED:", err.message);
  }
}

runQueries();
