
-- Auto-create appeal + cassation deadline tasks when a judgment is inserted
CREATE OR REPLACE FUNCTION public.create_deadline_tasks_for_judgment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_title text;
  c_title_ar text;
  c_number text;
  c_firm uuid;
  base_date date;
  appeal_due date;
  cassation_due date;
  next_sort int;
BEGIN
  SELECT title, title_ar, case_number, firm_id
    INTO c_title, c_title_ar, c_number, c_firm
  FROM public.cases WHERE id = NEW.case_id;

  base_date := COALESCE(NEW.judgment_date, CURRENT_DATE);
  appeal_due := base_date + INTERVAL '30 days';
  cassation_due := base_date + INTERVAL '60 days';

  SELECT COALESCE(MAX(sort_order), 0) INTO next_sort FROM public.tasks;

  INSERT INTO public.tasks (
    title, title_ar, description, description_ar,
    priority, status, due_date, case_id, sort_order, firm_id
  ) VALUES (
    'Appeal deadline — ' || COALESCE(c_title, c_number, 'case'),
    'ميعاد الاستئناف — ' || COALESCE(c_title_ar, c_title, c_number, 'قضية'),
    'Auto-created from judgment. 30-day appeal window.',
    'أُنشئت تلقائيًا من الحكم. مهلة الاستئناف 30 يومًا.',
    'high', 'open', appeal_due, NEW.case_id, next_sort + 1, c_firm
  );

  INSERT INTO public.tasks (
    title, title_ar, description, description_ar,
    priority, status, due_date, case_id, sort_order, firm_id
  ) VALUES (
    'Cassation deadline — ' || COALESCE(c_title, c_number, 'case'),
    'ميعاد الطعن بالتمييز — ' || COALESCE(c_title_ar, c_title, c_number, 'قضية'),
    'Auto-created from judgment. 60-day cassation window.',
    'أُنشئت تلقائيًا من الحكم. مهلة الطعن بالتمييز 60 يومًا.',
    'high', 'open', cassation_due, NEW.case_id, next_sort + 2, c_firm
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS judgments_create_deadline_tasks ON public.judgments;
CREATE TRIGGER judgments_create_deadline_tasks
AFTER INSERT ON public.judgments
FOR EACH ROW
EXECUTE FUNCTION public.create_deadline_tasks_for_judgment();
