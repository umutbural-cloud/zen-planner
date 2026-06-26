import { Component, ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; message?: string; isChunkLoadError: boolean };

const CHUNK_ERROR_PATTERNS = [
  /ChunkLoadError/i,
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /Loading chunk/i,
];

const isChunkLoadError = (error: Error) => {
  const name = error?.name ?? "";
  const message = error?.message ?? "";
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(name) || pattern.test(message));
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, isChunkLoadError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message, isChunkLoadError: isChunkLoadError(error) };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("[ErrorBoundary]", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: undefined, isChunkLoadError: false });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Hata</div>
          <h1 className="text-xl font-light tracking-wide">Bir şeyler ters gitti</h1>
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            {this.state.isChunkLoadError
              ? "Uygulama güncellendi. Devam etmek için sayfayı yenileyin."
              : "Beklenmeyen bir durum oluştu. Tarayıcı çevirisi açıksa kapatmayı deneyin, ardından sayfayı yenileyin."}
          </p>
          {this.state.message && (
            <p className="text-[11px] text-muted-foreground/70 font-mono break-words">
              {this.state.message}
            </p>
          )}
          <div className="flex gap-2 justify-center pt-2">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 text-xs tracking-[0.15em] uppercase border border-border/60 rounded-sm hover:bg-accent/40 transition-colors"
            >
              Tekrar Dene
            </button>
            <button
              onClick={this.handleReload}
              className="px-4 py-2 text-xs tracking-[0.15em] uppercase bg-foreground text-background rounded-sm hover:opacity-90 transition-opacity"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      </div>
    );
  }
}
