export const dynamic = "force-dynamic";

export async function GET() {
  const raw = process.env.DEFAULT_CREDITS;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  const defaultCredits = Number.isFinite(parsed) && parsed > 0 ? parsed : 100;

  return new Response(JSON.stringify({ defaultCredits }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
