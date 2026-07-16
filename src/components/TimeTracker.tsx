import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createTimeEntry } from "@/lib/insights.functions";
import { useApp } from "@/lib/app-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Pause, Square, Timer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "qadiya.timer.v1";

interface TimerState {
  running: boolean;
  startedAt: number | null;
  accumulatedMs: number;
  caseNumber: string;
  description: string;
}

function loadState(): TimerState {
  if (typeof window === "undefined")
    return { running: false, startedAt: null, accumulatedMs: 0, caseNumber: "", description: "" };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error();
    return JSON.parse(raw);
  } catch {
    return { running: false, startedAt: null, accumulatedMs: 0, caseNumber: "", description: "" };
  }
}

function fmt(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function TimeTracker() {
  const { t, lang } = useApp();
  const qc = useQueryClient();
  const save = useServerFn(createTimeEntry);
  const [state, setState] = useState<TimerState>(() => loadState());
  const [tick, setTick] = useState(0);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (state.running) {
      interval.current = setInterval(() => setTick((n) => n + 1), 1000);
      return () => {
        if (interval.current) clearInterval(interval.current);
      };
    }
  }, [state.running]);

  const elapsedMs =
    state.accumulatedMs + (state.running && state.startedAt ? Date.now() - state.startedAt : 0);

  const start = () =>
    setState((s) => ({ ...s, running: true, startedAt: Date.now() }));
  const pause = () =>
    setState((s) => ({
      ...s,
      running: false,
      startedAt: null,
      accumulatedMs: s.accumulatedMs + (s.startedAt ? Date.now() - s.startedAt : 0),
    }));

  const mutation = useMutation({
    mutationFn: async () => {
      const minutes = Math.max(1, Math.round(elapsedMs / 60000));
      let case_id: string | undefined;
      if (state.caseNumber.trim()) {
        const { data: cs } = await supabase
          .from("cases")
          .select("id")
          .eq("case_number", state.caseNumber.trim())
          .maybeSingle();
        if (!cs) throw new Error(t("Case number not found", "لم يتم العثور على القضية"));
        case_id = cs.id;
      }
      return save({
        data: {
          duration_minutes: minutes,
          case_id,
          description: state.description.trim() || undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success(t("Time entry saved", "تم حفظ الوقت"));
      setState({
        running: false,
        startedAt: null,
        accumulatedMs: 0,
        caseNumber: "",
        description: "",
      });
      qc.invalidateQueries({ queryKey: ["partner-kpis"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  void tick; // re-render tick

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Timer className="h-4 w-4 text-gold" />
          <span className={lang === "ar" ? "font-arabic" : ""}>
            {t("Time tracker", "متعقّب الوقت")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center">
          <div className="font-mono text-3xl tabular-nums">{fmt(elapsedMs)}</div>
        </div>
        <div className="flex gap-2 justify-center">
          {!state.running ? (
            <Button size="sm" onClick={start} className="gap-1">
              <Play className="h-4 w-4" /> {t("Start", "بدء")}
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={pause} className="gap-1">
              <Pause className="h-4 w-4" /> {t("Pause", "إيقاف مؤقت")}
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => mutation.mutate()}
            disabled={elapsedMs < 60000 || mutation.isPending}
            className="gap-1"
          >
            <Square className="h-4 w-4" /> {t("Save", "حفظ")}
          </Button>
        </div>
        <Input
          placeholder={t("Case number (optional)", "رقم القضية (اختياري)")}
          value={state.caseNumber}
          onChange={(e) => setState((s) => ({ ...s, caseNumber: e.target.value }))}
          className="h-8 text-sm"
        />
        <Input
          placeholder={t("What are you working on?", "على ماذا تعمل؟")}
          value={state.description}
          onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
          className="h-8 text-sm"
        />
      </CardContent>
    </Card>
  );
}
