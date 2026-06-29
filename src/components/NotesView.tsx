import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RichEditorSurface } from "@/components/editor/RichEditorSurface";
import { EMPTY_RICH_DOC, ensureSafeRichDoc } from "@/features/knowledge/lib/noteContent";

type Note = {
  id: string;
  title: string;
  content: string;
};

const KEYBOARD_OPEN_THRESHOLD = 80;
const KEYBOARD_TOOLBAR_GAP = 6;
const CLOSED_TOOLBAR_BOTTOM = "calc(4.75rem + env(safe-area-inset-bottom))";
const MAX_TITLE_LENGTH = 45;
const MAX_TITLE_LINES = 4;
const TITLE_LINE_HEIGHT_FALLBACK = 40;

const NotesView = ({ projectId }: { projectId: string }) => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contentDoc, setContentDoc] = useState<JSONContent>(EMPTY_RICH_DOC);
  const [keyboardState, setKeyboardState] = useState({ inset: 0, open: false });
  const titleTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const titleDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContentRef = useRef(JSON.stringify(EMPTY_RICH_DOC));
  const limitedTitle = title.slice(0, MAX_TITLE_LENGTH);

  const resizeTitleTextarea = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    const styles = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(styles.lineHeight) || TITLE_LINE_HEIGHT_FALLBACK;
    const paddingTop = Number.parseFloat(styles.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(styles.paddingBottom) || 0;
    const maxHeight = lineHeight * MAX_TITLE_LINES + paddingTop + paddingBottom;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = "hidden";
  };

  // Load or create the note for this project
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (authLoading) return;
      if (!userId || !projectId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const { data: existing, error: selectError } = await supabase
          .from("notes")
          .select("*")
          .eq("user_id", userId)
          .eq("project_id", projectId)
          .is("deleted_at", null)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (selectError) throw selectError;

        let n = existing;
        if (!n) {
          const { data: created, error: insertError } = await supabase
            .from("notes")
            .insert({ project_id: projectId, user_id: userId, title: "", content: "" })
            .select()
            .single();

          if (insertError) throw insertError;
          n = created;
        }

        if (!active) return;
        if (!n) {
          setError("Not oluşturulamadı.");
          return;
        }

        setNote(n);
        setTitle(n.title || "");
        const nextDoc = noteContentFromString(n.content);
        lastSavedContentRef.current = JSON.stringify(nextDoc);
        setContentDoc(nextDoc);
      } catch (err) {
        console.error("Not yüklenemedi:", err);
        if (active) setError("Not yüklenemedi. Lütfen tekrar deneyin.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [authLoading, projectId, userId]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateKeyboardState = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardState({
        inset: Math.round(inset),
        open: inset > KEYBOARD_OPEN_THRESHOLD,
      });
    };

    updateKeyboardState();
    viewport.addEventListener("resize", updateKeyboardState);
    viewport.addEventListener("scroll", updateKeyboardState);
    window.addEventListener("resize", updateKeyboardState);

    return () => {
      viewport.removeEventListener("resize", updateKeyboardState);
      viewport.removeEventListener("scroll", updateKeyboardState);
      window.removeEventListener("resize", updateKeyboardState);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (contentDebounce.current) clearTimeout(contentDebounce.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (titleDebounce.current) clearTimeout(titleDebounce.current);
    };
  }, []);

  useLayoutEffect(() => {
    resizeTitleTextarea(titleTextareaRef.current);
  }, [limitedTitle]);

  const handleTitleChange = (value: string) => {
    const nextTitle = value.slice(0, MAX_TITLE_LENGTH);
    setTitle(nextTitle);
    if (!note || !userId) return;
    if (titleDebounce.current) clearTimeout(titleDebounce.current);
    titleDebounce.current = setTimeout(async () => {
      setSaving(true);
      try {
        const { error: updateError } = await supabase
          .from("notes")
          .update({ title: nextTitle })
          .eq("id", note.id)
          .eq("user_id", userId);

        if (updateError) throw updateError;
      } catch (err) {
        console.error("Not başlığı kaydedilemedi:", err);
        setError("Not başlığı kaydedilemedi. Lütfen tekrar deneyin.");
      } finally {
        setSaving(false);
      }
    }, 600);
  };

  const handleContentChange = (doc: JSONContent) => {
    const safeDoc = ensureSafeRichDoc(doc);
    const nextJson = JSON.stringify(safeDoc);
    setContentDoc(safeDoc);

    if (!note || !userId || nextJson === lastSavedContentRef.current) return;

    if (contentDebounce.current) clearTimeout(contentDebounce.current);
    contentDebounce.current = setTimeout(async () => {
      setSaving(true);
      try {
        const { error: updateError } = await supabase
          .from("notes")
          .update({ content: nextJson })
          .eq("id", note.id)
          .eq("user_id", userId);

        if (updateError) throw updateError;
        lastSavedContentRef.current = nextJson;
      } catch (err) {
        console.error("Not içeriği kaydedilemedi:", err);
        setError("Not kaydedilemedi. Lütfen tekrar deneyin.");
      } finally {
        setSaving(false);
      }
    }, 600);
  };

  if (loading) return <div className="text-center text-muted-foreground text-sm py-12">Yükleniyor...</div>;
  if (error) return <div className="text-center text-destructive text-sm py-12">{error}</div>;

  const mobileToolbarBottom = keyboardState.open
    ? `calc(${keyboardState.inset}px + ${KEYBOARD_TOOLBAR_GAP}px)`
    : CLOSED_TOOLBAR_BOTTOM;

  return (
    <div className="max-w-3xl mx-auto">
      <textarea
        ref={titleTextareaRef}
        value={limitedTitle}
        onChange={(e) => {
          handleTitleChange(e.target.value);
          resizeTitleTextarea(e.currentTarget);
        }}
        placeholder="Başlıksız"
        maxLength={MAX_TITLE_LENGTH}
        rows={1}
        className="mb-2 w-full max-w-full resize-none overflow-hidden break-words bg-transparent p-0 text-3xl font-light leading-tight tracking-wide outline-none placeholder:text-muted-foreground/30 focus-visible:ring-0"
        style={{
          fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
          overflowY: "hidden",
        }}
      />
      <RichEditorSurface
        value={contentDoc}
        onChange={handleContentChange}
        placeholder="Notunu yaz..."
        resetKey={note?.id || projectId}
        className="min-h-[60vh]"
        contentClassName="pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-0"
        mobileToolbarBottom
        mobileToolbarStyle={{ bottom: mobileToolbarBottom }}
      />
      <div className="text-[10px] text-muted-foreground mt-6 tracking-wide">
        {saving ? "Kaydediliyor..." : "Kaydedildi"}
      </div>
    </div>
  );
};

function noteContentFromString(content: string | null | undefined): JSONContent {
  if (!content) return EMPTY_RICH_DOC;

  try {
    const parsed: unknown = JSON.parse(content);
    if (isRecord(parsed) && parsed.type === "doc") {
      return ensureSafeRichDoc(parsed as JSONContent);
    }
  } catch {
    // Legacy project notes may be plain text; keep them readable in the rich editor.
  }

  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: content ? [{ type: "text", text: content }] : undefined,
      },
    ],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export default NotesView;
