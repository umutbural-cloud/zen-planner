import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

type AdminEngagementEmptyStateProps = {
  onRetry?: () => void;
  error?: boolean;
};

export const AdminEngagementEmptyState = ({ onRetry, error = false }: AdminEngagementEmptyStateProps) => (
  <Card className="rounded-none border-border/70 shadow-none">
    <CardContent className="px-5 py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-medium tracking-wide text-foreground">
              {error ? "Engagement metrikleri alınamadı." : "Engagement snapshot yok"}
            </h3>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {error
              ? "Tekrar dene ile sadece dashboard RPC yeniden çağrılır."
              : "Günlük final snapshot üretildikten sonra bu bölüm dolacak. Bu ekran snapshot hesaplamaz."}
          </p>
        </div>

        {onRetry && (
          <Button type="button" variant="outline" onClick={onRetry} className="sm:self-start">
            Tekrar dene
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
);
