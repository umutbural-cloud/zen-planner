import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminAccountStatus, AdminMember, useAdminMembers } from "@/hooks/useAdminMembers";
import { formatLastSeenWindow } from "./adminDateDisplay";

type AdminMembersState = ReturnType<typeof useAdminMembers>;

type AdminMembersTableProps = {
  members: AdminMembersState;
  onSelectMember: (userId: string) => void;
};

const filterValue = (value: string | null) => value ?? "all";
const fromFilterValue = (value: string): AdminAccountStatus | null => (value === "all" ? null : (value as AdminAccountStatus));

const formatDate = (value: string | null) => {
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

export const AdminMembersTable = ({ members, onSelectMember }: AdminMembersTableProps) => {
  const visibleMembers = members.items.filter((member) => member.account_status !== "deleted");
  const canGoPrevious = members.offset > 0;
  const canGoNext = members.offset + members.limit < members.totalCount;
  const rangeStart = members.totalCount === 0 ? 0 : members.offset + 1;
  const rangeEnd = Math.min(members.offset + members.limit, members.totalCount);

  return (
    <Card className="rounded-none border-border/70 shadow-none">
      <CardHeader className="gap-5 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium tracking-wide">Üyeler</CardTitle>
            <p className="text-sm text-muted-foreground">Operasyonel üye durumu</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={members.refresh} disabled={members.loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Tekrar dene
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Input
            value={members.query}
            onChange={(event) => members.setQuery(event.target.value)}
            placeholder="E-posta, ad veya kullanıcı id"
            className="rounded-none md:col-span-1"
          />

          <Select value={filterValue(members.membership)} onValueChange={(value) => members.setMembership(fromFilterValue(value))}>
            <SelectTrigger className="rounded-none">
              <SelectValue placeholder="Plan seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm planlar</SelectItem>
              <SelectItem value="beginner">Başlangıç</SelectItem>
              <SelectItem value="plus">Plus</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterValue(members.membershipStatus)}
            onValueChange={(value) => members.setMembershipStatus(fromFilterValue(value))}
          >
            <SelectTrigger className="rounded-none">
              <SelectValue placeholder="Plan durumu seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm plan durumları</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="cancelled">İptal edildi</SelectItem>
              <SelectItem value="expired">Süresi doldu</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterValue(members.accountStatus)}
            onValueChange={(value) => members.setAccountStatus(fromFilterValue(value))}
          >
            <SelectTrigger className="rounded-none">
              <SelectValue placeholder="Hesap durumu seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm hesap durumları</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="suspended">Askıya alındı</SelectItem>
              <SelectItem value="security_blocked">Güvenlik nedeniyle engellendi</SelectItem>
              <SelectItem value="anonymized">Anonimleştirildi</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-5 pb-5 pt-0">
        {members.error && (
          <div className="border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">Üye listesi alınamadı.</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{members.error.message}</p>
          </div>
        )}

        {!members.error && members.loading && (
          <div className="border border-border/70 p-6 text-sm text-muted-foreground">Üyeler yükleniyor...</div>
        )}

        {!members.error && !members.loading && visibleMembers.length === 0 && (
          <div className="border border-border/70 p-6 text-sm text-muted-foreground">Kriterlere uygun üye bulunamadı.</div>
        )}

        {!members.error && visibleMembers.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad soyad</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Son görülme aralığı</TableHead>
                <TableHead>Oluşturulma</TableHead>
                <TableHead className="text-right">Detay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleMembers.map((member) => (
                <MemberRow key={member.user_id} member={member} onSelectMember={onSelectMember} />
              ))}
            </TableBody>
          </Table>
        )}

        <div className="flex flex-col gap-3 border-t border-border/70 pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            {rangeStart}-{rangeEnd} / {members.totalCount}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={members.previousPage} disabled={!canGoPrevious || members.loading}>
              Önceki
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={members.nextPage} disabled={!canGoNext || members.loading}>
              Sonraki
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const MemberRow = ({ member, onSelectMember }: { member: AdminMember; onSelectMember: (userId: string) => void }) => (
  <TableRow>
    <TableCell className="font-medium">{member.full_name ?? "-"}</TableCell>
    <TableCell>{member.email ?? "-"}</TableCell>
    <TableCell>{displayPlan(member.membership)}</TableCell>
    <TableCell>{formatLastSeenWindow(member.last_seen_at)}</TableCell>
    <TableCell>{formatDate(member.created_at)}</TableCell>
    <TableCell className="text-right">
      <Button type="button" variant="outline" size="sm" onClick={() => onSelectMember(member.user_id)}>
        Detay
      </Button>
    </TableCell>
  </TableRow>
);
