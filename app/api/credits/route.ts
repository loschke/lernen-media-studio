import { getCurrentUser } from "@/lib/session";
import { getCredits } from "@/lib/credits";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const credits = await getCredits(user.sub);
  return new Response(JSON.stringify({ credits }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
