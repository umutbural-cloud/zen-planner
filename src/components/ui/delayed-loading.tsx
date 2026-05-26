import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export const useDelayedVisibility = (visible: boolean, delay = 300, minVisibleMs?: number) => {
  const [isVisible, setIsVisible] = useState(false);
  const [becameVisibleAt, setBecameVisibleAt] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) {
      setIsVisible(false);
      setBecameVisibleAt(null);
      return;
    }

    let timeoutId: number | null = null;

    timeoutId = window.setTimeout(() => {
      setIsVisible(true);
      setBecameVisibleAt((current) => current ?? Date.now());
    }, delay);

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [delay, visible]);

  useEffect(() => {
    if (!visible || !isVisible || !minVisibleMs || becameVisibleAt === null) return;

    const elapsed = Date.now() - becameVisibleAt;
    if (elapsed >= minVisibleMs) return;

    const timeoutId = window.setTimeout(() => {
      setIsVisible(true);
    }, minVisibleMs - elapsed);

    return () => window.clearTimeout(timeoutId);
  }, [becameVisibleAt, isVisible, minVisibleMs, visible]);

  return isVisible;
};

type DelayedLoadingProps = {
  loading: boolean;
  delay?: number;
  children?: ReactNode;
  fallback?: ReactNode;
  className?: string;
  preserveChildren?: boolean;
};

export const DelayedLoading = ({
  loading,
  delay = 300,
  children,
  fallback,
  className,
  preserveChildren = false,
}: DelayedLoadingProps) => {
  const showFallback = useDelayedVisibility(loading, delay);

  if (!loading) return <>{children}</>;

  if (!showFallback) {
    return preserveChildren ? <>{children}</> : null;
  }

  if (fallback) {
    return <div className={cn(className)}>{fallback}</div>;
  }

  return (
    <div className={cn("space-y-3", className)} role="status" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/60" />
        <span>Hazırlanıyor</span>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
};

type DelayedInlineLoadingProps = {
  loading: boolean;
  delay?: number;
  className?: string;
  label?: string;
};

export const DelayedInlineLoading = ({
  loading,
  delay = 300,
  className,
  label = "Yükleniyor",
}: DelayedInlineLoadingProps) => {
  const show = useDelayedVisibility(loading, delay);

  if (!loading || !show) return null;

  return (
    <span className={cn("inline-flex items-center gap-2 text-xs text-muted-foreground", className)} role="status" aria-live="polite" aria-busy="true">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
      <span>{label}</span>
    </span>
  );
};

type LoadingBlockProps = {
  lines?: number;
  className?: string;
};

export const LoadingBlock = ({ lines = 3, className }: LoadingBlockProps) => {
  const lineCount = useMemo(() => Math.max(1, lines), [lines]);

  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lineCount }).map((_, index) => (
        <Skeleton key={index} className="h-4 w-full" />
      ))}
    </div>
  );
};

export default DelayedLoading;
