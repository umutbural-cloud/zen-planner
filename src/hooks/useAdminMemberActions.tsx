import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AdminMembershipReasonCode, AdminMembershipTarget } from "@/components/admin/AdminMemberActionModal";

type AdminChangeMembershipResponse = {
  success?: boolean;
  target_user_id?: string;
  membership?: string;
  membership_status?: string;
  audit_id?: string;
  changed_at?: string;
};

type SupabaseRpcClient = typeof supabase & {
  rpc(
    fn: "admin_change_membership",
    args: {
      target_user_id: string;
      target_membership: AdminMembershipTarget;
      reason_code: AdminMembershipReasonCode;
    },
  ): Promise<{ data: unknown; error: Error | null }>;
};

const mapMembershipChangeError = (error: Error): string => {
  const message = error.message || "";
  const lowerMessage = message.toLowerCase();
  const code = (error as Error & { code?: string }).code;

  if (lowerMessage.includes("admin cannot change own membership")) {
    return "Kendi üyeliğinizi bu panelden değiştiremezsiniz.";
  }

  if (lowerMessage.includes("admin accounts cannot be managed through member rpcs")) {
    return "Admin hesapları üye işlem ekranından yönetilemez.";
  }

  if (lowerMessage.includes("unsupported membership")) {
    return "Seçilen üyelik tipi geçerli değil.";
  }

  if (lowerMessage.includes("reason_code") && lowerMessage.includes("unsupported")) {
    return "Seçilen işlem nedeni geçerli değil.";
  }

  if (lowerMessage.includes("member profile or membership record not found") || lowerMessage.includes("member not found")) {
    return "Üye bilgisi güncel değil. Detayı yenileyip tekrar deneyin.";
  }

  if (code === "42501" || lowerMessage.includes("permission denied") || lowerMessage.includes("admin privileges required")) {
    return "Bu işlem için yetkiniz yok.";
  }

  if (
    lowerMessage.includes("failed to fetch") ||
    lowerMessage.includes("network") ||
    lowerMessage.includes("connection") ||
    lowerMessage.includes("fetch error")
  ) {
    return "Bağlantı sırasında hata oluştu. Tekrar deneyin.";
  }

  return "İşlem tamamlanamadı. Tekrar deneyin.";
};

const isChangeMembershipResponse = (value: unknown): value is AdminChangeMembershipResponse => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;

  const response = value as Record<string, unknown>;
  return typeof response.success === "boolean";
};

export const useAdminMemberActions = () => {
  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearOutcome = useCallback(() => {
    if (!mountedRef.current) return;

    setError(null);
    setErrorMessage(null);
    setSuccess(false);
  }, []);

  const changeMembership = useCallback(
    async (targetUserId: string, targetMembership: AdminMembershipTarget, reasonCode: AdminMembershipReasonCode) => {
      if (inFlightRef.current) {
        return false;
      }

      inFlightRef.current = true;
      setLoading(true);
      setError(null);
      setErrorMessage(null);
      setSuccess(false);

      try {
        const { data, error: rpcError } = await (supabase as SupabaseRpcClient).rpc("admin_change_membership", {
          target_user_id: targetUserId,
          target_membership: targetMembership,
          reason_code: reasonCode,
        });

        if (!mountedRef.current) return false;

        if (rpcError) {
          const mappedMessage = mapMembershipChangeError(rpcError);
          setError(rpcError);
          setErrorMessage(mappedMessage);
          setSuccess(false);
          return false;
        }

        if (!isChangeMembershipResponse(data) || data.success !== true) {
          const parseError = new Error("Membership change response shape is invalid");
          setError(parseError);
          setErrorMessage("İşlem tamamlanamadı. Tekrar deneyin.");
          setSuccess(false);
          return false;
        }

        setSuccess(true);
        setError(null);
        setErrorMessage(null);
        return true;
      } catch (unknownError) {
        if (!mountedRef.current) return false;

        const normalizedError = unknownError instanceof Error ? unknownError : new Error("Membership change failed");
        setError(normalizedError);
        setErrorMessage(mapMembershipChangeError(normalizedError));
        setSuccess(false);
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

  return {
    changeMembership,
    clearOutcome,
    loading,
    error,
    errorMessage,
    success,
  };
};
