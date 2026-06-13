import { useMemo } from "react";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminMember, useAdminMembers } from "@/hooks/useAdminMembers";
import type { AdminSoftDeleteTarget } from "./AdminMemberSoftDeleteActionModal";

type AdminDeletedMembersState = ReturnType<typeof useAdminMembers>;

type AdminDeletedMembersSectionProps = {
  members: AdminDeletedMembersState;
  isSuperManager: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMember: (userId: string) => void;
  onRequestRestore: (member: AdminSoftDeleteTarget) => void;
};

const formatDateTime = (value: string | null) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const displayPlan = (value: string | null) => {
  if (!value) return "-";
  if (value === "beginner") return "Başlangıç";
  if (value === "plus") return "Plus";
  return value;
};

const toSoftDeleteTarget = (member: AdminMember): AdminSoftDeleteTarget => ({
  user_id: member.user_id,
  email: member.email,
  full_name: member.full_name,
  account_status: member.account_status,
  membership: member.membership,
  updated_at: member.updated_at,
});

export const AdminDeletedMembersSection = ({
  members,
  isSuperManager,
  open,
  onOpenChange,
  onSelectMember,
  onRequestRestore,
}: AdminDeletedMembersSectionProps) => {
  const visibleMembers = useMemo(
    () => members.items.filter((member) => member.account_status === "deleted"),
    [members.items],
  );

  return (
    <Card className="rounded-none border-border/70 shadow-none">
      <CardHeader className="gap-5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium tracking-wide">Silinen üyeler</CardTitle>
            <p className="text-sm text-muted-foreground">
              Kalıcı olarak silinmeyen, listeden gizlenen üyeler.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => members.refresh()}
              disabled={members.loading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Yenile
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(!open)}>
              {open ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4" />}
              {open ? "Kapat" : "Aç"}
            </Button>
          </div>
        </div>
      </CardHeader>

      {open && (
        <CardContent className="space-y-4 px-5 pb-5 pt-0">
          {members.error && (
            <div className="border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive">Silinen üyeler alınamadı.</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{members.error.message}</p>
            </div>
          )}

          {!members.error && members.loading && (
            <div className="border border-border/70 p-6 text-sm text-muted-foreground">
              Silinen üyeler yükleniyor...
            </div>
          )}

          {!members.error && !members.loading && visibleMembers.length === 0 && (
            <div className="border border-border/70 p-6 text-sm text-muted-foreground">Silinen üye yok.</div>
          )}

          {!members.error && visibleMembers.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad soyad</TableHead>
                    <TableHead>E-posta</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Son işlem</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleMembers.map((member) => (
                    <TableRow key={member.user_id}>
                      <TableCell className="font-medium">{member.full_name ?? "-"}</TableCell>
                      <TableCell>{member.email ?? "-"}</TableCell>
                      <TableCell>{displayPlan(member.membership)}</TableCell>
                      <TableCell>{formatDateTime(member.updated_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => onSelectMember(member.user_id)}>
                            Detay
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!isSuperManager}
                            onClick={() => onRequestRestore(toSoftDeleteTarget(member))}
                          >
                            Geri al
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-border/70 pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>{visibleMembers.length} silinen üye</span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={members.previousPage} disabled={members.offset <= 0 || members.loading}>
                Önceki
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={members.nextPage}
                disabled={members.offset + members.limit >= members.totalCount || members.loading}
              >
                Sonraki
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
