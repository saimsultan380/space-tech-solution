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

async function test() {
  const targetAgentId = 'd3b07384-d113-4ec6-a558-7beb2bcf0d7d'; // Some UUID or just any dummy
  
  console.log("Testing getAgentPerformanceStats query...");
  const { data, error } = await supabase
    .from("chargebacks")
    .select("id, sale:sales!inner(agent_id)")
    .eq("sale.agent_id", targetAgentId);

  if (error) {
    console.error("ERROR running query with 'sale.agent_id':", error.message);
  } else {
    console.log("SUCCESS running query with 'sale.agent_id':", data.length, "rows");
  }

  const { data: data2, error: error2 } = await supabase
    .from("chargebacks")
    .select("id, sale:sales!inner(agent_id)")
    .eq("sales.agent_id", targetAgentId);

  if (error2) {
    console.error("ERROR running query with 'sales.agent_id':", error2.message);
  } else {
    console.log("SUCCESS running query with 'sales.agent_id':", data2.length, "rows");
  }
}

test();
