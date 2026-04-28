export const dynamic = "force-dynamic";

const REASON_LABELS: Record<string, string> = {
  invalid_state: "Sicherheits-Check fehlgeschlagen (state mismatch).",
  invalid_id_token: "Identitäts-Token konnte nicht verifiziert werden.",
  token_exchange_failed: "Token-Austausch mit dem Auth-Server fehlgeschlagen.",
  missing_email_claim: "Auth-Server hat keine E-Mail-Adresse zurückgegeben.",
  missing_code_or_state: "Unvollständige Auth-Antwort.",
  no_membership: "Du bist für diesen Bereich noch nicht freigeschaltet. Bitte wende dich an deinen Administrator.",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&#39;";
    }
  });
}

export function GET(req: Request) {
  const url = new URL(req.url);
  const reason = url.searchParams.get("reason") ?? "unknown";
  const detail = url.searchParams.get("detail") ?? "";

  const label = REASON_LABELS[reason] ?? `Login fehlgeschlagen (${reason}).`;

  const html = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Login fehlgeschlagen — Media Studio</title>
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #0f1514;
        color: #e9efed;
        font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
        padding: 1rem;
      }
      main {
        max-width: 28rem;
        width: 100%;
        padding: 1.75rem 2rem;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 0.75rem;
        background: #1a2220;
      }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem 0; font-weight: 700; }
      p { margin: 0 0 1rem 0; line-height: 1.5; color: #9fbab6; }
      pre {
        font-size: 0.75rem;
        background: rgba(255,255,255,0.04);
        padding: 0.5rem 0.75rem;
        border-radius: 0.375rem;
        overflow-x: auto;
        color: #c9d6d3;
      }
      a {
        display: inline-block;
        margin-top: 0.5rem;
        padding: 0.5rem 1rem;
        background: #0F766E;
        color: white;
        text-decoration: none;
        border-radius: 0.375rem;
        font-weight: 500;
      }
      a:hover { background: #0d655e; }
    </style>
  </head>
  <body>
    <main>
      <h1>Login fehlgeschlagen</h1>
      <p>${escapeHtml(label)}</p>
      ${detail ? `<pre>${escapeHtml(detail)}</pre>` : ""}
      <a href="/api/auth/login">Erneut anmelden</a>
    </main>
  </body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
