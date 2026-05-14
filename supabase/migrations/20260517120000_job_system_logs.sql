-- Accountability trail for admin actions (status changes, assignments, bulk ops).

CREATE TABLE IF NOT EXISTS public.job_system_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id bigint NOT NULL REFERENCES public.jobs (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  message text NOT NULL,
  actor_name text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_system_logs_job_id_idx ON public.job_system_logs (job_id);
CREATE INDEX IF NOT EXISTS job_system_logs_created_at_idx ON public.job_system_logs (created_at DESC);

COMMENT ON TABLE public.job_system_logs IS 'Structured audit log for job lifecycle events (separate from job_communication_logs).';
