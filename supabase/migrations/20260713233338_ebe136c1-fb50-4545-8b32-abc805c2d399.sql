create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  client_id uuid references public.clients(id) on delete set null,
  case_id uuid references public.cases(id) on delete set null,
  amount numeric(14,3) not null default 0,
  currency text not null default 'KWD',
  status text not null default 'draft',
  issue_date date not null default (now())::date,
  due_date date,
  paid_date date,
  description text,
  description_ar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.invoices to authenticated;
grant all on public.invoices to service_role;

alter table public.invoices enable row level security;

create policy "Invoices manageable by authenticated"
  on public.invoices for all
  to authenticated using (true) with check (true);

create trigger trg_invoices_updated
  before update on public.invoices
  for each row execute function public.update_updated_at_column();

create table public.workflow_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ar text,
  description text,
  description_ar text,
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.workflow_templates to authenticated;
grant all on public.workflow_templates to service_role;

alter table public.workflow_templates enable row level security;

create policy "Workflow templates manageable by authenticated"
  on public.workflow_templates for all
  to authenticated using (true) with check (true);

insert into public.workflow_templates (name, name_ar, description, description_ar, steps) values
('New Litigation Case', 'قضية تقاضٍ جديدة', 'Standard steps for opening a new litigation matter.', 'الخطوات المعتادة لفتح قضية تقاضٍ جديدة.',
 '[{"title":"Open case file","title_ar":"فتح ملف القضية","priority":"high","days_offset":0},{"title":"Draft statement of claim","title_ar":"صياغة صحيفة الدعوى","priority":"high","days_offset":3},{"title":"File with court","title_ar":"القيد لدى المحكمة","priority":"medium","days_offset":7},{"title":"Prepare for first hearing","title_ar":"التحضير للجلسة الأولى","priority":"medium","days_offset":14}]'::jsonb),
('Appeal Preparation', 'إعداد الاستئناف', 'Steps to prepare and file an appeal within the deadline.', 'خطوات إعداد وتقديم الاستئناف ضمن الميعاد.',
 '[{"title":"Review first-instance judgment","title_ar":"مراجعة حكم أول درجة","priority":"high","days_offset":0},{"title":"Draft grounds of appeal","title_ar":"صياغة أسباب الاستئناف","priority":"high","days_offset":10},{"title":"File appeal","title_ar":"تقديم الاستئناف","priority":"high","days_offset":25}]'::jsonb);