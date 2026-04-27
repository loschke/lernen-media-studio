import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? "/app" : "/api/auth/login";
  const ctaLabel = user ? "Zum Studio" : "Anmelden";

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="px-4 sm:px-8 md:px-12 h-14 flex items-center justify-between border-b border-border/40">
        <span className="font-serif text-lg md:text-xl text-foreground leading-none">
          lernen<span className="italic" style={{ color: "#0F766E" }}>.diy</span>
          <span className="mx-2 text-border">/</span>
          <span className="text-muted-foreground tracking-wide text-base">Studio</span>
        </span>
        <a
          href={ctaHref}
          className="text-sm font-medium px-4 py-2 rounded-md text-white transition-colors"
          style={{ backgroundColor: "#0F766E" }}
        >
          {ctaLabel}
        </a>
      </header>

      <section className="flex-1 flex items-center justify-center px-4 sm:px-8 py-16">
        <div className="max-w-2xl w-full text-center space-y-8">
          <p className="font-serif italic text-base text-muted-foreground">
            Workshop-Werkzeug für lernen.diy
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight">
            Bilder, Videos und Edits
            <br />
            mit Gemini im Browser.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Generieren, bearbeiten, animieren. Für Teilnehmer freigeschalteter
            lernen.diy-Workshops. Zugang nach Anmeldung und Freischaltung
            durch Rico.
          </p>
          <div className="pt-4">
            <a
              href={ctaHref}
              className="inline-block text-base font-semibold px-6 py-3 rounded-md text-white transition-colors"
              style={{ backgroundColor: "#0F766E" }}
            >
              {ctaLabel}
            </a>
          </div>
        </div>
      </section>

      <footer className="px-4 sm:px-8 md:px-12 py-6 border-t border-border/40 text-xs text-muted-foreground flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <a
          href="https://lernen.diy"
          target="_blank"
          rel="noopener noreferrer"
          className="font-serif hover:text-foreground transition-colors"
        >
          lernen<span className="italic" style={{ color: "#0F766E" }}>.diy</span>
        </a>
        <a
          href="https://unlearn.how"
          target="_blank"
          rel="noopener noreferrer"
          className="font-serif hover:text-foreground transition-colors"
        >
          <span className="italic">unlearn</span>
          <span style={{ color: "#a855f7" }}>.how</span>
        </a>
        <a
          href="https://loschke.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors font-medium"
        >
          loschke<span style={{ color: "#FC2D01" }}>.ai</span>
        </a>
      </footer>
    </main>
  );
}
