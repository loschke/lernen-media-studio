import { getSessionId } from "@/lib/session";
import { listGallery, r2Configured } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!r2Configured) {
      return new Response(
        JSON.stringify({ error: "Storage nicht konfiguriert." }),
        { status: 500 }
      );
    }

    const sessionId = await getSessionId();
    if (!sessionId) {
      return new Response(JSON.stringify({ images: [] }), { status: 200 });
    }

    const images = await listGallery(sessionId);
    return new Response(JSON.stringify({ images }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Gallery list error:", error);
    return new Response(
      JSON.stringify({ error: "Galerie konnte nicht geladen werden", details: error.message }),
      { status: 500 }
    );
  }
}
