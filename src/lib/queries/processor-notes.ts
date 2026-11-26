import { createClient } from "@/lib/supabase/client";

export interface ProcessorDailyStat {
  id: string;
  name: string;
  role: string;
  count: number;
}

export interface ProcessorDailySummary {
  date: string;
  totalNotes: number;
  processors: ProcessorDailyStat[];
}

export async function getDailyProcessorNotes(
  targetDate?: string,
): Promise<ProcessorDailySummary> {
  const supabase = createClient();
  const date = targetDate || new Date().toISOString().slice(0, 10);
  const startIso = `${date}T00:00:00.000Z`;
  const endIso = `${date}T23:59:59.999Z`;

  const [{ data: notes, error: notesErr }, { data: processors, error: procErr }] =
    await Promise.all([
      supabase
        .from("notes")
        .select("id, user_id, created_at, sale_id, user:users(id, full_name, role)")
        .eq("type", "processing")
        .gte("created_at", startIso)
        .lte("created_at", endIso),
      supabase
        .from("users")
        .select("id, full_name, role")
        .eq("role", "processor")
        .eq("is_active", true),
    ]);

  if (notesErr) {
    console.error("[getDailyProcessorNotes] error:", notesErr.message);
  }
  if (procErr) {
    console.error("[getDailyProcessorNotes] proc error:", procErr.message);
  }

  const countByUser = new Map<string, number>();
  for (const n of notes || []) {
    if (n.user_id) {
      countByUser.set(n.user_id, (countByUser.get(n.user_id) || 0) + 1);
    }
  }

  const userMap = new Map<string, { id: string; name: string; role: string }>();
  for (const p of processors || []) {
    userMap.set(p.id, {
      id: p.id,
      name: p.full_name?.trim() || "Processor",
      role: "processor",
    });
  }
  for (const n of notes || []) {
    const u = Array.isArray(n.user) ? n.user[0] : (n.user as any);
    if (u && !userMap.has(u.id)) {
      userMap.set(u.id, {
        id: u.id,
        name: u.full_name?.trim() || "Staff",
        role: u.role || "processor",
      });
    }
  }

  const processorList: ProcessorDailyStat[] = Array.from(userMap.values())
    .map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      count: countByUser.get(p.id) || 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    date,
    totalNotes: (notes || []).length,
    processors: processorList,
  };
}
