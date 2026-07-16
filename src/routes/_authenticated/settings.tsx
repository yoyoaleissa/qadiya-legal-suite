import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Building2, Save, Trash2, Plus, CalendarDays, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-context";
import { toast } from "sonner";
import {
  getFirmSettings,
  upsertFirmSettings,
  KUWAIT_HOLIDAYS_2026,
} from "@/lib/settings.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Firm Settings — Qadiya OS" },
      {
        name: "description",
        content:
          "Manage firm profile, invoice numbering, Kuwait working hours and holidays, and payment details.",
      },
    ],
  }),
  component: SettingsPage,
});

type Holiday = { date: string; label: string };

function SettingsPage() {
  const { t, lang } = useApp();
  const qc = useQueryClient();
  const runGet = useServerFn(getFirmSettings);
  const runSave = useServerFn(upsertFirmSettings);
  const { data, isLoading } = useQuery({ queryKey: ["firm-settings"], queryFn: () => runGet() });

  const [form, setForm] = useState({
    firm_name: "Qadiya Law Firm",
    firm_name_ar: "مكتب قضية للمحاماة",
    vat_number: "",
    address: "",
    address_ar: "",
    phone: "",
    email: "",
    logo_url: "",
    invoice_prefix: "INV",
    invoice_next_seq: 1,
    working_hours_start: "08:30",
    working_hours_end: "17:00",
    default_currency: "KWD",
    bank_name: "",
    bank_iban: "",
    knet_merchant_link: "",
  });
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHoliday, setNewHoliday] = useState<Holiday>({ date: "", label: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        firm_name: data.firm_name,
        firm_name_ar: data.firm_name_ar,
        vat_number: data.vat_number ?? "",
        address: data.address ?? "",
        address_ar: data.address_ar ?? "",
        phone: data.phone ?? "",
        email: data.email ?? "",
        logo_url: data.logo_url ?? "",
        invoice_prefix: data.invoice_prefix,
        invoice_next_seq: data.invoice_next_seq,
        working_hours_start: (data.working_hours_start ?? "08:30").slice(0, 5),
        working_hours_end: (data.working_hours_end ?? "17:00").slice(0, 5),
        default_currency: data.default_currency,
        bank_name: data.bank_name ?? "",
        bank_iban: data.bank_iban ?? "",
        knet_merchant_link: data.knet_merchant_link ?? "",
      });
      setHolidays((data.holidays as Holiday[]) ?? []);
    }
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await runSave({ data: { ...form, holidays } });
      toast.success(t("Settings saved", "تم حفظ الإعدادات"));
      qc.invalidateQueries({ queryKey: ["firm-settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const addHoliday = () => {
    if (!newHoliday.date || !newHoliday.label) return;
    setHolidays([...holidays, newHoliday].sort((a, b) => a.date.localeCompare(b.date)));
    setNewHoliday({ date: "", label: "" });
  };

  const removeHoliday = (idx: number) => setHolidays(holidays.filter((_, i) => i !== idx));

  const seedKuwait = () => {
    const existing = new Set(holidays.map((h) => `${h.date}|${h.label}`));
    const merged = [...holidays];
    for (const h of KUWAIT_HOLIDAYS_2026) {
      if (!existing.has(`${h.date}|${h.label}`)) merged.push(h);
    }
    setHolidays(merged.sort((a, b) => a.date.localeCompare(b.date)));
    toast.success(t("Kuwait 2026 holidays added", "تمت إضافة عطلات الكويت 2026"));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          {t("Configuration", "الإعدادات")}
        </div>
        <h1 className="font-display text-3xl">{t("Firm Settings", "إعدادات المكتب")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t(
            "Firm profile, invoice numbering, working hours, holidays and payments.",
            "بيانات المكتب وترقيم الفواتير وساعات العمل والعطلات والدفعات.",
          )}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 rounded-md bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gold" />
                <h2 className="font-display text-lg">{t("Firm profile", "بيانات المكتب")}</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("Firm name (EN)", "اسم المكتب (EN)")}>
                  <Input value={form.firm_name} onChange={(e) => setForm({ ...form, firm_name: e.target.value })} />
                </Field>
                <Field label={t("Firm name (AR)", "اسم المكتب (AR)")}>
                  <Input value={form.firm_name_ar} onChange={(e) => setForm({ ...form, firm_name_ar: e.target.value })} />
                </Field>
                <Field label={t("VAT number", "الرقم الضريبي")}>
                  <Input value={form.vat_number} onChange={(e) => setForm({ ...form, vat_number: e.target.value })} />
                </Field>
                <Field label={t("Phone", "هاتف")}>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </Field>
                <Field label={t("Email", "بريد إلكتروني")}>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </Field>
                <Field label={t("Logo URL", "رابط الشعار")}>
                  <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
                </Field>
                <Field label={t("Address (EN)", "العنوان (EN)")}>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </Field>
                <Field label={t("Address (AR)", "العنوان (AR)")}>
                  <Input value={form.address_ar} onChange={(e) => setForm({ ...form, address_ar: e.target.value })} />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-gold" />
                <h2 className="font-display text-lg">{t("Invoicing & payments", "الفوترة والدفع")}</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={t("Invoice prefix", "بادئة الفاتورة")}>
                  <Input value={form.invoice_prefix} onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value.toUpperCase() })} />
                </Field>
                <Field label={t("Next number", "الرقم التالي")}>
                  <Input type="number" min={1} value={form.invoice_next_seq}
                    onChange={(e) => setForm({ ...form, invoice_next_seq: parseInt(e.target.value || "1", 10) })} />
                </Field>
                <Field label={t("Currency", "العملة")}>
                  <Input value={form.default_currency} onChange={(e) => setForm({ ...form, default_currency: e.target.value.toUpperCase().slice(0, 3) })} />
                </Field>
                <Field label={t("Bank name", "اسم البنك")}>
                  <Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
                </Field>
                <Field label={t("IBAN", "IBAN")}>
                  <Input value={form.bank_iban} onChange={(e) => setForm({ ...form, bank_iban: e.target.value })} />
                </Field>
                <Field label={t("KNET/Stripe pay link", "رابط الدفع كي-نت/سترايب")}>
                  <Input value={form.knet_merchant_link} onChange={(e) => setForm({ ...form, knet_merchant_link: e.target.value })} />
                </Field>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t(
                  "The pay link is appended to every invoice PDF and portal invoice view.",
                  "يُضاف رابط الدفع إلى كل فاتورة PDF وصفحة الفاتورة في بوابة الموكّل.",
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-gold" />
                <h2 className="font-display text-lg">{t("Working hours & holidays", "ساعات العمل والعطلات")}</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("Working hours start", "بداية العمل")}>
                  <Input type="time" value={form.working_hours_start}
                    onChange={(e) => setForm({ ...form, working_hours_start: e.target.value })} />
                </Field>
                <Field label={t("Working hours end", "نهاية العمل")}>
                  <Input type="time" value={form.working_hours_end}
                    onChange={(e) => setForm({ ...form, working_hours_end: e.target.value })} />
                </Field>
              </div>

              <div className="mt-2">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm">{t("Public holidays", "العطلات الرسمية")}</Label>
                  <Button size="sm" variant="outline" onClick={seedKuwait}>
                    {t("Load Kuwait 2026", "تحميل عطلات الكويت 2026")}
                  </Button>
                </div>
                <div className="rounded-md border divide-y max-h-72 overflow-y-auto">
                  {holidays.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                      {t("No holidays yet.", "لا توجد عطلات بعد.")}
                    </div>
                  ) : (
                    holidays.map((h, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                        <div>
                          <span className="font-mono text-xs text-muted-foreground me-3">{h.date}</span>
                          <span className={lang === "ar" ? "font-arabic" : ""}>{h.label}</span>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => removeHoliday(i)} aria-label="Remove">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-[160px_1fr_auto]">
                  <Input type="date" value={newHoliday.date}
                    onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })} />
                  <Input placeholder={t("Label", "الوصف")} value={newHoliday.label}
                    onChange={(e) => setNewHoliday({ ...newHoliday, label: e.target.value })} />
                  <Button variant="outline" onClick={addHoliday} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> {t("Add", "إضافة")}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {t(
                    "Deadline calculator skips these dates when computing appeal windows.",
                    "تتخطى حاسبة المواعيد هذه الأيام عند حساب مدد الاستئناف.",
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end sticky bottom-4">
            <Button onClick={save} disabled={saving} className="gap-2 shadow-lg">
              <Save className="h-4 w-4" />
              {saving ? t("Saving…", "جارٍ الحفظ…") : t("Save settings", "حفظ الإعدادات")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
