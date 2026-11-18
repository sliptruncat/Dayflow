-- Run only against `supabase start` or an isolated test project. Never production.
-- Replace UUIDs with auth users created by the test harness before running.
begin;
-- The harness must execute each block with SET LOCAL ROLE authenticated and the
-- matching request.jwt.claim.sub. Verify own SELECT/UPDATE/DELETE succeeds and
-- cross-user SELECT/INSERT/UPDATE/DELETE returns zero rows or a policy error.
-- RLS policy definitions are deliberately included in the migration so Supabase
-- CLI `db reset` is the authoritative schema test.
rollback;
