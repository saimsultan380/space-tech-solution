const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
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

async function check() {
  console.log("Checking if RPC functions exist in database...");
  
  // Check get_sales_leaderboard
  const { data: func1, error: err1 } = await supabase
    .rpc('get_sales_leaderboard')
    .limit(1);

  if (err1) {
    console.error("❌ get_sales_leaderboard RPC error:", err1.message);
  } else {
    console.log("✅ get_sales_leaderboard RPC exists!");
  }

  // Check get_agent_performance_stats
  const dummyUuid = 'd3b07384-d113-4ec6-a558-7beb2bcf0d7d';
  const { data: func2, error: err2 } = await supabase
    .rpc('get_agent_performance_stats', { p_agent_id: dummyUuid });

  if (err2) {
    console.error("❌ get_agent_performance_stats RPC error:", err2.message);
  } else {
    console.log("✅ get_agent_performance_stats RPC exists!");
  }

  // Check if get_dashboard_analytics RPC exists
  const { data: func3, error: err3 } = await supabase
    .rpc('get_dashboard_analytics');

  if (err3) {
    console.error("❌ get_dashboard_analytics RPC error:", err3.message);
  } else {
    console.log("✅ get_dashboard_analytics RPC exists!");
  }
}

check();
