import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

/**
 * İnziva — local-only, ephemeral writing space.
 * Hiçbir veri sunucuya gönderilmez veya kalıcı saklanmaz.
 * Kullanıcı yazmayı bıraktıktan 5 saniye sonra paragraflar yumuşakça solup kaybolur.
 */

const IDLE_MS = 3_000;
const FADE_DURATION_MS = 3_000;

type Line = {
  id: number;
  text: string;
  fading: boolean;
};

const formatMMSS = (totalSec: number) => {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const InzivaView = () => {
  const [lines, setLines] = useState<Line[]>([{ id: 0, text: "", fading: false }]);
  const [activeId, setActiveId] = useState(0);
  const [nextId, setNextId] = useState(1);
  const [lastTyped, setLastTyped] = useState(Date.now());
  const [durationMin, setDurationMin] = useState(25);
  const [remainingSec, setRemainingSec] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fadeTimers = useRef<Map<number, number>>(new Map());
  const countdownTimer = useRef<number | null>(null);
  const isInitialFocus = useRef(true);

  /* ─── Countdown timer ─── */
  useEffect(() => {
    if (!timerRunning) {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      return;
    }
    countdownTimer.current = window.setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    };
  }, [timerRunning]);

  /* ─── Idle detection → fade out committed lines ─── */
  useEffect(() => {
    const id = window.setInterval(() => {
      if (Date.now() - lastTyped > IDLE_MS) {
        setLines((prev) =>
          prev.map((l) => (l.id === activeId ? l : { ...l, fading: true }))
        );
      }
    }, 300);
    return () => clearInterval(id);
  }, [lastTyped, activeId]);

  /* ─── Remove lines after fade-out completes ─── */
  useEffect(() => {
    lines.forEach((l) => {
      if (l.fading && !fadeTimers.current.has(l.id)) {
        const tid = window.setTimeout(() => {
          setLines((prev) => prev.filter((x) => x.id !== l.id));
          fadeTimers.current.delete(l.id);
        }, FADE_DURATION_MS);
        fadeTimers.current.set(l.id, tid);
      }
    });
  }, [lines]);

  useEffect(() => {
    const timers = fadeTimers.current;
    return () => {
      timers.forEach((tid) => clearTimeout(tid));
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    };
  }, []);

  const getActiveEl = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return null;
    return editor.querySelector(`[data-line-id="${activeId}"]`) as HTMLElement | null;
  }, [activeId]);

  /* Auto-focus the active line when it changes */
  useEffect(() => {
    const el = getActiveEl();
    if (!el) return;
    el.focus();
    // Place cursor at end
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [activeId, getActiveEl]);

  /* Focus the first line on mount */
  useEffect(() => {
    if (isInitialFocus.current) {
      isInitialFocus.current = false;
      const el = getActiveEl();
      el?.focus();
    }
  }, [getActiveEl]);

  const cancelFadeFor = useCallback((id: number) => {
    const tid = fadeTimers.current.get(id);
    if (tid) {
      clearTimeout(tid);
      fadeTimers.current.delete(id);
    }
    setLines((prev) => prev.map((l) => (l.id === id && l.fading ? { ...l, fading: false } : l)));
  }, []);

  const handleInput = () => {
    setLastTyped(Date.now());
    const active = getActiveEl();
    if (!active) return;
    const text = active.innerText || "";
    // Only mutate the active line. Other lines must keep their current fading
    // state so that already-fading paragraphs complete their disappearance
    // instead of snapping back to full opacity when the user types again.
    setLines((prev) =>
      prev.map((l) => (l.id === activeId ? { ...l, text, fading: false } : l))
    );
  };


  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    setLastTyped(Date.now());
    const active = getActiveEl();
    if (!active) return;

    if (e.key === "Enter") {
      e.preventDefault();
      const text = active.innerText || "";
      if (!text.trim()) return;

      const newId = nextId;
      setNextId((n) => n + 1);
      setLines((prev) => [{ id: newId, text: "", fading: false }, ...prev]);
      setActiveId(newId);
    } else if (e.key === "Backspace") {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (range.startOffset === 0 && range.endOffset === 0) {
        const currentIdx = lines.findIndex((l) => l.id === activeId);
        if (currentIdx < lines.length - 1) {
          e.preventDefault();
          const nextLineId = lines[currentIdx + 1].id;
          setLines((prev) => prev.filter((l) => l.id !== activeId));
          setActiveId(nextLineId);
        }
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    handleInput();
  };

  const toggleTimer = () => {
    if (!timerRunning && remainingSec === 0) {
      setRemainingSec(durationMin * 60);
    }
    setTimerRunning((r) => !r);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setRemainingSec(durationMin * 60);
  };

  return (
    <div className="max-w-3xl mx-auto w-full space-y-4">
      {/* Header with title + timer */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg tracking-wide font-light">İnziva</h2>
          <p className="text-[11px] text-muted-foreground/70 font-light leading-relaxed mt-1">
            Buraya yazdıklarınız hiçbir yere kaydedilmez. Yazmayı bıraktığınızda her şey sessizce kaybolur.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {timerRunning || remainingSec < durationMin * 60 ? (
            <span className="text-xs font-light tabular-nums text-muted-foreground tracking-wide">
              {formatMMSS(remainingSec)}
            </span>
          ) : (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={180}
                value={durationMin}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(180, parseInt(e.target.value) || 1));
                  setDurationMin(v);
                  setRemainingSec(v * 60);
                }}
                className="w-10 text-center bg-transparent border border-border/60 rounded-sm text-[11px] py-0.5 font-light focus:outline-none focus:border-foreground/30 tabular-nums"
              />
              <span className="text-[10px] text-muted-foreground/60 font-light">dk</span>
            </div>
          )}

          <button
            onClick={toggleTimer}
            className="flex items-center gap-1 px-2 py-1 rounded-sm border border-border/60 hover:bg-accent/40 text-[11px] transition-colors"
            title={timerRunning ? "Durdur" : "Başlat"}
          >
            {timerRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </button>

          {(timerRunning || remainingSec < durationMin * 60) && (
            <button
              onClick={resetTimer}
              className="flex items-center px-1.5 py-1 rounded-sm border border-border/60 hover:bg-accent/40 text-[11px] transition-colors"
              title="Sıfırla"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        className="w-full min-h-[60vh] bg-transparent outline-none"
        onInput={handleInput}
      >
        {lines.map((line) => (
          <div
            key={line.id}
            data-line-id={line.id}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            onFocus={() => {
              setActiveId(line.id);
              setLastTyped(Date.now());
              cancelFadeFor(line.id);
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            className={`outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/40 mb-4 last:mb-0 text-base font-light leading-relaxed tracking-wide transition-opacity ease-out ${
              line.fading ? "opacity-0 duration-[3000ms]/opacity" : "opacity-100 duration-300"
            }`}
            data-placeholder={line.id === activeId ? "Sadece yaz..." : undefined}
          />
        ))}
      </div>

      <div className="text-[10px] text-muted-foreground/50 font-light tracking-widest text-center pt-4">
        Kayıt yok
      </div>
    </div>
  );
};

export default InzivaView;
