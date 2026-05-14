import type { SupabaseClient } from "@supabase/supabase-js";

export async function recordJobSystemEvent(
  supabase: SupabaseClient,
  params: {
    jobId: number;
    eventType: string;
    message: string;
    actorName: string | null;
    meta?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await supabase.from("job_system_logs").insert({
    job_id: params.jobId,
    event_type: params.eventType,
    message: params.message,
    actor_name: params.actorName,
    meta: params.meta ?? {}
  });
  if (error) {
    console.error("[job_system_logs] insert error", error);
  }
}
