
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'cases','clients','invoices','tasks','hearings','judgments','court_levels',
    'case_documents','case_notes','case_timeline','case_reports','client_messages',
    'execution_procedures','execution_receipts','generated_reports','workflow_templates',
    'firm_settings','time_entries','trust_ledger','audit_log'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN firm_id SET DEFAULT public.current_firm_id()', t);
  END LOOP;
END $$;
