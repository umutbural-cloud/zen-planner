import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type AdminMemberSoftDeleteResponse = {
  success?: boolean;
  target_user_id?: string;
  account_status?: string;
  audit_id?: string;
  changed_at?: string;
};

type MemberSoftDeleteRequest = {
  targetUserId: string;
  reasonCode: string;
  reasonNote?: string | null;
};

type SupabaseRpcClient = typeof supabase & {
  rpc(
    fn: "admin_archive_member" | "admin_restore_member",
    args: {
      target_user_id: string;
      reason_code: string;
      reason_note: string | null;
    },
  ): Promise<{ data: unknown; error: Error | null }>;
};

const isResponseShape = (value: unknown): value is AdminMemberSoftDeleteResponse => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;

  return typeof (value as Record<string, unknown>).success === "boolean";
};

const normalizeReasonCode = (reasonCode: string) => reasonCode.trim();

const mapSoftDeleteError = (error: Error, action: "archive" | "restore"): string => {
  const message = error.message || "";
  const lowerMessage = message.toLowerCase();
  const code = (error as Error & { code?: string }).code;

  if (lowerMessage.includes("authentication required") || code === "401") {
    return "Bu işlem için tekrar giriş yapmanız gerekebilir.";
  }

  if (lowerMessage.includes("super manager privileges required") || lowerMessage.includes("admin privileges required")) {
    return "Bu işlem için yetkiniz yok.";
  }

  if (lowerMessage.includes("admin cannot delete own account")) {
    return "Kendi hesabınızı silemezsiniz.";
  }

  if (
    lowerMessage.includes("function public.admin_archive_member") ||
    lowerMessage.includes("function public.admin_restore_member") ||
    lowerMessage.includes("could not find the function") ||
    lowerMessage.includes("pgrst202") ||
    lowerMessage.includes("not found")
  ) {
    return "Bu işlem için gerekli veritabanı güncellemesi henüz uygulanmamış olabilir.";
  }

  if (lowerMessage.includes("already_deleted")) {
    return "Bu üye zaten silinenlerde.";
  }

  if (lowerMessage.includes("member is not deleted")) {
    return "Bu üye silinenlerde değil.";
  }

  if (lowerMessage.includes("cannot delete last super_manager")) {
    return "Son super manager silinemez.";
  }

  if (lowerMessage.includes("member profile or membership record not found") || lowerMessage.includes("member not found")) {
    return "Üye bilgisi güncel değil. Detayı yenileyip tekrar deneyin.";
  }

  if (
    lowerMessage.includes("reason_code") &&
    !lowerMessage.includes("function public.admin_archive_member") &&
    !lowerMessage.includes("function public.admin_restore_member") &&
    !lowerMessage.includes("could not find the function") &&
    !lowerMessage.includes("pgrst202") &&
    !lowerMessage.includes("not found")
  ) {
    return "İşlem nedeni geçerli değil.";
  }

  if (
    lowerMessage.includes("failed to fetch") ||
    lowerMessage.includes("network") ||
    lowerMessage.includes("connection") ||
    lowerMessage.includes("fetch error")
  ) {
    return "Bağlantı sırasında hata oluştu. Tekrar deneyin.";
  }

  return action === "archive"
    ? "Üye silinenlere taşınamadı. Tekrar deneyin."
    : "Üye geri alınamadı. Tekrar deneyin.";
};

export const useAdminMemberSoftDeleteActions = () => {
  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reset = useCallback(() => {
    if (!mountedRef.current) return;

    setError(null);
    setErrorMessage(null);
  }, []);

  const runMutation = useCallback(
    async (action: "archive" | "restore", request: MemberSoftDeleteRequest) => {
      if (inFlightRef.current) return false;

      const normalizedReasonCode = normalizeReasonCode(request.reasonCode);
      if (!normalizedReasonCode) {
        setErrorMessage("İşlem nedeni seçin.");
        return false;
      }

      inFlightRef.current = true;
      setLoading(true);
      setError(null);
      setErrorMessage(null);

      try {
        const rpcName = action === "archive" ? "admin_archive_member" : "admin_restore_member";
        const { data, error: rpcError } = await (supabase as SupabaseRpcClient).rpc(rpcName, {
          target_user_id: request.targetUserId,
          reason_code: normalizedReasonCode,
          reason_note: request.reasonNote?.trim() || null,
        });

        if (!mountedRef.current) return false;

        if (rpcError) {
          setError(rpcError);
          setErrorMessage(mapSoftDeleteError(rpcError, action));
          return false;
        }

        if (!isResponseShape(data) || data.success !== true) {
          const parseError = new Error("Soft delete response shape is invalid");
          setError(parseError);
          setErrorMessage(action === "archive" ? "Üye silinenlere taşınamadı." : "Üye geri alınamadı.");
          return false;
        }

        return true;
      } catch (unknownError) {
        if (!mountedRef.current) return false;

        const normalizedError = unknownError instanceof Error ? unknownError : new Error("Soft delete request failed");
        setError(normalizedError);
        setErrorMessage(mapSoftDeleteError(normalizedError, action));
        return false;
      } finally {
        inFlightRef.current = false;
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [],
  );

  const archiveMember = useCallback(
    async (request: MemberSoftDeleteRequest) => runMutation("archive", request),
    [runMutation],
  );

  const restoreMember = useCallback(
    async (request: MemberSoftDeleteRequest) => runMutation("restore", request),
    [runMutation],
  );

  return {
    archiveMember,
    restoreMember,
    reset,
    loading,
    error,
    errorMessage,
  };
};
