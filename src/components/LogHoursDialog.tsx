import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createTimeEntry } from "@/lib/insights.functions";
import { useApp } from "@/lib/app-context";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Timer } from "lucide-react";
import { toast } from "sonner";

export function LogHoursDialog({
  open,
  onOpenChange,
  caseId,
  taskTitle,
  defaultRate = 100,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  caseId?: string | null;
  taskTitle?: string;
  defaultRate?: number;
}) {
  const { t } = useApp();
  const qc = useQueryClient();
  const save = useServerFn(createTimeEntry);
  const [hours, setHours] = useState("0.5");
  const [rate, setRate] = useState(String(defaultRate));
  const [desc, setDesc] = useState(taskTitle ?? "");

  const mutation = useMutation({
    mutationFn: async () => {
      const h = Number(hours);
      const r = Number(rate);
      if (!Number.isFinite(h) || h <= 0)
        throw new Error(t("Enter valid hours", "أدخل عدد ساعات صحيح"));
      const minutes = Math.max(1, Math.round(h * 60));
      const notePrefix = Number.isFinite(r) && r > 0 ? `[${r} KWD/hr] ` : "";
      return save({
        data: {
          duration_minutes: minutes,
          case_id: caseId ?? undefined,
          description: `${notePrefix}${desc}`.trim() || undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success(t("Time logged", "تم تسجيل الوقت"));
      qc.invalidateQueries({ queryKey: ["partner-kpis"] });
      onOpenChange(false);
      setHours("0.5");
      setDesc(taskTitle ?? "");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-gold" />
            {t("Log hours", "تسجيل الساعات")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">{t("Hours", "الساعات")}</label>
              <Input
                type="number"
                step="0.25"
                min="0.25"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                {t("Rate (KWD/hr)", "الأجر (دك/ساعة)")}
              </label>
              <Input
                type="number"
                step="5"
                min="0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              {t("Description", "الوصف")}
            </label>
            <Textarea
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={t("What did you work on?", "على ماذا عملت؟")}
            />
          </div>
          {hours && rate && Number(hours) > 0 && Number(rate) > 0 && (
            <div className="text-sm text-muted-foreground border rounded-md p-2 bg-muted/30">
              {t("Total", "الإجمالي")}:{" "}
              <span className="font-semibold text-foreground">
                {(Number(hours) * Number(rate)).toFixed(3)} KWD
              </span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel", "إلغاء")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-navy text-white hover:bg-navy/90 dark:bg-gold dark:text-navy"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("Save entry", "حفظ")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
