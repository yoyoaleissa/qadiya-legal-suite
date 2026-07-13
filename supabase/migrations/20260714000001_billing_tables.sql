-- ============ BILLING MODULE ============
-- Invoices
CREATE TABLE public.invoices (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  amount DECIMAL(10,3) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KWD',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_date DATE,
  description TEXT,
  description_ar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Invoices viewable by authenticated" ON public.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Invoices manageable by authenticated" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Time Entries
CREATE TABLE public.time_entries (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  hours DECIMAL(4,2) NOT NULL,
  rate DECIMAL(8,3) NOT NULL DEFAULT 50.000,
  description TEXT,
  description_ar TEXT,
  billable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;
GRANT ALL ON public.time_entries TO service_role;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Time entries viewable by authenticated" ON public.time_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Time entries manageable by authenticated" ON public.time_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Workflow Templates (stored templates for task chains)
CREATE TABLE public.workflow_templates (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.workflow_templates TO authenticated;
GRANT ALL ON public.workflow_templates TO service_role;
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workflow templates viewable by authenticated" ON public.workflow_templates FOR SELECT TO authenticated USING (true);

-- Seed default workflow templates
INSERT INTO public.workflow_templates (name, name_ar, description, description_ar, steps) VALUES
  ('New Case Intake', 'استلام قضية جديدة', 'Standard workflow for new case onboarding', 'سير العمل القياسي لاستلام قضية جديدة',
   '[{"title":"Review case documents","title_ar":"مراجعة مستندات القضية","priority":"high","days_offset":1},{"title":"Register power of attorney","title_ar":"تسجيل التوكيل","priority":"medium","days_offset":2},{"title":"File initial pleading","title_ar":"إيداع صحيفة الدعوى","priority":"high","days_offset":5},{"title":"Notify client of filing","title_ar":"إخطار العميل بالقيد","priority":"low","days_offset":6},{"title":"Set calendar reminder for first hearing","title_ar":"تعيين تذكير بالجلسة الأولى","priority":"medium","days_offset":7}]'),
  ('Appeal Preparation', 'تحضير استئناف', 'Workflow for filing an appeal', 'سير العمل لتقديم استئناف',
   '[{"title":"Review first instance judgment","title_ar":"مراجعة حكم أول درجة","priority":"high","days_offset":1},{"title":"Draft appeal memorandum","title_ar":"صياغة مذكرة الاستئناف","priority":"high","days_offset":7},{"title":"File appeal with court","title_ar":"إيداع الاستئناف بالمحكمة","priority":"high","days_offset":14},{"title":"Notify client of appeal status","title_ar":"إخطار العميل بحالة الاستئناف","priority":"medium","days_offset":15}]'),
  ('Execution Follow-up', 'متابعة تنفيذ', 'Workflow for execution proceedings', 'سير العمل لإجراءات التنفيذ',
   '[{"title":"File execution request","title_ar":"تقديم طلب التنفيذ","priority":"high","days_offset":1},{"title":"Follow up with execution department","title_ar":"المتابعة مع إدارة التنفيذ","priority":"medium","days_offset":7},{"title":"Report execution status to client","title_ar":"إبلاغ العميل بحالة التنفيذ","priority":"low","days_offset":14}]');
