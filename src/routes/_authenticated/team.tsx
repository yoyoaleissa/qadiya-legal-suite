import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Loader2, Mail, Trash2, UserPlus, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/lib/app-context";
import {
  createInvitation,
  listFirmInvitations,
  listFirmMembers,
  revokeInvitation,
  getMyFirm,
} from "@/lib/firms.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Team — Qadiya OS" },
      {
        name: "description",
        content: "Manage members of your firm and invite new staff.",
      },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  const { t, lang } = useApp();
  const isAr = lang === "ar";
  const qc = useQueryClient();
  const runMembers = useServerFn(listFirmMembers);
  const runInvitations = useServerFn(listFirmInvitations);
  const runCreate = useServerFn(createInvitation);
  const runRevoke = useServerFn(revokeInvitation);
  const runFirm = useServerFn(getMyFirm);

  const { data: firm } = useQuery({ queryKey: ["my-firm"], queryFn: () => runFirm() });
  const { data: members } = useQuery({ queryKey: ["firm-members"], queryFn: () => runMembers() });
  const { data: invitations } = useQuery({
    queryKey: ["firm-invitations"],
    queryFn: () => runInvitations(),
  });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"partner" | "associate" | "paralegal" | "admin">("associate");
  const [creating, setCreating] = useState(false);
  const [lastLink, setLastLink] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const inv = await runCreate({ data: { email, role } });
      const link = `${window.location.origin}/invite/${inv.token}`;
      setLastLink(link);
      setEmail("");
      await qc.invalidateQueries({ queryKey: ["firm-invitations"] });
      toast.success(t("Invitation created", "تم إنشاء الدعوة"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await runRevoke({ data: { id } });
      await qc.invalidateQueries({ queryKey: ["firm-invitations"] });
      toast.success(t("Invitation revoked", "تم إلغاء الدعوة"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const copyLink = async (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(link);
    toast.success(t("Link copied", "تم نسخ الرابط"));
  };

  const pending = (invitations ?? []).filter((i) => !i.accepted_at);

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
            <Users className="h-6 w-6 text-gold" />
            <span className={isAr ? "font-arabic" : ""}>{t("Team", "الفريق")}</span>
          </h1>
          {firm && (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className={isAr ? "font-arabic" : ""}>
                {isAr ? firm.name_ar : firm.name_en}
              </span>
            </p>
          )}
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5">
              <UserPlus className="h-4 w-4" />
              <span className={isAr ? "font-arabic" : ""}>
                {t("Invite member", "دعوة عضو")}
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                <span className={isAr ? "font-arabic" : ""}>
                  {t("Invite a new member", "دعوة عضو جديد")}
                </span>
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("Email", "البريد الإلكتروني")}</Label>
                <Input
                  type="email"
                  dir="ltr"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@firm.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Role", "الدور")}</Label>
                <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="partner">{t("Partner", "شريك")}</SelectItem>
                    <SelectItem value="associate">{t("Associate", "محامٍ")}</SelectItem>
                    <SelectItem value="paralegal">{t("Paralegal", "مساعد قانوني")}</SelectItem>
                    <SelectItem value="admin">{t("Admin", "مدير")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {lastLink && (
                <div className="rounded-md border bg-muted/50 p-3 text-xs">
                  <p className="mb-2 font-medium">{t("Invitation link:", "رابط الدعوة:")}</p>
                  <div className="flex items-center gap-2">
                    <code
                      dir="ltr"
                      className="flex-1 truncate rounded bg-background px-2 py-1 font-mono"
                    >
                      {lastLink}
                    </code>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        await navigator.clipboard.writeText(lastLink);
                        toast.success(t("Copied", "تم النسخ"));
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button type="submit" disabled={creating} className="gap-1.5">
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span className={isAr ? "font-arabic" : ""}>
                    {t("Create invitation", "إنشاء الدعوة")}
                  </span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <span className={isAr ? "font-arabic" : ""}>
              {t("Members", "الأعضاء")} ({members?.length ?? 0})
            </span>
          </h2>
          <div className="divide-y">
            {(members ?? []).map((m) => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium">
                    <span className={isAr ? "font-arabic" : ""}>
                      {isAr && m.full_name_ar ? m.full_name_ar : m.full_name ?? m.id.slice(0, 8)}
                    </span>
                  </div>
                  {m.title && <div className="text-xs text-muted-foreground">{m.title}</div>}
                </div>
                <div className="flex gap-1">
                  {m.roles.map((r) => (
                    <Badge key={r} variant="secondary" className="capitalize">
                      {r}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
            {(members?.length ?? 0) === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                <span className={isAr ? "font-arabic" : ""}>
                  {t("No members yet.", "لا يوجد أعضاء بعد.")}
                </span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className={isAr ? "font-arabic" : ""}>
              {t("Pending invitations", "الدعوات المعلقة")} ({pending.length})
            </span>
          </h2>
          <div className="divide-y">
            {pending.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-3">
                <div>
                  <div dir="ltr" className="font-mono text-sm">
                    {inv.email}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <Badge variant="outline" className="capitalize">
                      {inv.role}
                    </Badge>{" "}
                    <span className={isAr ? "font-arabic" : ""}>
                      {t("expires", "تنتهي في")}{" "}
                    </span>
                    {new Date(inv.expires_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyLink(inv.token)}
                    title={t("Copy link", "نسخ الرابط")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRevoke(inv.id)}
                    className="text-destructive"
                    title={t("Revoke", "إلغاء")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {pending.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                <span className={isAr ? "font-arabic" : ""}>
                  {t("No pending invitations.", "لا توجد دعوات معلقة.")}
                </span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
