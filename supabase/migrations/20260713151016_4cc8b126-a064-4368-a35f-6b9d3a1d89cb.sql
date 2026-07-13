
-- ============ TASKS TABLE ============
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  description_ar TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assignee TEXT,
  assignee_ar TEXT,
  due_date DATE,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tasks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tasks public read" ON public.tasks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Tasks manageable by authenticated" ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CLIENTS: safe anon read (non-PII columns only) ============
CREATE POLICY "Clients public read" ON public.clients FOR SELECT TO anon USING (true);
-- Column-level grant keeps email / phone / national_id private from anon
GRANT SELECT (id, name, name_ar, notes, created_at) ON public.clients TO anon;

-- ============ SEED CLIENTS ============
INSERT INTO public.clients (id, name, name_ar, email, phone, national_id, notes) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'Yousef Al-Mutairi', 'يوسف المطيري', 'yousef@example.com', '+96550010001', '289010112345',
   'Charged in a misdemeanor matter (traffic-related). Seeking to understand appeal options and clear his record after the first-instance ruling.'),
  ('c2222222-2222-2222-2222-222222222222', 'Fatima Al-Ali', 'فاطمة العلي', 'fatima@example.com', '+96550010002', '291020254321',
   'Commercial contract dispute with a supplier over undelivered goods worth ~12,000 KWD. Wants compensation and contract rescission.'),
  ('c3333333-3333-3333-3333-333333333333', 'Ahmad Al-Sabah', 'أحمد الصباح', 'ahmad@example.com', '+96550010003', '285030367890',
   'Family/inheritance matter: division of an estate among heirs. Requesting representation before the Personal Status court.');

-- Link the existing case to Yousef
UPDATE public.cases SET client_id = 'c1111111-1111-1111-1111-111111111111'
  WHERE id = '11111111-1111-1111-1111-111111111111';

-- ============ SEED MORE CASES ============
INSERT INTO public.cases (id, case_number, title, title_ar, client_id, case_type, case_type_ar, overall_status) VALUES
  ('22222222-2222-2222-2222-222222222222', '331207700', 'Commercial claim 771/2025', 'دعوى تجارية 771/2025',
   'c2222222-2222-2222-2222-222222222222', 'Commercial', 'تجاري', 'active'),
  ('33333333-3333-3333-3333-333333333333', '445880900', 'Estate division 118/2025', 'قسمة تركة 118/2025',
   'c3333333-3333-3333-3333-333333333333', 'Personal Status', 'أحوال شخصية', 'active');

-- ============ SEED HEARINGS (July / Aug 2026) ============
INSERT INTO public.hearings (case_id, level, session_date, notes, status, sort_order) VALUES
  ('22222222-2222-2222-2222-222222222222', 'first_instance', '2026-07-15', 'First substantive hearing — exchange of memoranda.', 'scheduled', 1),
  ('22222222-2222-2222-2222-222222222222', 'first_instance', '2026-07-28', 'Expert report review session.', 'scheduled', 2),
  ('33333333-3333-3333-3333-333333333333', 'first_instance', '2026-07-20', 'Heirs identification and estate inventory.', 'scheduled', 1),
  ('11111111-1111-1111-1111-111111111111', 'appeal', '2026-07-09', 'Appeal chamber session (concluded).', 'held', 1),
  ('33333333-3333-3333-3333-333333333333', 'first_instance', '2026-08-05', 'Continuation — valuation dispute.', 'scheduled', 2);

-- ============ SEED TASKS ============
INSERT INTO public.tasks (title, title_ar, description, description_ar, priority, status, assignee, assignee_ar, due_date, case_id, sort_order) VALUES
  ('File appeal memorandum', 'إيداع مذكرة الاستئناف',
   'Draft and file the appeal memorandum for the misdemeanor case before the 30-day window closes. Attach the first-instance ruling and power of attorney.',
   'إعداد وإيداع مذكرة الاستئناف لقضية الجنحة قبل انتهاء مهلة الثلاثين يوماً. إرفاق حكم أول درجة والتوكيل.',
   'high', 'in_progress', 'Sara Al-Rashid', 'سارة الرشيد', '2026-07-16', '11111111-1111-1111-1111-111111111111', 1),
  ('Prepare expert report response', 'إعداد الرد على تقرير الخبير',
   'Review the court-appointed expert report and prepare objections for the commercial claim hearing.',
   'مراجعة تقرير الخبير المنتدب وإعداد الاعتراضات لجلسة الدعوى التجارية.',
   'high', 'open', 'Khaled Al-Otaibi', 'خالد العتيبي', '2026-07-25', '22222222-2222-2222-2222-222222222222', 2),
  ('Collect estate documents', 'جمع مستندات التركة',
   'Obtain the property deeds and bank statements needed for the estate inventory.',
   'الحصول على صكوك الملكية وكشوف الحسابات البنكية اللازمة لحصر التركة.',
   'medium', 'open', 'Noura Al-Fahad', 'نورة الفهد', '2026-07-19', '33333333-3333-3333-3333-333333333333', 3),
  ('Client status call', 'مكالمة تحديث العميل',
   'Call the client to explain the current appeal status and next procedural steps.',
   'الاتصال بالعميل لشرح حالة الاستئناف الحالية والخطوات الإجرائية القادمة.',
   'low', 'done', 'Sara Al-Rashid', 'سارة الرشيد', '2026-07-08', '11111111-1111-1111-1111-111111111111', 4),
  ('Prepare power of attorney', 'إعداد التوكيل',
   'Draft the notarized power of attorney for the personal status matter.',
   'صياغة التوكيل الموثق لقضية الأحوال الشخصية.',
   'medium', 'in_progress', 'Noura Al-Fahad', 'نورة الفهد', '2026-07-22', '33333333-3333-3333-3333-333333333333', 5);
