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
  file: Blob,
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

function warteAuf(video: HTMLVideoElement, ereignis: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const fertig = () => { aufraeumen(); resolve(); };
    const fehler = () => { aufraeumen(); reject(new Error("Das Video konnte nicht gelesen werden.")); };
    const aufraeumen = () => {
      video.removeEventListener(ereignis, fertig);
      video.removeEventListener("error", fehler);
    };
    video.addEventListener(ereignis, fertig, { once: true });
    video.addEventListener("error", fehler, { once: true });
  });
}

/**
 * Letztes Bild eines Videos als Upload-Bild, für „Letztes Bild als Startframe“.
 * Das Video wird als Ganzes geholt (wenige MB) und aus dem Speicher des
 * Browsers gelesen: So sind die Pixel lesbar, und ein ohne CORS
 * zwischengespeichertes Video stört nicht. Voraussetzung ist die CORS-Regel
 * am R2-Bucket (ADR 0003, Nachtrag 06.11.2026).
 */
export async function letztesBildAusVideo(url: string): Promise<UploadImage> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    throw new Error(
      "Der Speicher gibt das Video nicht für den Browser frei. Am R2-Bucket fehlt die CORS-Regel, bitte Rico Bescheid geben."
    );
  }
  if (!res.ok) {
    throw new Error(`Das Video konnte nicht geladen werden (${res.status}). Lade die Seite neu und versuche es noch einmal.`);
  }
  const objectUrl = URL.createObjectURL(await res.blob());
  const video = document.createElement("video");
  try {
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    const geladen = warteAuf(video, "loadeddata");
    video.src = objectUrl;
    await geladen;
    // Die Tonspur ist oft etwas länger als das Bild. Knapp vor dem Ende steht
    // das letzte Bild.
    const gesprungen = warteAuf(video, "seeked");
    video.currentTime = Math.max(0, video.duration - 0.05);
    await gesprungen;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.92));
    if (!blob || !canvas.width) throw new Error("Aus dem Video ließ sich kein Bild lesen.");
    return { source: "upload", data: await alsBase64(blob), mediaType: "image/jpeg" };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
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
