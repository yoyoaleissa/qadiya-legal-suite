CREATE TABLE public.client_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sender text NOT NULL DEFAULT 'firm',
  body text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT client_messages_sender_check CHECK (sender IN ('firm', 'client'))
);

CREATE INDEX idx_client_messages_client_id ON public.client_messages(client_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_messages TO authenticated;
GRANT ALL ON public.client_messages TO service_role;

ALTER TABLE public.client_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client messages manageable by authenticated"
  ON public.client_messages FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER trg_client_messages_updated
  BEFORE UPDATE ON public.client_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();