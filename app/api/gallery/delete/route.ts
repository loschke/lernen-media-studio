import { getSessionId } from "@/lib/session";
import { deleteImage, r2Configured } from "@/lib/r2";

export async function POST(req: Request) {
  try {
    if (!r2Configured) {
      return new Response(
        JSON.stringify({ error: "Storage nicht konfiguriert." }),
        { status: 500 }
      );
    }

    const sessionId = await getSessionId();
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "Keine Session" }), { status: 401 });
    }

    const { id } = await req.json();
    if (!id || typeof id !== "string") {
      return new Response(JSON.stringify({ error: "id required" }), { status: 400 });
    }

    await deleteImage(sessionId, id);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    console.error("Gallery delete error:", error);
    return new Response(
      JSON.stringify({ error: "Bild konnte nicht gelöscht werden", details: error.message }),
      { status: 500 }
    );
  }
}
