// Länge eines MP4 aus dem Dateikopf lesen (Box `moov` → `mvhd`), ohne ffmpeg.
// Gebraucht für „Video fortsetzen“ (ADR 0003, Nachtrag 06.11.2026): Omni gibt
// nach einer Fortsetzung das ganze Video zurück, die Gesamtlänge steht aber
// nicht in der Antwort. Die Grenze von 30 s prüft das Studio an dieser Zahl.

/** Kinder eines Bereichs durchgehen: liefert Typ, Start und Ende des Inhalts. */
function* boxes(
  buf: Buffer,
  von: number,
  bis: number
): Generator<{ typ: string; inhalt: number; ende: number }> {
  let pos = von;
  while (pos + 8 <= bis) {
    let groesse = buf.readUInt32BE(pos);
    const typ = buf.toString("latin1", pos + 4, pos + 8);
    let kopf = 8;
    if (groesse === 1) {
      if (pos + 16 > bis) return;
      groesse = Number(buf.readBigUInt64BE(pos + 8));
      kopf = 16;
    } else if (groesse === 0) {
      groesse = bis - pos;
    }
    if (groesse < kopf || pos + groesse > bis) return;
    yield { typ, inhalt: pos + kopf, ende: pos + groesse };
    pos += groesse;
  }
}

/** Länge in Sekunden, oder `null`, wenn die Datei kein lesbares MP4 ist. */
export function mp4DurationSeconds(buf: Buffer): number | null {
  try {
    for (const moov of boxes(buf, 0, buf.length)) {
      if (moov.typ !== "moov") continue;
      for (const mvhd of boxes(buf, moov.inhalt, moov.ende)) {
        if (mvhd.typ !== "mvhd") continue;
        const version = buf.readUInt8(mvhd.inhalt);
        // Version 0: je 4 Byte Erstellt, Geändert, Zeitbasis, Dauer. Version 1: 8, 8, 4, 8.
        const p = mvhd.inhalt + 4 + (version === 1 ? 16 : 8);
        const zeitbasis = buf.readUInt32BE(p);
        const dauer =
          version === 1 ? Number(buf.readBigUInt64BE(p + 4)) : buf.readUInt32BE(p + 4);
        if (!zeitbasis) return null;
        const sekunden = dauer / zeitbasis;
        return Number.isFinite(sekunden) && sekunden > 0 ? sekunden : null;
      }
    }
  } catch {
    // abgeschnittene oder fremde Datei
  }
  return null;
}
