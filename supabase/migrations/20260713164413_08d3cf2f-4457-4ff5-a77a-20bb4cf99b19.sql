-- Remove public (anonymous) read/insert access. All data is now served
-- exclusively through authenticated server functions, so signed-in staff
-- policies ("... manageable by authenticated" / "viewable by authenticated")
-- fully cover the app. This closes public Data API access to firm data.

DROP POLICY IF EXISTS "Timeline public read" ON public.case_timeline;
DROP POLICY IF EXISTS "Cases public read" ON public.cases;
DROP POLICY IF EXISTS "Clients public read" ON public.clients;
DROP POLICY IF EXISTS "Court levels public read" ON public.court_levels;
DROP POLICY IF EXISTS "Executions public read" ON public.execution_procedures;
DROP POLICY IF EXISTS "Receipts public read" ON public.execution_receipts;
DROP POLICY IF EXISTS "Hearings public read" ON public.hearings;
DROP POLICY IF EXISTS "Judgments public read" ON public.judgments;
DROP POLICY IF EXISTS "Tasks public read" ON public.tasks;
DROP POLICY IF EXISTS "Reports public read" ON public.generated_reports;
DROP POLICY IF EXISTS "Reports insert anon" ON public.generated_reports;