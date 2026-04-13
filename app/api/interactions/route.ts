import { GoogleGenAI } from "@google/genai";

// Es wird empfohlen, die API Route Edge-ready zu machen, sofern @google/genai das Edge Runtime unterstützt. 
// Da das SDK sehr neu ist, bleiben wir vorerst bei der Standard-Node-Runtime.

export async function POST(req: Request) {
  try {
    const { input, previous_interaction_id } = await req.json();

    if (!input) {
      return new Response(JSON.stringify({ error: "Missing input" }), { status: 400 });
    }

    // Instanziierung: Verwendet automatisch proces.env.GEMINI_API_KEY
    const client = new GoogleGenAI();

    // Wir rufen die Interaction API auf
    const stream = await client.interactions.create({
      model: "gemini-3-flash-preview",
      input,
      previous_interaction_id: previous_interaction_id || undefined,
      stream: true,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            // Delta / Stream-Updates verarbeiten
            if (chunk.event_type === "content.delta") {
              if (chunk.delta?.type === "text" && "text" in chunk.delta) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "text", content: chunk.delta.text })}\n\n`)
                );
              }
            } 
            // Am Ende der Interaktion: Die neue interactionId sichern
            else if (chunk.event_type === "interaction.complete") {
              const interactionId = chunk.interaction?.id;
              if (interactionId) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "complete", interactionId })}\n\n`)
                );
              } else {
                 // Fallback
                 controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "complete" })}\n\n`));
              }
              controller.close();
              return;
            }
          }
          // Fallback Schließung
          controller.close();
        } catch (error) {
           console.error("Stream error:", error);
           controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("API error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), { status: 500 });
  }
}
