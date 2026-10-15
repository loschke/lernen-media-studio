// Bilder im Browser für den Upload vorbereiten (ADR 0002, Prüfstand S4).
//
// Vercel nimmt höchstens 4,5 MB je Anfrage an und antwortet darüber mit dem
// Text „Request Entity Too Large“ statt JSON. Die Routen bekommen Uploads als
// Base64 im JSON-Körper, also das 1,33-fache der Dateigröße. Darum werden
// Fotos hier auf eine Zielgröße verkleinert, bevor sie in den Zustand wandern.

/** Längste Kante nach dem Verkleinern. Die Modelle bekommen davon nichts mit. */
export const MAX_IMAGE_EDGE = 2048;

/** Gesamtbudget je Anfrage in Bytes vor Base64, mit Luft zu Vercels 4,5 MB. */
export const REQUEST_IMAGE_BUDGET = 3 * 1024 * 1024;

export interface UploadImage {
  source: "upload";
  data: string; // Base64 ohne data:-Präfix
  mediaType: string;
}

function alsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Datei in ein Upload-Bild verwandeln, höchstens `maxBytes` groß. Kleine
 * Bilder bleiben unverändert (Format und Bytes). Große werden auf
 * `MAX_IMAGE_EDGE` Kante gezeichnet und als JPEG mit sinkender Qualität
 * ausgegeben; reicht das nicht, wird die Kante halbiert.
 */
export async function bildFuerUpload(
  file: File,
  maxBytes: number = REQUEST_IMAGE_BUDGET
): Promise<UploadImage> {
  const bitmap = await createImageBitmap(file);
  try {
    const kante = Math.max(bitmap.width, bitmap.height);
    if (kante <= MAX_IMAGE_EDGE && file.size <= maxBytes) {
      return { source: "upload", data: await alsBase64(file), mediaType: file.type };
    }
    let ziel = Math.min(kante, MAX_IMAGE_EDGE);
    while (ziel >= 512) {
      const scale = ziel / kante;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (let qualitaet = 0.9; qualitaet >= 0.5; qualitaet -= 0.1) {
        const blob = await new Promise<Blob | null>((r) =>
          canvas.toBlob(r, "image/jpeg", qualitaet)
        );
        if (blob && blob.size <= maxBytes) {
          return { source: "upload", data: await alsBase64(blob), mediaType: "image/jpeg" };
        }
      }
      ziel = Math.floor(ziel / 2);
    }
    throw new Error("Bild konnte nicht klein genug verkleinert werden.");
  } finally {
    bitmap.close();
  }
}

/** Antwort einer Route lesen, auch wenn Vercel Text statt JSON schickt (413). */
export async function antwortLesen(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (res.status === 413) {
      return {
        error:
          "Die Anfrage ist zu groß für den Server (höchstens 4,5 MB). Bitte kleinere oder weniger Bilder wählen.",
      };
    }
    return { error: `Unerwartete Antwort des Servers (${res.status}): ${text.slice(0, 120)}` };
  }
}
