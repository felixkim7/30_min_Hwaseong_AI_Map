-- "Automatically expose new tables" was left off in the Supabase dashboard
-- (deliberate — see phase 00 notes), so PostgREST's anon/authenticated roles
-- have no table-level privileges yet. RLS policies alone are not sufficient:
-- Postgres checks the GRANT first, then RLS. Without this, every request —
-- including service_role, which normally bypasses RLS but still needs the
-- schema/table GRANT — gets "permission denied for table ...".

grant usage on schema public to anon, authenticated, service_role;

grant select, insert on reports to anon;
grant select, insert, update, delete on reports to service_role;

grant select, insert, update, delete on clusters to service_role;
grant select, insert, update, delete on policy_reports to service_role;

-- Future tables created in this schema should follow the same convention:
-- explicit grants here, RLS policies for anon in the table's own migration.
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
