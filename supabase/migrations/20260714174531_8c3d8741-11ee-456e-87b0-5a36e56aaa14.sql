-- time_entries table (invoices & workflow_templates already exist)
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;
GRANT ALL ON public.time_entries TO service_role;

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='time_entries' AND policyname='Authenticated users manage time entries') THEN
    CREATE POLICY "Authenticated users manage time entries" ON public.time_entries
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_time_entries_updated_at ON public.time_entries;
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed workflow templates
INSERT INTO public.workflow_templates (name, name_ar, description, description_ar, steps) VALUES
('New Civil Case', 'دعوى مدنية جديدة', 'Standard workflow for filing a new civil case', 'سير عمل قياسي لرفع دعوى مدنية جديدة',
 '[
   {"title":"Review client documents","title_ar":"مراجعة مستندات الموكّل","days_offset":0},
   {"title":"Draft statement of claim","title_ar":"صياغة صحيفة الدعوى","days_offset":3},
   {"title":"File with court clerk","title_ar":"إيداع لدى إدارة الكتاب","days_offset":5},
   {"title":"Pay court fees","title_ar":"سداد الرسوم القضائية","days_offset":5},
   {"title":"Serve defendant","title_ar":"إعلان المدعى عليه","days_offset":7}
 ]'::jsonb),
('Appeal Workflow', 'سير عمل الاستئناف', 'Standard workflow for filing an appeal', 'سير عمل قياسي لرفع الاستئناف',
 '[
   {"title":"Analyze judgment","title_ar":"تحليل الحكم لأسباب الطعن","days_offset":0},
   {"title":"Draft appeal memo","title_ar":"صياغة مذكرة الاستئناف","days_offset":5},
   {"title":"Gather documents","title_ar":"جمع المستندات المؤيدة","days_offset":10},
   {"title":"File appeal","title_ar":"إيداع الاستئناف","days_offset":15},
   {"title":"Pay appeal fees","title_ar":"سداد رسوم الاستئناف","days_offset":15}
 ]'::jsonb),
('Execution Workflow', 'سير عمل التنفيذ', 'Standard workflow for enforcement of judgments', 'سير عمل قياسي لتنفيذ الأحكام',
 '[
   {"title":"Obtain executable copy","title_ar":"الحصول على الصيغة التنفيذية","days_offset":0},
   {"title":"File execution request","title_ar":"تقديم طلب التنفيذ","days_offset":2},
   {"title":"Pay execution fees","title_ar":"سداد رسوم التنفيذ","days_offset":2},
   {"title":"Follow up","title_ar":"متابعة إدارة التنفيذ","days_offset":7},
   {"title":"Notify client","title_ar":"إبلاغ الموكّل بالمستجدات","days_offset":14}
 ]'::jsonb)
ON CONFLICT DO NOTHING;
