"use client";

interface AppHeaderProps {
  generationsLeft: number;
}

export function AppHeader({ generationsLeft }: AppHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border px-6 py-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          Bildwerkstatt<span className="text-primary">.</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5 font-serif italic">
          Workshop-Tool für KI-Bildgenerierung
        </p>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Verbleibend:</span>
        <span
          className={`text-lg font-bold ${
            generationsLeft < 5 ? "text-destructive" : "text-primary"
          }`}
        >
          {generationsLeft}
        </span>
      </div>
    </div>
  );
}
