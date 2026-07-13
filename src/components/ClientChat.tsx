import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, MessagesSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/lib/app-context";
import { listClientMessages, sendClientMessage } from "@/lib/clients.functions";

interface ClientChatProps {
  clientId: string | null;
  clientName: string;
  onClose: () => void;
}

export function ClientChat({ clientId, clientName, onClose }: ClientChatProps) {
  const { lang } = useApp();
  const tt = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const runList = useServerFn(listClientMessages);
  const runSend = useServerFn(sendClientMessage);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["client-messages", clientId],
    queryFn: () => runList({ data: { clientId: clientId! } }),
    enabled: !!clientId,
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      runSend({ data: { clientId: clientId!, body, sender: "firm" } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-messages", clientId] });
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sendMutation.isPending]);

  function handleSend() {
    const body = draft.trim();
    if (!body || sendMutation.isPending) return;
    setDraft("");
    sendMutation.mutate(body);
  }

  return (
    <Dialog open={!!clientId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <MessagesSquare className="h-5 w-5 text-gold" />
            <span className={lang === "ar" ? "font-arabic" : ""}>{clientName}</span>
          </DialogTitle>
          <DialogDescription>
            {tt("Direct secure messaging with your client.", "مراسلة مباشرة وآمنة مع موكّلك.")}
          </DialogDescription>
        </DialogHeader>

        <div ref={scrollRef} className="h-[52vh] overflow-y-auto bg-muted/30 px-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {tt("Loading messages…", "جارٍ تحميل الرسائل…")}
            </div>
          ) : (messages ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
              <MessagesSquare className="h-8 w-8 opacity-40" />
              <p className="text-sm">
                {tt("No messages yet. Start the conversation below.", "لا توجد رسائل بعد. ابدأ المحادثة أدناه.")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {(messages ?? []).map((m) => {
                const mine = m.sender === "firm";
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                        mine
                          ? "bg-navy text-white dark:bg-gold dark:text-navy rounded-ee-sm"
                          : "border bg-card text-foreground rounded-es-sm"
                      }`}
                    >
                      <p className={lang === "ar" ? "font-arabic" : ""}>{m.body}</p>
                      <div
                        className={`mt-1 text-[10px] ${
                          mine ? "text-white/70 dark:text-navy/70" : "text-muted-foreground"
                        }`}
                      >
                        {new Date(m.created_at).toLocaleString(lang === "ar" ? "ar-KW" : "en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          numberingSystem: "latn",
                        })}
                        {" · "}
                        {mine ? tt("You", "أنت") : tt("Client", "الموكّل")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder={tt("Type a message…", "اكتب رسالة…")}
              className="min-h-[42px] max-h-32 resize-none"
            />
            <Button
              onClick={handleSend}
              disabled={!draft.trim() || sendMutation.isPending}
              size="icon"
              className="h-[42px] w-[42px] shrink-0"
              aria-label={tt("Send", "إرسال")}
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4 rtl:-scale-x-100" />
              )}
            </Button>
          </div>
          {sendMutation.isError && (
            <p className="mt-2 text-xs text-destructive">
              {tt("Could not send. Please try again.", "تعذّر الإرسال. حاول مرة أخرى.")}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
