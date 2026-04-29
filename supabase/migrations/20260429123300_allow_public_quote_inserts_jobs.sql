alter table public.jobs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'jobs'
      and policyname = 'Allow public quote inserts'
  ) then
    create policy "Allow public quote inserts"
      on public.jobs
      for insert
      to anon, authenticated
      with check (true);
  end if;
end $$;
