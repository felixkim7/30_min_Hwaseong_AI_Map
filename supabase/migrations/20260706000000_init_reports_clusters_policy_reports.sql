-- Phase 03: reports, clusters, policy_reports + RLS.
-- No PostGIS — lat/lng are plain numeric columns (see docs/ARCHITECTURE.md).

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  masked_text text not null,
  category text not null default '교통',
  sub_category text not null,
  problem_types text[] not null default '{}',
  location_name text not null,
  lat numeric,
  lng numeric,
  district text,
  time_pattern text not null,
  transport_mode text not null,
  severity int not null check (severity between 1 and 5),
  target_groups text[] not null default '{}',
  summary text not null,
  suggested_policies text[] not null default '{}',
  cluster_id uuid,
  status text not null default 'new'
);

create table if not exists clusters (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  summary text,
  district text,
  report_count int not null default 0,
  representative_report_id uuid,
  priority_score numeric,
  score_breakdown jsonb
);

alter table reports
  add constraint reports_cluster_id_fkey
  foreign key (cluster_id) references clusters (id) on delete set null;

create table if not exists policy_reports (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references clusters (id) on delete cascade,
  created_at timestamptz not null default now(),
  content_md text not null
);

create index if not exists reports_cluster_id_idx on reports (cluster_id);
create index if not exists reports_district_idx on reports (district);
create index if not exists policy_reports_cluster_id_idx on policy_reports (cluster_id);

-- Row Level Security -----------------------------------------------------

alter table reports enable row level security;
alter table clusters enable row level security;
alter table policy_reports enable row level security;

-- reports: anonymous citizens may insert their own (already-masked) report
-- and everyone (map, admin) may read. No anonymous update/delete.
create policy "public can read reports"
  on reports for select
  to anon
  using (true);

create policy "anyone can insert a report"
  on reports for insert
  to anon
  with check (true);

-- clusters / policy_reports: no anonymous access at all. Only the
-- service-role key (used from server routes) can read/write — it bypasses
-- RLS entirely, so no policy is needed for it. No policies are created for
-- the anon role here, which means anon has zero access by default.
